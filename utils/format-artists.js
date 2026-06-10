function formatArtists(artistList, { found, artistCountries, artistBlacklisted }) {
    return artistList.map(name => ({
        name,
        highlight: found.includes(name),
        blacklisted: artistBlacklisted[name.toLowerCase()] ?? false,
        countries: artistCountries[name.toLowerCase()] || []
    }));
}

module.exports = { formatArtists };
