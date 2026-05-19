import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';

export default function Admin() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [artists, setArtists] = React.useState([]);
    const [newArtist, setNewArtist] = React.useState('');
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.role !== 'admin') {
            navigate('/');
            return;
        }

        fetchArtists();
    }, [user]);

    async function fetchArtists() {
        try {
            const res = await fetch('/api/admin/artists', { credentials: 'include' });

            if (!res.ok) throw new Error();
            const data = await res.json();

            setArtists(data.artists);
        } catch {
            setError('Failed to load artists');
        } finally {
            setLoading(false);
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
                body: JSON.stringify({ name: newArtist })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setNewArtist('');
            fetchArtists();
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

    if (loading) {
        return <div className="text-center mt-16">Loading...</div>;
    }

    return (
        <div className="w-2/3 m-auto mt-10">
            <h1 className="text-2xl font-bold mb-6">Artists blacklist</h1>

            <form onSubmit={addArtist} className="flex gap-2 mb-8">
                <input
                    type="text"
                    placeholder="Artist name"
                    aria-label="Artist name"
                    required
                    className="flex-1 rounded-md border border-gray-400 px-4 py-2 outline-none"
                    value={newArtist}
                    onChange={e => setNewArtist(e.target.value)}
                />
                <button
                    type="submit"
                    className="rounded-md bg-[#0057b8] px-6 py-2 font-semibold text-white hover:bg-[#00438e]"
                >
                    Add
                </button>
            </form>

            {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}

            <ul className="divide-y divide-gray-200">
                {/* TODO: move nameCounts to useMemo to avoid recalculating on every render */}
                {(() => {
                    const nameCounts = artists.reduce((acc, a) => {
                        acc[a.name.toLowerCase()] = (acc[a.name.toLowerCase()] || 0) + 1;
                        return acc;
                    }, {});
                    return artists.map(artist => (
                        <li key={artist.id} className="flex items-center justify-between py-2">
                            <span>{artist.name}</span>
                            <span className="flex items-center gap-3">
                                {nameCounts[artist.name.toLowerCase()] > 1 && (
                                    <span className="text-xs text-[#0057b8] underline font-medium">duplicate</span>
                                )}
                                <button
                                    onClick={() => deleteArtist(artist.id)}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </span>
                        </li>
                    ));
                })()}
            </ul>

            {!loading && artists.length === 0 && (
                <p className="text-gray-500 mt-4">No artists in blacklist yet.</p>
            )}
        </div>
    );
}
