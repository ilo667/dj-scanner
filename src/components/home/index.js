import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div>
            <Link to="/scan">Scan Tracklist</Link>
        </div>
    );
}