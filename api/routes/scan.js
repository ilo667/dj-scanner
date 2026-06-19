const { Router } = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { parseArtists } = require('../../utils/parser');
const { checkArtists } = require('../../utils/artists-check');
const { formatArtists } = require('../../utils/format-artists');
const { getBlacklistedTracks } = require('../../utils/blacklisted-tracks');
const handleYoutube = require('./scan/youtube');
const handleAppleMusic = require('./scan/apple-music');
const handleDeezer = require('./scan/deezer');
const handleSoundCloud = require('./scan/soundcloud');

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
        const checkResult = await checkArtists(artists);
        const formattedArtists = formatArtists(artists, checkResult);
        const blacklisted = formattedArtists.filter(a => a.blacklisted).map(a => a.name);
        const trackLines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const blacklistedTracks = getBlacklistedTracks(trackLines, blacklisted);

        return res.json({ success: true, artists: formattedArtists, blacklistedTracks });
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

router.post('/youtube', scanLimiter, handleYoutube);
router.post('/apple-music', scanLimiter, handleAppleMusic);
router.post('/deezer', scanLimiter, handleDeezer);
router.post('/soundcloud', scanLimiter, handleSoundCloud);

module.exports = router;
