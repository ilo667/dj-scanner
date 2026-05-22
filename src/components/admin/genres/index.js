import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth';

export default function AdminGenres() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [genres, setGenres] = React.useState([]);
    const [newGenre, setNewGenre] = React.useState('');
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [genresLoading, setGenresLoading] = React.useState(true);

    React.useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.role !== 'admin') {
            navigate('/');
            return;
        }

        fetchGenres();
    }, [user]);

    async function fetchGenres() {
        try {
            const res = await fetch('/api/genres');
            const data = await res.json();

            setGenres(data);
        } catch {
            setError('Failed to load genres.');
        } finally {
            setGenresLoading(false);
        }
    }

    async function addGenre(e) {
        e.preventDefault();
        if (!newGenre.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/genres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGenre.trim() })
            });

            if (res.status === 409) {
                setError('Genre already exists');
                return;
            }

            if (!res.ok) throw new Error();

            const genre = await res.json();
            setGenres(prev => [...prev, genre].sort((a, b) => a.name.localeCompare(b.name)));
            setNewGenre('');
        } catch {
            setError('Failed to add genre.');
        } finally {
            setLoading(false);
        }
    }

    async function deleteGenre(id) {
        setError(null);
        try {
            const res = await fetch(`/api/genres/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setGenres(prev => prev.filter(g => g.id !== id));
        } catch {
            setError('Failed to delete genre.');
        }
    }

    if (genresLoading) return <div className="text-center mt-16">Loading...</div>;

    return (
        <div className="w-2/3 m-auto mt-10">
            <h1 className="text-2xl font-bold mb-6">Genres</h1>

            <form onSubmit={addGenre} className="flex gap-2 mb-8">
                <input
                    type="text"
                    placeholder="Genre name"
                    aria-label="Genre name"
                    className="flex-1 rounded-md border border-gray-400 px-4 py-2 outline-none"
                    value={newGenre}
                    onChange={e => setNewGenre(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-[#0057b8] px-6 py-2 font-semibold text-white hover:bg-[#00438e] disabled:opacity-50"
                >
                    Add
                </button>
            </form>

            {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}

            <ul className="divide-y divide-gray-200">
                {genres.map(genre => (
                    <li key={genre.id} className="flex items-center justify-between py-2">
                        <span>{genre.name}</span>
                        <button
                            onClick={() => deleteGenre(genre.id)}
                            className="text-sm text-red-600 hover:underline"
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>

            {!genresLoading && genres.length === 0 && (
                <p className="text-gray-500 mt-4">No genres yet</p>
            )}
        </div>
    );
}
