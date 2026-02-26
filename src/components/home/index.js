import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="p-5">
            <h1 className="mb-4 text-3xl font-bold tracking-tight">DJ Scanner - ваш помічник у редагуванні плейлистів</h1>
            <p>Що на данний час вміє DJ Scanner:</p>
            <ul className="list-disc list-inside mb-5">
                <li>Читання треклістів із <strong>CUE-файлів та TXT-експорту з Beatport</strong></li>
                <li>Ручне введення треклістів через <strong>поле</strong></li>
                <li>Розпізнавання тексту зі <strong>скріншотів і зображень</strong></li>
                <li>Автоматичне визначення <strong>артистів</strong></li>
                <li>Швидка перевірка та <strong>фільтрація небажаних виконавців</strong></li>
            </ul>

            <Link to="/scan"
                  className="inline-flex items-center justify-center rounded-xl bg-[#0057b8] px-6 py-2 text-lg font-semibold text-white hover:bg-[#00438e]">
                Scan Tracklist
            </Link>
        </div>
    );
}