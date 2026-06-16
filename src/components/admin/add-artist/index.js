import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth';
import Loader from '../../loader';

export default function AdminAddArtist() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = React.useState('');
    const [genreId, setGenreId] = React.useState('');
    const [countryIds, setCountryIds] = React.useState(['141']);
    const [genres, setGenres] = React.useState([]);
    const [countries, setCountries] = React.useState([]);
    const [error, setError] = React.useState(null);
    const [dataLoading, setDataLoading] = React.useState(true);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (user.role !== 'admin') { navigate('/admin'); return; }

        Promise.all([
            fetch('/api/genres', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/countries', { credentials: 'include' }).then(r => r.json())
        ]).then(([g, c]) => {
            setGenres(g);
            setCountries(c);
            const first = g.find(x => x.name !== 'All Genres');
            if (first) setGenreId(String(first.id));
        }).catch(() => setError('Failed to load data')).finally(() => setDataLoading(false));
    }, [user]);

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/admin/artists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: name.trim(),
                    genre_id: genreId ? parseInt(genreId, 10) : null,
                    country_ids: countryIds.map(Number)
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            navigate('/admin/blacklist');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (dataLoading) return <Loader />;

    return (
        <div className="max-w-xl mx-auto mt-10 px-4">
            <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Add Artist</h1>

                <form onSubmit={onSubmit} className="flex flex-col space-y-4">
                    <input
                        type="text"
                        placeholder="Artist name"
                        aria-label="Artist name"
                        required
                        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-2 outline-none focus:border-blue-400 transition-colors"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />

                    <div className="relative">
                        <select
                            value={genreId}
                            onChange={e => setGenreId(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 text-gray-900 px-4 py-2 pr-8 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
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
                        size={4}
                        value={countryIds}
                        onChange={e => setCountryIds(Array.from(e.target.selectedOptions, o => o.value))}
                        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-900 px-4 py-2 outline-none min-h-[6.5rem]"
                    >
                        <option value="141">Russia</option>
                        {countries.filter(c => c.id !== 141).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    {error && <p role="alert" className="text-sm font-medium text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-[#2563eb] px-6 py-2 font-medium text-white hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Adding…' : 'Add Artist'}
                    </button>
                </form>
            </div>
        </div>
    );
}
