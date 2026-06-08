const pool = require('./database');

async function checkArtists(artistNames) {
    try {
        if (!artistNames || artistNames.length === 0) {
            return { found: [], notFound: [] };
        }

        const lowerNames = artistNames.map(name => name.toLowerCase());

        const query = `
            SELECT a.name, a.is_blacklisted, array_agg(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL) AS countries
            FROM artists a
            LEFT JOIN artist_countries ac ON ac.artist_id = a.id
            LEFT JOIN countries c ON c.id = ac.country_id
            WHERE LOWER(a.name) IN (${lowerNames.map((_, i) => `$${i + 1}`).join(',')})
            GROUP BY a.name, a.is_blacklisted
        `;

        const result = await pool.query(query, lowerNames);
        const artistCountries = {};
        const artistBlacklisted = {};
        result.rows.forEach(row => {
            artistCountries[row.name.toLowerCase()] = row.countries || [];
            artistBlacklisted[row.name.toLowerCase()] = row.is_blacklisted;
        });
        const foundLower = new Set(result.rows.map(row => row.name.toLowerCase()));
        const found = artistNames.filter(name => foundLower.has(name.toLowerCase()));
        const notFound = artistNames.filter(name => !foundLower.has(name.toLowerCase()));

        return { found, notFound, artistCountries, artistBlacklisted };
    } catch (error) {
        console.error('Error: ', error);
        throw error;
    }
}

module.exports = { checkArtists };
