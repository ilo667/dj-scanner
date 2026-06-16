import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../context/auth';
import useGoogleAuth from '../../../hooks/useGoogleAuth';

export default function Register() {
    const { refreshUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ email: '', password: '', confirmPassword: '' });
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const onGoogleSuccess = useGoogleAuth({ setLoading, setError });

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
            <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Register</h1>
                <form onSubmit={onSubmit} className="flex flex-col space-y-4">
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
                    <input
                        type="password"
                        placeholder="Confirm password"
                        aria-label="Confirm password"
                        required
                        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-3 outline-none focus:border-blue-400 transition-colors"
                        value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    />
                    {error && (
                        <div>
                            <p role="alert" className="text-sm font-medium text-red-500">{error}</p>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-[#2563eb] p-3 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-gray-300" />
                    <span className="px-3 text-sm text-gray-500">або</span>
                    <div className="flex-1 border-t border-gray-300" />
                </div>

                <div className={`flex justify-center ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                    <GoogleLogin onSuccess={onGoogleSuccess} onError={() => setError('Google login failed')} theme="outline" shape="pill" />
                </div>

                <p className="text-sm text-center text-gray-500 mt-4">
                    Already have an account? <Link to="/login" className="text-blue-600 underline">Login</Link>
                </p>
            </div>
        </div>
    );
}
