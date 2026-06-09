const { parseArtists, separateArtists } = require('../../../utils/parser');
const { checkArtists } = require('../../../utils/artists-check');

const MAX_PAGES = 30;

module.exports = async function handleYoutube(req, res) {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'YouTube playlist URL is required' });
    }

    let playlistId;

    try {
        playlistId = new URL(url).searchParams.get('list');
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!playlistId) {
        return res.status(400).json({ error: 'Could not find playlist ID in URL' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const artistSet = new Set();
    let pageToken = '';
    let pageCount = 0;

    try {
        do {
            const apiUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');

            apiUrl.searchParams.set('part', 'snippet');
            apiUrl.searchParams.set('playlistId', playlistId);
            apiUrl.searchParams.set('maxResults', '50');
            apiUrl.searchParams.set('key', apiKey);

            if (pageToken) apiUrl.searchParams.set('pageToken', pageToken);

            const response = await fetch(apiUrl.toString());
            const data = await response.json();

            if (!response.ok) {
                return res.status(500).json({ error: data.error?.message || 'YouTube API error' });
            }

            for (const item of data.items || []) {
                const title = item.snippet?.title;
                const channelTitle = item.snippet?.videoOwnerChannelTitle;

                if (!title || title === 'Deleted video' || title === 'Private video') continue;

                // extract from official artist channels: "Artist Name - Topic" → "Artist Name"
                if (channelTitle && /\s*-\s*Topic$/i.test(channelTitle)) {
                    const artist = channelTitle.replace(/\s*-\s*Topic$/i, '').trim();

                    if (artist) separateArtists(artist).forEach(a => artistSet.add(a));
                }

                // extract additional artists from title (feat, remix, etc.)
                parseArtists(title).forEach(a => artistSet.add(a));
            }

            pageToken = data.nextPageToken || '';
            pageCount++;
        } while (pageToken && pageCount < MAX_PAGES);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch YouTube playlist' });
    }

    const artistList = [...artistSet];
    const { found, artistCountries, artistBlacklisted } = await checkArtists(artistList);

    return res.json({
        success: true,
        artists: artistList.map(name => ({
            name,
            highlight: found.includes(name),
            blacklisted: artistBlacklisted[name.toLowerCase()] ?? false,
            countries: artistCountries[name.toLowerCase()] || []
        }))
    });
};
