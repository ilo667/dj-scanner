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

    React.useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        fetchGenres();
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
                body: JSON.stringify({ name: newArtist, genre_id: newArtistGenre ? parseInt(newArtistGenre) : null })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            const isAllGenres = genres.find(g => g.id === selectedGenreId)?.name === 'All Genres';

            if (isAllGenres || data.artist.genre_id === selectedGenreId) {
                setArtists(prev => [...prev, data.artist].sort((a, b) => a.name.localeCompare(b.name)));
            }

            setNewArtist('');
        } catch (err) {
            setError(err.message);
        }
    }

    async function deleteArtist(id) {
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
        return <div className="text-center mt-16">Loading...</div>;
    }

    return (
        <div className="w-2/3 m-auto mt-10">
            <h1 className="text-2xl font-bold mb-6">Artists blacklist</h1>

            {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {genres.map(genre => (
                        <div
                            key={genre.id}
                            onClick={() => handleChipClick(genre)}
                            className={`px-4 py-1 rounded text-sm cursor-pointer ${
                                genre.id === selectedGenreId
                                    ? 'bg-[#003580] text-white border-2 border-[#003580]'
                                    : 'bg-yellow-300 text-[#003580] border-2 border-[#003580] hover:bg-[#0057b8] hover:text-white hover:border-[#0057b8]'
                            }`}
                        >
                            {genre.name}
                        </div>
                    ))}
                </div>
            )}

            {user?.role === 'admin' && <form onSubmit={addArtist} className="flex gap-2 mb-8">
                <input
                    type="text"
                    placeholder="Artist name"
                    aria-label="Artist name"
                    required
                    className="flex-1 rounded-md border border-gray-400 px-4 py-2 outline-none"
                    value={newArtist}
                    onChange={e => setNewArtist(e.target.value)}
                />
                <div className="relative">
                    <select
                        value={newArtistGenre}
                        onChange={e => setNewArtistGenre(e.target.value)}
                        className="appearance-none rounded-md bg-green-700 text-white px-4 py-2 pr-8 outline-none cursor-pointer hover:bg-green-800"
                    >
                        {genres.filter(g => g.name !== 'All Genres').map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <button
                    type="submit"
                    className="rounded-md bg-[#0057b8] px-6 py-2 font-semibold text-white hover:bg-[#00438e]"
                >
                    Add
                </button>
            </form>}

            {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}

            <ul className="divide-y divide-gray-200">
                {artists.map(artist => (
                    <li key={artist.id} className="flex items-center justify-between py-2">
                        <span>{artist.name}</span>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => deleteArtist(artist.id)}
                                className="text-sm text-red-600 hover:underline"
                            >
                                Delete
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {!loading && artists.length === 0 && (
                <p className="text-gray-500 mt-4">No artists in blacklist yet</p>
            )}
        </div>
    );
}
