const { parseArtists, separateArtists } = require('../../../utils/parser');
const { checkArtists } = require('../../../utils/artists-check');
const { formatArtists } = require('../../../utils/format-artists');
const { getBlacklistedTracks } = require('../../../utils/blacklisted-tracks');

async function getSoundCloudClientId() {
    const res = await fetch('https://soundcloud.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000)
    });
    const html = await res.text();
    const scriptUrls = [...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com[^"]+\.js[^"]*)"/g)].map(m => m[1]);

    for (const url of scriptUrls) {
        try {
            const jsRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const js = await jsRes.text();
            const match = js.match(/client_id:"([a-zA-Z0-9]+)"/);
            if (match) return match[1];
        } catch {}
    }

    throw new Error('Could not extract SoundCloud client_id');
}

module.exports = async function handleSoundCloud(req, res) {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'SoundCloud playlist URL is required' });
    }

    let clientId;

    try {
        clientId = await getSoundCloudClientId();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Could not connect to SoundCloud' });
    }

    let playlist;

    try {
        const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${clientId}`;
        const response = await fetch(resolveUrl, { signal: AbortSignal.timeout(8000) });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return res.status(500).json({ error: data.message || 'SoundCloud API error' });
        }

        playlist = await response.json();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch SoundCloud playlist' });
    }

    if (playlist.kind !== 'playlist') {
        return res.status(400).json({ error: 'URL is not a SoundCloud playlist' });
    }

    try {
        const fullTracks = playlist.tracks?.filter(t => t?.title) || [];
        const missingIds = playlist.tracks?.filter(t => t && !t.title).map(t => t.id) || [];

        if (missingIds.length) {
            const batchRes = await fetch(
                `https://api-v2.soundcloud.com/tracks?ids=${missingIds.join(',')}&client_id=${clientId}`,
                { signal: AbortSignal.timeout(8000) }
            );
            const batchTracks = await batchRes.json();
            fullTracks.push(...batchTracks);
        }

        const artistSet = new Set();
        const trackLines = [];

        for (const track of fullTracks) {
            if (track.publisher_metadata?.artist) {
                separateArtists(track.publisher_metadata.artist).forEach(a => artistSet.add(a));
            }

            if (track.title) {
                parseArtists(track.title).forEach(a => artistSet.add(a));
                const mainArtist = track.publisher_metadata?.artist || '';
                trackLines.push(mainArtist ? `${mainArtist} · ${track.title}` : track.title);
            }
        }

        const artistList = [...artistSet];
        const checkResult = await checkArtists(artistList);
        const formattedArtists = formatArtists(artistList, checkResult);
        const blacklisted = formattedArtists.filter(a => a.blacklisted).map(a => a.name);
        const blacklistedTracks = getBlacklistedTracks(trackLines, blacklisted);

        return res.json({ success: true, artists: formattedArtists, blacklistedTracks });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch SoundCloud playlist' });
    }
};
