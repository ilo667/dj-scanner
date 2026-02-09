import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <nav className="justify-between flex bg-[#0057b8] p-5 text-white flex-wrap">
            <Link to="/" className="text-3xl font-bold">DJ Scanner</Link>
            <ul className="flex items-center gap-3 sm:gap-4">
                {/*<li>*/}
                {/*    <Link to="/login">*/}
                {/*        Login/Register*/}
                {/*    </Link>*/}
                {/*</li>*/}
                <li>
                    <Link to="/scan">Scan Tracklist</Link>
                </li>
            </ul>
        </nav>
    );
}
