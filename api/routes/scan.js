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
            text = decodeBuffer(req.file.buffer);
        } else {
            text = (req.body?.trackList || '').toString();
        }

        const artists = parseArtists(text);

        return res.json({
            success: true,
            artists
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

module.exports = router;
