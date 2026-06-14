import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { useEffect } from 'react';

export default function Admin() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    const items = [
        { to: '/admin/blacklist', label: 'Blacklist', description: 'View blacklisted artists' },
        ...(user?.role === 'admin' ? [{ to: '/admin/genres', label: 'Genres', description: 'View genres' }] : []),
    ];

    return (
        <div className="max-w-xl mx-auto mt-10 px-4">
            <h1 className="text-2xl font-bold text-gray-200 mb-6">Admin</h1>
            <div className="flex flex-col space-y-4">
                {items.map(({ to, label, description }) => (
                    <Link
                        key={to}
                        to={to}
                        className="block bg-gray-200 hover:bg-gray-300 rounded-2xl shadow-xl px-6 py-4 text-gray-900 transition-colors"
                    >
                        <div className="font-medium text-lg">{label}</div>
                        <div className="text-gray-600 text-sm mt-1">{description}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
