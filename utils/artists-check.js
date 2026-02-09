const pool = require('./database');

async function checkArtists(artistNames) {
    try {
        const lowerNames = artistNames.map(name => name.toLowerCase());

        if (!artistNames || artistNames.length === 0) {
            return { found: [], notFound: [] };
        }

        const query = `
            SELECT name
            FROM artists
            WHERE LOWER(name) IN (${lowerNames.map((_, i) => `$${i + 1}`).join(',')})
        `;

        const result = await pool.query(query, lowerNames);
        const found = result.rows.map(row => row.name);
        const foundLower = new Set(found.map(name => name.toLowerCase()));
        const notFound = artistNames.filter(
            name => !foundLower.has(name.toLowerCase())
        );

        return { found, notFound };
    } catch (error) {
        console.error('Error: ', error);
        throw error;
    }
}

module.exports = { checkArtists };
