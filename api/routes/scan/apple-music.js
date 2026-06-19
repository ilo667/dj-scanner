const { parseArtists, separateArtists } = require('../../../utils/parser');
const { checkArtists } = require('../../../utils/artists-check');
const { formatArtists } = require('../../../utils/format-artists');
const { getBlacklistedTracks } = require('../../../utils/blacklisted-tracks');

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
    const res = await fetch('https://music.apple.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(5000)
    });
    const html = await res.text();
    const inlineToken = extractJwt(html);

    if (inlineToken) return inlineToken;

    const scriptUrls = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => {
        const src = m[1];
        if (src.startsWith('http')) return src;
        if (src.startsWith('//')) return `https:${src}`;
        return `https://music.apple.com${src}`;
    });

    for (const url of scriptUrls) {
        try {
            const jsRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const js = await jsRes.text();
            const token = extractJwt(js);
            if (token) return token;
        } catch {}
    }

    throw new Error('Could not extract Apple Music token');
}

module.exports = async function handleAppleMusic(req, res) {
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
    const trackLines = [];
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
                },
                signal: AbortSignal.timeout(8000)
            });

            if (response.status === 401) {
                return res.status(500).json({ error: 'Could not connect to Apple Music. Please retry.' });
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
                    separateArtists(artistName).forEach(a => artistSet.add(a));
                }

                if (trackName) {
                    parseArtists(trackName).forEach(a => artistSet.add(a));
                    trackLines.push(artistName ? `${artistName} - ${trackName}` : trackName);
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
    const checkResult = await checkArtists(artistList);
    const formattedArtists = formatArtists(artistList, checkResult);
    const blacklisted = formattedArtists.filter(a => a.blacklisted).map(a => a.name);
    const blacklistedTracks = getBlacklistedTracks(trackLines, blacklisted);

    return res.json({ success: true, artists: formattedArtists, blacklistedTracks });
};
