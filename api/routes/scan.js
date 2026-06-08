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
        } while (pageToken);
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

module.exports = router;
