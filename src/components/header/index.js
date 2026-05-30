import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    async function onLogout() {
        await logout();
        navigate('/');
    }

    return (
        <nav className="justify-between flex bg-[#0057b8] p-5 text-white flex-wrap">
            <Link to="/" className="text-3xl font-bold">DJ Scanner</Link>
            <ul className="flex items-center gap-3 sm:gap-4">
                <li>
                    <Link to="/scan">Scan Tracklist</Link>
                </li>
                {user ? (
                    <>
                        <li>
                            <Link to="/admin/blacklist">Blacklist</Link>
                        </li>
                        <li>
                            <button onClick={onLogout} className="underline">
                                Logout ({user.email})
                            </button>
                        </li>
                    </>
                ) : (
                    <li>
                        <Link to="/login">Login</Link>
                    </li>
                )}
            </ul>
        </nav>
    );
}
