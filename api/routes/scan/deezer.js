const { parseArtists } = require('../../../utils/parser');
const { checkArtists } = require('../../../utils/artists-check');
const { formatArtists } = require('../../../utils/format-artists');
const { getBlacklistedTracks } = require('../../../utils/blacklisted-tracks');

module.exports = async function handleDeezer(req, res) {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Deezer playlist URL is required' });
    }

    const match = (() => { try { return new URL(url).pathname.match(/\/playlist\/(\d+)/); } catch { return null; } })();
    const playlistId = match?.[1];

    if (!playlistId) {
        return res.status(400).json({ error: 'Could not find playlist ID in URL' });
    }

    const artistSet = new Set();
    const trackLines = [];
    let index = 0;
    const LIMIT = 100;

    try {
        while (true) {
            const apiUrl = `https://api.deezer.com/playlist/${playlistId}/tracks?limit=${LIMIT}&index=${index}`;
            const response = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
            const data = await response.json();

            if (data.error) {
                return res.status(500).json({ error: data.error.message || 'Deezer API error' });
            }

            for (const track of data.data || []) {
                if (track.artist?.name) artistSet.add(track.artist.name);

                for (const contributor of track.contributors || []) {
                    if (contributor.name) artistSet.add(contributor.name);
                }

                if (track.title) {
                    parseArtists(track.title).forEach(a => artistSet.add(a));
                    const mainArtist = track.artist?.name || '';
                    trackLines.push(mainArtist ? `${mainArtist} - ${track.title}` : track.title);
                }
            }

            if (!data.next || (data.data?.length ?? 0) < LIMIT) break;
            index += LIMIT;
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch Deezer playlist' });
    }

    const artistList = [...artistSet];
    const checkResult = await checkArtists(artistList);
    const formattedArtists = formatArtists(artistList, checkResult);
    const blacklisted = formattedArtists.filter(a => a.blacklisted).map(a => a.name);
    const blacklistedTracks = getBlacklistedTracks(trackLines, blacklisted);

    return res.json({ success: true, artists: formattedArtists, blacklistedTracks });
};
