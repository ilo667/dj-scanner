const { Router } = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { parseArtists } = require('../../utils/parser');
const { checkArtists } = require('../../utils/artists-check');

const router = Router();

const scanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many scan requests. Please try again in 15 minutes.' }
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

router.post('/', scanLimiter, upload.single('file'), async (req, res) => {
    try {
        let text = '';

        if (req.file) {
            text = decodeBuffer(req.file.buffer);
        } else {
            text = (req.body?.trackList || '').toString();
        }

        const artists = parseArtists(text);
        const { found, artistCountries, artistBlacklisted } = await checkArtists(artists);

        return res.json({
            success: true,
            artists: artists.map(name => ({
                name,
                highlight: found.includes(name),
                blacklisted: artistBlacklisted[name.toLowerCase()] ?? false,
                countries: artistCountries[name.toLowerCase()] || []
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to parse input' });
    }
});

function decodeBuffer(buffer) {
    // UTF-16 LE BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return buffer.toString('utf16le');
    }

    // UTF-16 BE BOM
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return buffer.toString('utf16le');
    }

    // default → UTF-8
    return buffer.toString('utf8');
}

router.post('/youtube', scanLimiter, async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'YouTube playlist URL is required' });
    }

    let playlistId;

    try {
        playlistId = new URL(url).searchParams.get('list');
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!playlistId) {
        return res.status(400).json({ error: 'Could not find playlist ID in URL' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const artistSet = new Set();
    let pageToken = '';
    let pageCount = 0;
    const MAX_PAGES = 30;

    try {
        do {
            const apiUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');

            apiUrl.searchParams.set('part', 'snippet');
            apiUrl.searchParams.set('playlistId', playlistId);
            apiUrl.searchParams.set('maxResults', '50');
            apiUrl.searchParams.set('key', apiKey);

            if (pageToken) apiUrl.searchParams.set('pageToken', pageToken);

            const response = await fetch(apiUrl.toString());
            const data = await response.json();

            if (!response.ok) {
                return res.status(500).json({ error: data.error?.message || 'YouTube API error' });
            }

            for (const item of data.items || []) {
                const title = item.snippet?.title;
                const channelTitle = item.snippet?.videoOwnerChannelTitle;

                if (!title || title === 'Deleted video' || title === 'Private video') continue;

                // extract from channel name: "Artist Name - Topic" → "Artist Name"
                if (channelTitle) {
                    const artist = channelTitle.replace(/\s*-\s*Topic$/i, '').trim();

                    if (artist) artistSet.add(artist);
                }

                // extract additional artists from title (feat, remix, etc.)
                parseArtists(title).forEach(a => artistSet.add(a));
            }

            pageToken = data.nextPageToken || '';
            pageCount++;
        } while (pageToken && pageCount < MAX_PAGES);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch YouTube playlist' });
    }

    const artistList = [...artistSet];
    const { found, artistCountries, artistBlacklisted } = await checkArtists(artistList);

    return res.json({
        success: true,
        artists: artistList.map(name => ({
            name,
            highlight: found.includes(name),
            blacklisted: artistBlacklisted[name.toLowerCase()] ?? false,
            countries: artistCountries[name.toLowerCase()] || []
        }))
    });
});

let _appleMusicToken = null;
let _appleMusicTokenExpiry = 0;

function decodeJwtExpiry(token) {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        return payload.exp || 0;
    } catch {
        return 0;
    }
}

function extractJwt(text) {
    const matches = [...text.matchAll(/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g)];

    for (const match of matches) {
        try {
            const parts = match[0].split('.');
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            if (header.alg === 'ES256' && payload.iss && payload.exp && payload.exp > Date.now() / 1000) {
                return match[0];
            }
        } catch {}
    }
    return null;
}

async function getAppleMusicToken() {
    if (_appleMusicToken && Date.now() < _appleMusicTokenExpiry) {
        return _appleMusicToken;
    }

    const res = await fetch('https://music.apple.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = await res.text();
    const inlineToken = extractJwt(html);

    if (inlineToken) {
        _appleMusicToken = inlineToken;
        _appleMusicTokenExpiry = decodeJwtExpiry(inlineToken) * 1000 - 60000;
        return _appleMusicToken;
    }

    const scriptUrls = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => {
        const src = m[1];
        if (src.startsWith('http')) return src;
        if (src.startsWith('//')) return `https:${src}`;
        return `https://music.apple.com${src}`;
    });

    for (const url of scriptUrls) {
        try {
            const jsRes = await fetch(url);
            const js = await jsRes.text();
            const token = extractJwt(js);
            if (token) {
                _appleMusicToken = token;
                _appleMusicTokenExpiry = decodeJwtExpiry(token) * 1000 - 60000;
                return _appleMusicToken;
            }
        } catch {}
    }

    throw new Error('Could not extract Apple Music token');
}

router.post('/apple-music', scanLimiter, async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Apple Music playlist URL is required' });
    }

    let storefront, playlistId;

    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);

        storefront = parts[0];
        playlistId = parts[parts.length - 1];
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!storefront || !playlistId || !playlistId.startsWith('pl.')) {
        return res.status(400).json({ error: 'Could not find playlist ID in URL' });
    }

    let token;

    try {
        token = await getAppleMusicToken();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Could not connect to Apple Music' });
    }

    const artistSet = new Set();
    let offset = 0;
    const LIMIT = 100;
    let hasMore = true;

    try {
        while (hasMore) {
            const apiUrl = `https://api.music.apple.com/v1/catalog/${storefront}/playlists/${playlistId}/tracks?limit=${LIMIT}&offset=${offset}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Origin': 'https://music.apple.com'
                }
            });

            if (response.status === 401) {
                _appleMusicToken = null;
                return res.status(500).json({ error: 'Apple Music token expired. Please retry.' });
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return res.status(500).json({ error: data.errors?.[0]?.detail || 'Apple Music API error' });
            }

            const data = await response.json();

            for (const track of data.data || []) {
                const artistName = track.attributes?.artistName;
                const trackName = track.attributes?.name;

                if (artistName) {
                    artistName
                        .split(/\s*[,&]\s*|\s+feat\.?\s+|\s+ft\.?\s+/i)
                        .map(a => a.trim())
                        .filter(Boolean)
                        .forEach(a => artistSet.add(a));
                }

                if (trackName) {
                    parseArtists(trackName).forEach(a => artistSet.add(a));
                }
            }

            hasMore = !!data.next;
            offset += LIMIT;
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch Apple Music playlist' });
    }

    const artistList = [...artistSet];
    const { found, artistCountries, artistBlacklisted } = await checkArtists(artistList);

    return res.json({
        success: true,
        artists: artistList.map(name => ({
            name,
            highlight: found.includes(name),
            blacklisted: artistBlacklisted[name.toLowerCase()] ?? false,
            countries: artistCountries[name.toLowerCase()] || []
        }))
    });
});

module.exports = router;
