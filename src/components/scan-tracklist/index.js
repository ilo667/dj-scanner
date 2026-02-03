import React from 'react';

export default function ScanTracklist() {
    const [trackListInput, setTrackListInput] = React.useState('');
    const [file, setFile] = React.useState(null);
    const [artists, setArtists] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    async function onSubmit(e) {
        e.preventDefault();

        if (!trackListInput.trim() && !file) return;

        setLoading(true);

        try {
            let response;

            if (file) {
                const formData = new FormData();

                formData.append('file', file);

                response = await fetch('/api/parse-file', {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trackList: trackListInput.trim() })
                });
            }

            const data = await response.json();
            const artists = await checkArtists(data.artists);

            setArtists(artists);
            setFile(null);
            setTrackListInput('');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function checkArtists(artists) {
        try {
            const response = await fetch('/api/artists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    artists
                })
            });

            const data = await response.json();

            return artists.map(artistName => ({
                name: artistName,
                highlight: data.found.includes(artistName)
            }));
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    return (
        <div>
            {!artists.length && !loading && (
                <form className="w-2/3 m-auto" onSubmit={onSubmit}>
                    <textarea rows="15"
                              cols="20"
                              placeholder="Add tracklist"
                              className="peer mt-4 block w-full appearance-none rounded-md border
                              border-gray-400 pb-2 ps-4 pt-3 text-gray-900 placeholder-light-gray outline-none validate"
                              value={trackListInput}
                              onChange={(e) => setTrackListInput(e.target.value)}
                    ></textarea>
                    <span>
                        <strong>Format:</strong>
                        <br/>
                        01. Artist - Track
                        <br/>
                        02. Artist - Track
                        <br/>
                        <strong>or</strong>
                        <br/>
                        Artist - Track
                        <br/>
                        Artist - Track
                        <br/>
                    </span>
                    <br/>
                    <span>Or attach File</span>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <button
                        className="w-full rounded-[6px] bg-[#0057b8] p-4 text-center font-semibold text-white hover:bg-[#00438e] mt-4"
                        type="submit"
                    >
                        <span className="inline-block w-full">Scan playlist</span></button>
                </form>
            )}

            {loading && (
                <div className="text-center mt-6">
                    <p className="text-lg font-semibold">Scanning playlist...</p>
                </div>
            )}

            {artists.length > 0 && !loading && (
                <div className="w-2/3 m-auto mt-6 p-4">
                    <h2 className="text-xl font-semibold mb-3">Artists found:</h2>
                    <ul className="list-disc pl-6">
                        {artists.map((artist, index) => (
                            <li key={index}
                                style={{
                                    color: artist.highlight ? '#ff0000' : '#000000',
                                    fontWeight: artist.highlight ? '700' : '400',
                                }}
                            >
                                {artist.name}
                                {artist.highlight && ' - remove from playlist!'}
                            </li>
                        ))}
                    </ul>
                    <button
                        className="w-full rounded-[6px] bg-[#0057b8] p-4 text-center font-semibold text-white hover:bg-[#004590] mt-4"
                        onClick={() => {
                            setArtists([]);
                            setTrackListInput('');
                        }}
                    >
                        Scan another playlist
                    </button>
                </div>
            )}
        </div>
    );
}
