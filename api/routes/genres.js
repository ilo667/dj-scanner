const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getGenres, createGenre, deleteGenre } = require('../../utils/genres');

const router = Router();

router.get('/', async (req, res) => {
    try {
        const genres = await getGenres();

        res.json(genres);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Genre name is required' });
        }

        const genre = await createGenre(name.trim());

        res.status(201).json(genre);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Genre already exists' });
        }

        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid genre id' });
        }

        const deleted = await deleteGenre(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Genre not found' });
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
