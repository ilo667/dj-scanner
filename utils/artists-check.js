const pool = require('./database');

async function checkArtists(artistNames) {
    try {
        if (!artistNames || artistNames.length === 0) {
            return { found: [], notFound: [] };
        }

        const query = `
            SELECT name 
            FROM artists 
            WHERE name IN (${artistNames.map((_, i) => `$${i + 1}`).join(',')})
        `;

        const result = await pool.query(query, artistNames);
        const found = result.rows.map(row => row.name);
        const notFound = artistNames.filter(name => !found.includes(name));

        return { found, notFound };
    } catch (error) {
        console.error('Error: ', error);
        throw error;
    }
}

module.exports = { checkArtists };
