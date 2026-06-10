import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="max-w-2xl mx-auto mt-10 px-4">
            <div className="bg-gray-200 rounded-2xl shadow-xl p-8">
                <h1 className="mb-4 text-2xl font-bold text-gray-900 tracking-tight">DJ Scanner - ваш помічник у редагуванні плейлистів</h1>
                <p className="text-gray-600 mb-3">Що вміє DJ Scanner:</p>
                <ul className="list-disc list-inside mb-6 space-y-1.5 text-gray-700">
                    <li>Підтримка форматів: <strong>CUE, TXT (rekordbox)</strong>, ручне введення</li>
                    <li>Розпізнавання тексту зі <strong>скріншотів (OCR)</strong></li>
                    <li>Імпорт із <strong>Spotify, YouTube, Apple Music, Deezer, SoundCloud, rekordbox</strong></li>
                    <li>Автоматичне визначення <strong>країни виконавця</strong></li>
                    <li>Перевірка плейлиста на <strong>небажаних виконавців</strong></li>
                    <li>Фільтрація за <strong>жанрами</strong> для авторизованих користувачів</li>
                </ul>

                <Link to="/scan"
                      className="inline-flex items-center justify-center rounded-lg bg-[#2563eb] px-6 py-3 text-base font-semibold text-white hover:bg-[#1d4ed8] transition-colors">
                    Scan Tracklist
                </Link>
            </div>
        </div>
    );
}