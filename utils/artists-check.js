const pool = require('./database');

async function checkArtists(artistNames) {
    try {
        if (!artistNames || artistNames.length === 0) {
            return { found: [], notFound: [] };
        }

        const lowerNames = artistNames.map(name => name.toLowerCase());

        const query = `
            SELECT name
            FROM artists
            WHERE LOWER(name) IN (${lowerNames.map((_, i) => `$${i + 1}`).join(',')})
        `;

        const result = await pool.query(query, lowerNames);
        const foundLower = new Set(result.rows.map(row => row.name.toLowerCase()));
        const found = artistNames.filter(name => foundLower.has(name.toLowerCase()));
        const notFound = artistNames.filter(name => !foundLower.has(name.toLowerCase()));

        return { found, notFound };
    } catch (error) {
        console.error('Error: ', error);
        throw error;
    }
}

module.exports = { checkArtists };
