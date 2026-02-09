import { Routes, Route } from 'react-router-dom';
import Home from './components/home';
import Login from './components/account/login';
import ScanTracklist from './components/scan-tracklist';
import Header from './components/header';
import NotFound from './components/not-found';

export function App() {
    return (
        <div className="min-h-screen pb-10 bg-[#ffd700]">
            <Header />
            <Routes>
                <Route index element={<Home />}/>
                <Route path="login" element={<Login />} />
                <Route path="scan" element={<ScanTracklist />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </div>
    );
}

export default App;
