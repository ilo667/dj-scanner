import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/auth';

export default function Register() {
    const { refreshUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ email: '', password: '', confirmPassword: '' });
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: form.email, password: form.password })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            refreshUser();
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm m-auto mt-16 px-4">
            <h1 className="text-2xl font-bold mb-6">Register</h1>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <input
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    required
                    className="rounded-md border border-gray-400 px-4 py-3 outline-none"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
                <input
                    type="password"
                    placeholder="Password"
                    aria-label="Password"
                    required
                    className="rounded-md border border-gray-400 px-4 py-3 outline-none"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <input
                    type="password"
                    placeholder="Confirm password"
                    aria-label="Confirm password"
                    required
                    className="rounded-md border border-gray-400 px-4 py-3 outline-none"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
                {error && <p role="alert" className="text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-[#0057b8] p-3 font-semibold text-white hover:bg-[#00438e] disabled:opacity-50"
                >
                    {loading ? 'Registering...' : 'Register'}
                </button>
                <p className="text-sm text-center">
                    Already have an account? <Link to="/login" className="text-[#0057b8] underline">Login</Link>
                </p>
            </form>
        </div>
    );
}
