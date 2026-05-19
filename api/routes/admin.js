const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const pool = require('../../utils/database');

const router = Router();

router.get('/artists', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM artists ORDER BY name ASC');
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

        const existing = await pool.query(
            'SELECT name FROM artists WHERE LOWER(name) = $1',
            [name.trim().toLowerCase()]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Artist already exists' });
        }

        await pool.query('INSERT INTO artists (name) VALUES ($1)', [name.trim()]);

        return res.status(201).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/artists/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

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
