import { Routes, Route } from 'react-router-dom';
import Home from './components/home';
import Login from './components/account/login';
import Register from './components/account/register';
import ScanTracklist from './components/scan-tracklist';
import Admin from './components/admin';
import AdminGenres from './components/admin/genres';
import Header from './components/header';
import NotFound from './components/not-found';

export function App() {
    return (
        <div className="min-h-screen pb-10 bg-[#ffd700]">
            <Header />
            <Routes>
                <Route index element={<Home />}/>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="scan" element={<ScanTracklist />} />
                <Route path="admin" element={<Admin />} />
                <Route path="admin/genres" element={<AdminGenres />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </div>
    );
}

export default App;
