import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';

export default function useGoogleAuth({ setLoading, setError }) {
    const { refreshUser } = useAuth();
    const navigate = useNavigate();

    async function onGoogleSuccess(credentialResponse) {
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ credential: credentialResponse.credential })
            });
            if (res.ok) {
                refreshUser();
                navigate('/');
            } else {
                const data = await res.json();
                setError(data.error || 'Google login failed');
            }
        } finally {
            setLoading(false);
        }
    }

    return onGoogleSuccess;
}
