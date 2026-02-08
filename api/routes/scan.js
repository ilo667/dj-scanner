const { Router } = require('express');
const multer = require('multer');
const { parseArtists } = require('../../utils/parser');

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

router.post('/', upload.single('file'), (req, res) => {
    try {
        let text = '';

        if (req.file) {
            text = req.file.buffer.toString('utf8');
        } else {
            text = (req.body?.trackList || '').toString();
            // const artists = [...new Set(parseArtists(trackList))];
        }

        const artists = parseArtists(text);//parseArtistsUnified

        return res.json({
            success: true,
            artists
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to parse input' });
    }
});

module.exports = router;
