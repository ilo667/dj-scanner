const { Router } = require('express');
const { checkArtists } = require('../../utils/artists-check');

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { artists } = req.body;

        if (!Array.isArray(artists)) {
            return res.status(400).json({ error: 'Array with artists is required' });
        }

        const result = await checkArtists(artists);

        return res.json({
            found: result.found,
            notFound: result.notFound
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
