import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/auth';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ email: '', password: '' });
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(form.email, form.password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm m-auto mt-16 px-4">
            <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Login</h1>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email"
                        aria-label="Email"
                        required
                        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-3 outline-none focus:border-blue-400 transition-colors"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        aria-label="Password"
                        required
                        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-3 outline-none focus:border-blue-400 transition-colors"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    />
                    {error && (
                        <div>
                            <p role="alert" className="text-sm font-medium text-red-500">{error}</p>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-[#2563eb] p-3 font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    <p className="text-sm text-center text-gray-500">
                        No account? <Link to="/register" className="text-blue-600 underline">Register</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
