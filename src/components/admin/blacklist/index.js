import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/auth';
import Loader from '../../loader';

export default function AdminBlacklist() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [artists, setArtists] = React.useState([]);
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
        return <Loader />;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 px-4">
            <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Artists blacklist</h1>

                {genres.length > 0 && (
                    <div className="flex flex-wrap mb-4">
                        {genres.map(genre => (
                            <div
                                key={genre.id}
                                onClick={() => handleChipClick(genre)}
                                className={`mr-2 mb-2 px-4 py-1 rounded-lg text-sm cursor-pointer border transition-colors ${
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
