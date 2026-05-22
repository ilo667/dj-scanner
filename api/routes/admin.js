const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const pool = require('../../utils/database');

const router = Router();

router.get('/artists', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { genre_id } = req.query;

        if (!genre_id) {
            return res.status(400).json({ error: 'genre_id is required' });
        }

        const id = parseInt(genre_id, 10);
        const genreCheck = await pool.query('SELECT name FROM genres WHERE id = $1', [id]);
        const isAllGenres = genreCheck.rows[0]?.name === 'All Genres';

        const result = isAllGenres
            ? await pool.query('SELECT id, name FROM artists ORDER BY name ASC')
            : await pool.query('SELECT id, name FROM artists WHERE genre_id = $1 ORDER BY name ASC', [id]);

        return res.json({ artists: result.rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/artists', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Artist name is required' });
        }

        const result = await pool.query('INSERT INTO artists (name) VALUES ($1) RETURNING id, name', [name.trim()]);

        if (!result.rows[0]) throw new Error('Insert failed to return artist');

        return res.status(201).json({ success: true, artist: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Artist already exists' });
        }
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/artists/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid artist ID' });
        }

        const result = await pool.query('DELETE FROM artists WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
