const pool = require('./database');

async function getGenres() {
    const result = await pool.query('SELECT id, name FROM genres ORDER BY name');

    return result.rows;
}

async function createGenre(name) {
    const result = await pool.query(
        'INSERT INTO genres (name) VALUES ($1) RETURNING id, name',
        [name]
    );

    return result.rows[0];
}

async function deleteGenre(id) {
    const result = await pool.query('DELETE FROM genres WHERE id = $1 RETURNING id', [id]);

    return result.rowCount > 0;
}

module.exports = { getGenres, createGenre, deleteGenre };
