const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const pool = require('../../utils/database');

const router = Router();

router.get('/artists', requireAuth, async (req, res) => {
    try {
        const { genre_id } = req.query;

        if (!genre_id) {
            return res.status(400).json({ error: 'genre_id is required' });
        }

        const id = parseInt(genre_id, 10);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid genre_id' });
        }

        const result = await pool.query(
            `SELECT a.id, a.name
             FROM artists a
             JOIN genres g ON g.id = $1
             WHERE (g.name = 'All Genres' OR a.genre_id = g.id) AND a.is_blacklisted = true
             ORDER BY a.name ASC`,
            [id]
        );

        return res.json({ artists: result.rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/artists', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, genre_id, country_ids = [] } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Artist name is required' });
        }

        const result = await pool.query(
            'INSERT INTO artists (name, genre_id, is_blacklisted) VALUES ($1, $2, true) RETURNING id, name, genre_id, is_blacklisted',
            [name.trim(), genre_id ?? null]
        );

        if (!result.rows[0]) throw new Error('Insert failed to return artist');

        const artist = result.rows[0];

        if (Array.isArray(country_ids) && country_ids.length > 0) {
            const values = country_ids.map((cid, i) => `($1, $${i + 2})`).join(', ');

            await pool.query(
                `INSERT INTO artist_countries (artist_id, country_id) VALUES ${values}`,
                [artist.id, ...country_ids]
            );
        }

        return res.status(201).json({ success: true, artist });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Artist already exists' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Invalid country ID' });
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
