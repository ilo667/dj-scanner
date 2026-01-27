const { Router } = require('express');
const multer = require('multer');

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        const filename = req.file.originalname.toLowerCase();
        const text = req.file.buffer.toString('utf8');

        let artists;

        if (filename.endsWith('.cue')) {
            artists = parseCue(text);
        }

        return res.json({
            success: true,
            artists
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

function parseCue(cueText) {
    const lines = cueText.split(/\r?\n/);
    const artists = [];

    let inTrack = false;
    let waitingPerformer = false;

    const unquote = (s) => (s || '').trim().replace(/^"(.*)"$/, '$1');
    const splitArtistsFrom = (artistPart) =>
        artistPart
            .split(/\s*(?:&|,|feat\.?|ft\.?)\s*/i)
            .map(a => a.trim())
            .filter(Boolean);

    for (const raw of lines) {
        const line = raw.trim();

        // starts of new track
        if (/^TRACK\s+\d+/i.test(line)) {
            inTrack = true;
            waitingPerformer = false;
            continue;
        }

        // ignore all before first TRACK
        if (!inTrack) continue;

        // TITLE
        if (line.startsWith('TITLE')) {
            let title = unquote(line.replace(/^TITLE\s+/i, ''));

            // remove "01. "
            title = title.replace(/^\d+[\.\)]\s*/, '');

            // extract remix artist from "(NAME Remix)"
            const remixMatch = title.match(/\(([^()]+?)\s+Remix\)/i);

            if (remixMatch) {
                const remix = remixMatch[1].trim();

                if (remix) artists.push(remix);
            }

            // extract featured artist from "(feat. NAME)" or "(ft. NAME)"
            const featMatch = title.match(/\((?:feat\.?|ft\.?)\s+([^)]+)\)/i);

            if (featMatch) {
                const featArtist = featMatch[1].trim();

                if (featArtist) artists.push(featArtist);
            }

            if (title.includes(' - ')) {
                const artistPart = title.split(' - ')[0];
                artists.push(...splitArtistsFrom(artistPart));
                waitingPerformer = false;
            } else {
                // TITLE without " - " → waiting PERFORMER
                waitingPerformer = true;
            }

            continue;
        }

        // PERFORMER (only after TITLE without "-")
        if (waitingPerformer && line.startsWith('PERFORMER')) {
            const performer = unquote(line.replace(/^PERFORMER\s+/i, ''));
            artists.push(...splitArtistsFrom(performer));
            waitingPerformer = false;
        }
    }

    return [...new Set(artists)];
}

module.exports = router;
