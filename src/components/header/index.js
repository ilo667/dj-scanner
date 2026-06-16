import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import NavItems from './nav-items';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const navRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuOpen && navRef.current && !navRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [menuOpen]);

    async function onLogout() {
        await logout();
        setMenuOpen(false);
        navigate('/');
    }

    return (
        <nav ref={navRef} className="relative bg-[#0a0f1e] px-6 py-4 text-gray-200 border-b border-[#1e1e2e] flex justify-between items-center">
            <Link to="/" className="text-3xl font-bold">DJ Scanner</Link>

            {/* Desktop nav */}
            <ul className="hidden sm:flex items-center space-x-4">
                <NavItems user={user} onLogout={onLogout} onClose={() => {}} />
            </ul>

            {/* Mobile burger button */}
            <button
                className="sm:hidden p-1"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu"
            >
                {menuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )}
            </button>

            {/* Mobile dropdown */}
            {menuOpen && (
                <ul className="sm:hidden absolute top-full right-4 w-48 bg-[#020817] ring-1 ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col z-50 overflow-hidden">
                    <NavItems
                        user={user}
                        onLogout={onLogout}
                        onClose={() => setMenuOpen(false)}
                        liClass="block px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-white transition-colors border-b border-white/10"
                    />
                </ul>
            )}
        </nav>
    );
}
