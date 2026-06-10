import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/auth';

export default function Admin() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [artists, setArtists] = React.useState([]);
    const [newArtist, setNewArtist] = React.useState('');
    const [newArtistGenre, setNewArtistGenre] = React.useState('');
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [genres, setGenres] = React.useState([]);
    const [genresLoaded, setGenresLoaded] = React.useState(false);
    const [defaultFilters, setDefaultFilters] = React.useState(null);
    const [countries, setCountries] = React.useState([]);
    const [newArtistCountries, setNewArtistCountries] = React.useState(['141']);

    React.useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        fetchGenres();
        fetchCountries();
    }, [user]);

    React.useEffect(() => {
        if (!genresLoaded) return;

        const dnb = genres.find(g => g.name === 'Drum & Bass');

        setDefaultFilters({ genre_id: dnb?.id ?? null });

        const firstGenre = genres.find(g => g.name !== 'All Genres');

        if (firstGenre) setNewArtistGenre(String(firstGenre.id));
    }, [genresLoaded]);

    React.useEffect(() => {
        if (!defaultFilters) return;

        const genreParam = searchParams.get('genre');
        const genreId = genreParam ? parseInt(genreParam) : defaultFilters.genre_id;

        fetchArtists(genreId);
    }, [defaultFilters, searchParams]);

    async function fetchCountries() {
        try {
            const res = await fetch('/api/countries', { credentials: 'include' });
            const data = await res.json();

            setCountries(data);
        } catch (err) {
            console.error('Failed to fetch countries:', err);
        }
    }

    async function fetchGenres() {
        try {
            const res = await fetch('/api/genres', { credentials: 'include' });
            const data = await res.json();

            setGenres(data);
        } catch {} finally {
            setGenresLoaded(true);
        }
    }

    async function fetchArtists(genreId) {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/artists?genre_id=${genreId}`, { credentials: 'include' });

            if (!res.ok) throw new Error();

            const data = await res.json();

            setArtists(data.artists);
        } catch {
            setError('Failed to load artists');
        } finally {
            setLoading(false);
        }
    }

    function handleChipClick(genre) {
        if (genre.id === defaultFilters?.genre_id) {
            setSearchParams({});
        } else {
            setSearchParams({ genre: genre.id });
        }
    }

    async function addArtist(e) {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch('/api/admin/artists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: newArtist,
                    genre_id: newArtistGenre ? parseInt(newArtistGenre) : null,
                    country_ids: newArtistCountries.map(Number)
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            const isAllGenres = genres.find(g => g.id === selectedGenreId)?.name === 'All Genres';

            if (isAllGenres || data.artist.genre_id === selectedGenreId) {
                setArtists(prev => [...prev, data.artist].sort((a, b) => a.name.localeCompare(b.name)));
            }

            setNewArtist('');
            setNewArtistCountries(['141']);
        } catch (err) {
            setError(err.message);
        }
    }

    async function deleteArtist(id) {
        if (!window.confirm('Delete artist?')) return;

        setError(null);

        try {
            const res = await fetch(`/api/admin/artists/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!res.ok) throw new Error();

            setArtists(prev => prev.filter(a => a.id !== id));
        } catch {
            setError('Failed to delete artist');
        }
    }

    const genreParam = searchParams.get('genre');
    const selectedGenreId = genreParam ? parseInt(genreParam) : defaultFilters?.genre_id;

    if (loading) {
        return <div className="text-center mt-16 text-gray-300">Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 px-4">
            <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Artists blacklist</h1>

                {genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {genres.map(genre => (
                            <div
                                key={genre.id}
                                onClick={() => handleChipClick(genre)}
                                className={`px-4 py-1 rounded-lg text-sm cursor-pointer border transition-colors ${
                                    genre.id === selectedGenreId
                                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-gray-900'
                                }`}
                            >
                                {genre.name}
                            </div>
                        ))}
                    </div>
                )}

                {user?.role === 'admin' && <form onSubmit={addArtist} className="flex flex-wrap gap-2 mb-8 items-center">
                    <input
                        type="text"
                        placeholder="Artist name"
                        aria-label="Artist name"
                        required
                        className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-2 outline-none focus:border-blue-400 focus:bg-white transition-colors"
                        value={newArtist}
                        onChange={e => setNewArtist(e.target.value)}
                    />
                    <div className="relative">
                        <select
                            value={newArtistGenre}
                            onChange={e => setNewArtistGenre(e.target.value)}
                            className="appearance-none rounded-lg border border-gray-200 bg-gray-50 text-gray-900 px-4 py-2 pr-8 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            {genres.filter(g => g.name !== 'All Genres').map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <select
                        multiple
                        size={2}
                        value={newArtistCountries}
                        onChange={e => setNewArtistCountries(Array.from(e.target.selectedOptions, o => o.value))}
                        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-900 px-4 py-2 outline-none"
                    >
                        <option value="141">Russia</option>
                        {countries.filter(c => c.id !== 141).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="rounded-lg bg-[#2563eb] px-6 py-2 font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
                    >
                        Add
                    </button>
                </form>}

                {error && (
                    <div className="mb-4">
                        <p role="alert" className="text-sm font-medium text-red-500">{error}</p>
                    </div>
                )}

                <ul className="divide-y divide-gray-100">
                    {artists.map(artist => (
                        <li key={artist.id} className="flex items-center justify-between py-2.5">
                            <span className="text-gray-800">{artist.name}</span>
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => deleteArtist(artist.id)}
                                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                        </li>
                    ))}
                </ul>

                {!loading && artists.length === 0 && (
                    <p className="text-gray-400 mt-4">No artists in blacklist yet</p>
                )}
            </div>
        </div>
    );
}
