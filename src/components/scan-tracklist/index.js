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
            let res;

            if (file) {
                const formData = new FormData();

                formData.append('file', file);

                res = await fetch('/api/parse-file', {
                    method: 'POST',
                    body: formData
                });
            } else {
                res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trackList: trackListInput.trim() })
                });
            }

            const data = await res.json();

            setArtists(data.artists);
            setFile(null);
            setTrackListInput('');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
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
                            <li key={index}>{artist}</li>
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
