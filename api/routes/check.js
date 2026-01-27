const { Router } = require('express');

const router = Router();

router.post('/', (req, res) => {
    try {
        const { trackList } = req.body;

        const artists = [...new Set(parseArtists(trackList))];

        return res.json({
            success: true,
            artists
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

function parseArtists(tracklist) {
    return tracklist
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            // remove "01. ", "1. ", "01) " etc
            line = line.replace(/^\d+[\.\)]\s*/, '');

            // get all before " - "
            const artistPart = line.split(' - ')[0];

            // split by & , feat, ft, comma
            return artistPart
                .split(/\s*(?:&|,|feat\.?|ft\.?)\s*/i)
                .map(a => a.trim());
        })
        .flat(); // merge in one array
}

module.exports = router;
