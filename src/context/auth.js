import React from 'react';

const AuthContext = React.createContext(null);

function readUserFromCookie() {
    const match = document.cookie.split('; ').find(row => row.startsWith('logged_in='));

    if (!match) return null;

    try {
        return JSON.parse(decodeURIComponent(match.split('=')[1]));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = React.useState(readUserFromCookie);

    async function login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        refreshUser();
    }

    function refreshUser() {
        setUser(readUserFromCookie());
    }

    async function logout() {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return React.useContext(AuthContext);
}
