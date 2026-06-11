import React from 'react';
import { useLocation } from 'react-router-dom';
import { ocrImageToText } from '../../utils/ocr';
import INTEGRATIONS from './integrations';
import Loader from '../loader';

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
    const integrationsRef = React.useRef(null);

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
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    function onPaste(e) {
        const item = [...(e.clipboardData?.items || [])].find(i => i.type.includes('image'));

        if (!item) return;
        e.preventDefault();

        const img = item.getAsFile();

        if (img) setFile(img);
    }

    React.useEffect(() => {
        if (!activeIntegration) return;

        function handleClick(e) {
            if (integrationsRef.current && !integrationsRef.current.contains(e.target)) {
                setActiveIntegration(null);
                setIntegrationUrl('');
            }
        }
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [activeIntegration]);

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
                response = await fetch('/api/scan', { method: 'POST', body: formData });
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
        <div className="max-w-2xl mx-auto mt-8 px-4">
            {!artists.length && !loading && !parsing && (
                <form className="bg-gray-200 rounded-2xl shadow-xl p-8" onSubmit={onSubmit}>
                    {!previewUrl && (
                        <>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Scan from playlist</p>
                            <div ref={integrationsRef} className="flex flex-col sm:flex-row sm:flex-wrap mb-4">
                                {INTEGRATIONS.map(integration => (
                                    <div key={integration.id} className="relative w-full sm:w-auto mb-2 sm:mr-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleIntegration(integration.id)}
                                            className={`relative inline-flex items-center w-full sm:w-auto rounded-lg ${integration.btnClass} pr-4 py-2 text-sm font-medium text-white`}
                                        >
                                            <img
                                                src={integration.icon}
                                                alt=""
                                                style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', ...integration.iconStyle }}
                                            />
                                            {integration.label}
                                        </button>
                                        {activeIntegration === integration.id && (
                                            <div className="absolute top-full left-0 mt-2 z-10 w-[26rem] rounded-xl border border-gray-300 bg-gray-100 p-4 shadow-xl">
                                                {integration.type === 'url' ? (
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="url"
                                                            value={integrationUrl}
                                                            onChange={(e) => setIntegrationUrl(e.target.value)}
                                                            placeholder={integration.placeholder}
                                                            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                                            onKeyDown={(e) => e.key === 'Enter' && onIntegrationSubmit(integration)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => onIntegrationSubmit(integration)}
                                                            disabled={loading}
                                                            className={`rounded-lg ${integration.scanBtnClass} px-4 py-2 text-sm font-semibold text-white disabled:opacity-50`}
                                                        >
                                                            Scan
                                                        </button>
                                                    </div>
                                                ) : integration.id === 'spotify' ? (
                                                    <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600">
                                                        <li>Зайди на <a href="https://exportify.net" target="_blank" rel="noreferrer" className="text-blue-600 underline">exportify.net</a></li>
                                                        <li>Натисни <strong>Get Started</strong> та залогінься Spotify акаунтом</li>
                                                        <li>Знайди потрібний плейлист в списку</li>
                                                        <li>Натисни <strong>Export</strong> — завантажиться <code>.csv</code> файл</li>
                                                        <li>Прикріпи його нижче через <strong>Attach File</strong></li>
                                                    </ol>
                                                ) : (
                                                    <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600">
                                                        <li>Відкрий <strong>rekordbox</strong></li>
                                                        <li>Перейди до <strong>Playlists</strong></li>
                                                        <li>Правий клік на плейлист → <strong>Export a playlist to a file</strong></li>
                                                        <li>Обери <strong>Export a playlist to a file (*.txt)</strong></li>
                                                        <li>Прикріпи файл через <strong>Attach File</strong></li>
                                                    </ol>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="relative mt-4 mb-6">
                                <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center">
                                    <div className="w-full border-t border-gray-400" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-gray-200 px-4 text-sm text-gray-600">or paste tracklist/screenshot</span>
                                </div>
                            </div>

                            <textarea
                                rows="6"
                                aria-label="Tracklist"
                                placeholder="Artist - Track"
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 transition-colors resize-y"
                                value={trackListInput}
                                onChange={(e) => setTrackListInput(e.target.value)}
                                onPaste={onPaste}
                            />

                            {confirmTrackList && (
                                <p className="mt-2 text-sm text-amber-600 font-medium">Please review scanned text and correct artist names if needed</p>
                            )}

                            {!confirmTrackList && (
                                <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <p className="text-xs text-gray-600">Format: Artist - Track</p>
                                        <p className="text-xs text-gray-500 mt-1">Для скріншоту: list view · один трек на рядок · без обрізань</p>
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end space-y-1">
                                        <label className="cursor-pointer inline-flex items-center space-x-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-300 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        <span>{file ? file.name : 'Attach File'}</span>
                                        <input
                                            type="file"
                                            aria-label="Upload tracklist file"
                                            className="hidden"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                        <p className="text-[10px] text-gray-500">CUE · TXT (rekordbox) · CSV (Spotify)</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {previewUrl && !parsing && (
                        <div className="space-y-3">
                            <img src={previewUrl} alt="Screenshot preview" className="max-w-full rounded-lg border border-gray-200" />
                            <button
                                type="button"
                                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                onClick={() => setFile(null)}
                            >
                                Remove image
                            </button>
                            <button
                                className="w-full rounded-lg bg-[#2563eb] py-3 font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
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
                                Read text from image
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4">
                            <p role="alert" className="text-sm font-medium text-red-500">{error}</p>
                        </div>
                    )}

                    {!previewUrl && (
                        <button
                            className="mt-5 w-full rounded-lg bg-[#2563eb] py-3 font-medium text-white hover:bg-[#1d4ed8] transition-colors"
                            type="submit"
                        >
                            Scan playlist
                        </button>
                    )}
                </form>
            )}

            <div aria-live="polite">
                {(loading || parsing) && <Loader />}
            </div>

            {artists.length > 0 && !loading && (
                <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-1">Artists found</h2>
                    <p className="text-sm text-gray-400 mb-5">{artists.length} artists · {artists.filter(a => a.blacklisted).length} flagged</p>
                    <ul className="divide-y divide-gray-100">
                        {artists.map((artist, index) => (
                            <li key={index} className="py-2.5 flex items-center flex-wrap space-x-3">
                                <span className={artist.blacklisted ? 'text-red-600 font-medium' : 'text-gray-800'}>
                                    {artist.name}
                                    {artist.countries.length > 0 && (
                                        <span className={`text-xs font-normal ml-1.5 ${artist.blacklisted ? 'text-red-400' : 'text-gray-400'}`}>
                                            ({artist.countries.join(', ')})
                                        </span>
                                    )}
                                </span>
                                {artist.blacklisted && (
                                    <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                        remove from playlist
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                    <button
                        className="mt-6 w-full rounded-lg bg-[#2563eb] py-3 font-medium text-white hover:bg-[#1d4ed8] transition-colors"
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
