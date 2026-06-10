import React from 'react';
import { useLocation } from 'react-router-dom';
import { ocrImageToText } from '../../utils/ocr';
import INTEGRATIONS from './integrations';

export default function ScanTracklist() {
    const [trackListInput, setTrackListInput] = React.useState('');
    const [file, setFile] = React.useState(null);
    const [artists, setArtists] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [parsing, setParsing] = React.useState(false);
    const [confirmTrackList, setConfirmTrackList] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [activeIntegration, setActiveIntegration] = React.useState(null);
    const [integrationUrl, setIntegrationUrl] = React.useState('');
    const location = useLocation();

    React.useEffect(() => {
        setArtists([]);
        setTrackListInput('');
        setFile(null);
        setError(null);
        setConfirmTrackList(false);
        setActiveIntegration(null);
        setIntegrationUrl('');
    }, [location.key]);

    const previewUrl = React.useMemo(() => {
        if (!file || !file.type.startsWith('image/')) return null;
        return URL.createObjectURL(file);
    }, [file]);

    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function onPaste(e) {
        const item = [...(e.clipboardData?.items || [])].find(i => i.type.includes('image'));

        if (!item) {
            return;
        }

        e.preventDefault();

        const img = item.getAsFile();

        if (img) {
            setFile(img);
        }
    }

    function toggleIntegration(id) {
        setActiveIntegration(prev => prev === id ? null : id);
        setIntegrationUrl('');
    }

    async function onIntegrationSubmit(integration) {
        if (!integrationUrl.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(integration.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: integrationUrl.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(response.status === 429
                    ? (data.error || 'Too many scan requests. Please try again in 15 minutes.')
                    : (data.error || 'Something went wrong while scanning playlist. Please try again.')
                );
                return;
            }

            setArtists(data.artists);
            setIntegrationUrl('');
            setActiveIntegration(null);
        } catch (err) {
            console.error(err);
            setError('Something went wrong while scanning playlist. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function onSubmit(e) {
        e.preventDefault();

        if (!trackListInput.trim() && !file) return;

        const trackList = trackListInput.trim();

        if (!file && !trackList.includes(' - ')) {
            setError('Invalid format. Use: Artist - Track');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let response;

            if (file) {
                const formData = new FormData();

                formData.append('file', file);

                response = await fetch('/api/scan', {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trackList })
                });
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));

                setError(response.status === 429
                    ? (errData.error || 'Too many scan requests. Please try again in 15 minutes.')
                    : (errData.error || 'Something went wrong while scanning playlist. Please try again.')
                );
                return;
            }

            const data = await response.json();

            setArtists(data.artists);
            setFile(null);
            setTrackListInput('');
            setConfirmTrackList(false);
        } catch (err) {
            console.error(err);
            setError('Something went wrong while scanning playlist. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {!artists.length && !loading && (
                <form className="w-2/3 m-auto" onSubmit={onSubmit}>
                    {!previewUrl && (
                        <div>
                            <div className="mt-4 mb-2 flex flex-wrap gap-3">
                                {INTEGRATIONS.map(integration => (
                                    <div key={integration.id} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => toggleIntegration(integration.id)}
                                            className={`relative inline-flex items-center rounded-md ${integration.btnClass} pr-4 py-2 font-semibold text-white`}
                                        >
                                            <img
                                                src={integration.icon}
                                                alt=""
                                                style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', ...integration.iconStyle }}
                                            />
                                            {integration.label}
                                        </button>
                                        {activeIntegration === integration.id && (
                                            <div className="absolute top-full left-0 mt-1 z-10 w-[26rem] rounded-md border border-gray-300 bg-gray-50 p-4 text-sm shadow-md">
                                                {integration.type === 'url' ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="url"
                                                            value={integrationUrl}
                                                            onChange={(e) => setIntegrationUrl(e.target.value)}
                                                            placeholder={integration.placeholder}
                                                            className="flex-1 rounded-md border border-gray-400 px-3 py-2 text-sm outline-none"
                                                            onKeyDown={(e) => e.key === 'Enter' && onIntegrationSubmit(integration)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => onIntegrationSubmit(integration)}
                                                            disabled={loading}
                                                            className={`rounded-md ${integration.scanBtnClass} px-4 py-2 font-semibold text-white disabled:opacity-50`}
                                                        >
                                                            Scan
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <ol className="list-decimal pl-5 space-y-1">
                                                        <li>Зайди на <a href="https://exportify.net" target="_blank" rel="noreferrer" className="text-blue-600 underline">exportify.net</a></li>
                                                        <li>Натисни <strong>Get Started</strong> та залогінься Spotify акаунтом</li>
                                                        <li>Знайди потрібний плейлист в списку</li>
                                                        <li>Натисни <strong>Export</strong> - завантажиться <code>.csv</code> файл</li>
                                                        <li>Прикріпи його нижче через <strong>Attach File</strong></li>
                                                    </ol>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                              <textarea rows="12"
                                        cols="20"
                                        aria-label="Tracklist"
                                        placeholder="Add tracklist or paste image screenshot"
                                        className="peer mt-4 block w-full appearance-none rounded-md border
                              border-gray-400 pb-2 ps-4 pt-3 text-gray-900 placeholder-light-gray outline-none validate"
                                        value={trackListInput}
                                        onChange={(e) => setTrackListInput(e.target.value)}
                                        onPaste={onPaste}
                              ></textarea>
                            {confirmTrackList && (
                                <span className="text-[#ff0000]">Please review scanned text and correct artist names if needed</span>
                            )}
                            {!confirmTrackList && (
                                <>
                                    <span>
                                        <strong>Text format:</strong>
                                        <br/>
                                        01. Artist - Track
                                        <br/>
                                        1. Artist - Track
                                        <br/>
                                        Artist - Track
                                        <br/>
                                    </span>
                                    <br/>
                                    <span>Or <strong>Attach File</strong></span>
                                    <br/>
                                    <input type="file"
                                        aria-label="Upload tracklist file"
                                        className="w-full md:w-auto"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    <div className="mt-5">
                                        <strong>Screenshot tips:</strong>
                                        <ul className="list-disc pl-5">
                                            <li>Use list view - one track per line</li>
                                            <li>Make sure track names are not cut off</li>
                                            <li>Clear font, good contrast (light on dark or dark on light)</li>
                                            <li>No UI elements overlapping the text</li>
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {previewUrl && !parsing && (
                        <div className="mt-4">
                            <img
                                src={previewUrl}
                                alt="Screenshot preview"
                                className="max-w-full rounded border
                              border-gray-400"
                            />
                            <button
                                type="button"
                                className="mt-2 rounded px-3 py-1 text-sm bg-gray-100 hover:bg-[#ddddde]"
                                onClick={() => setFile(null)}
                            >
                                Remove image
                            </button>
                            <button
                                className="w-full rounded-[6px] bg-[#0057b8] p-4 text-center font-semibold text-white hover:bg-[#00438e] mt-4"
                                type="button"
                                onClick={async () => {
                                    setParsing(true);
                                    setError(null);

                                    try {
                                        const text = await ocrImageToText(file);

                                        setTrackListInput(text);
                                        setFile(null);
                                        setConfirmTrackList(true);
                                    } catch (err) {
                                        console.error(err);
                                        setError('Failed to read text from image. Please try again.');
                                    } finally {
                                        setParsing(false);
                                    }
                                }}
                            >
                                <span className="inline-block w-full">Read text from image</span>
                            </button>
                        </div>
                    )}
                    {!previewUrl && (
                        <button
                            className="w-full rounded-[6px] bg-[#0057b8] p-4 text-center font-semibold text-white hover:bg-[#00438e] mt-4"
                            type="submit"
                        >
                            <span className="inline-block w-full">Scan playlist</span>
                        </button>
                    )}
                </form>
            )}

            {error && (
                <div className="w-2/3 m-auto mt-4">
                    <p role="alert" className="text-red-600 font-medium">{error}</p>
                </div>
            )}

            <div aria-live="polite" className="text-center mt-6">
                {loading && <p className="text-lg font-semibold">Scanning playlist...</p>}
                {parsing && <p className="text-lg font-semibold">Reading text from image...</p>}
            </div>

            {artists.length > 0 && !loading && (
                <div className="w-2/3 m-auto mt-6 p-4">
                    <h2 className="text-xl font-semibold mb-3">Artists found:</h2>
                    <ul className="list-disc pl-6">
                        {artists.map((artist, index) => (
                            <li key={index} className="py-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span style={{ color: artist.blacklisted ? '#ff0000' : '#000000', fontWeight: artist.blacklisted ? '700' : '400' }}>
                                        {artist.name}
                                        {artist.countries.length > 0 && (
                                            <span className="text-[10px] font-normal ml-1" style={{ color: artist.blacklisted ? '#ff0000' : '#555555' }}>
                                                {' '}({artist.countries.join(', ')})
                                            </span>
                                        )}
                                    </span>
                                    {artist.blacklisted && (
                                        <span className="text-red-600">- remove from playlist!</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button
                        className="w-full rounded-[6px] bg-[#0057b8] p-4 text-center font-semibold text-white hover:bg-[#004590] mt-4"
                        onClick={() => {
                            setArtists([]);
                            setTrackListInput('');
                            setConfirmTrackList(false);
                            setError(null);
                        }}
                    >
                        Scan another playlist
                    </button>
                </div>
            )}
        </div>
    );
}
