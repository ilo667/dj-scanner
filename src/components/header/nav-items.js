import { Link } from 'react-router-dom';

export default function NavItems({ user, onLogout, liClass, onClose }) {
    return (
        <>
            <li><Link to="/scan" onClick={onClose} className={liClass}>Scan Tracklist</Link></li>
            {user ? (
                <>
                    <li><Link to="/admin" onClick={onClose} className={liClass}>Admin</Link></li>
                    <li>
                        <button onClick={onLogout} className={`w-full text-left ${liClass} text-gray-400 text-sm`}>
                            Logout ({user.email})
                        </button>
                    </li>
                </>
            ) : (
                <li><Link to="/login" onClick={onClose} className={liClass}>Login</Link></li>
            )}
        </>
    );
}
