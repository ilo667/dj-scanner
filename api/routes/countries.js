const { Router } = require('express');
const pool = require('../../utils/database');

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM countries ORDER BY name ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
