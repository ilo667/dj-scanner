const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { isEmail } = require('validator');
const rateLimit = require('express-rate-limit');
const pool = require('../../utils/database');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many registration attempts. Please try again in 1 hour.' }
});

const router = Router();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

const HINT_COOKIE_OPTIONS = {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

function setAuthCookies(res, user) {
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    res.cookie('logged_in', JSON.stringify({ email: user.email, role: user.role }), HINT_COOKIE_OPTIONS);
}

router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { email: rawEmail, password } = req.body;
        const email = (rawEmail || '').toLowerCase().trim();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        try {
            const disifyRes = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`);
            const disifyData = await disifyRes.json();

            if (disifyData.disposable) {
                return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
            }
        } catch {
            // if Disify is unavailable — allow registration to proceed
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Registration failed. Please try a different email or log in.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const inserted = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
            [email, password_hash]
        );

        const user = inserted.rows[0];

        setAuthCookies(res, user);

        return res.status(201).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email: rawEmail, password } = req.body;
        const email = (rawEmail || '').toLowerCase().trim();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        setAuthCookies(res, user);

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    const clearOptions = {
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    };
    res.clearCookie('token', { ...clearOptions, httpOnly: true });
    res.clearCookie('logged_in', clearOptions);
    return res.json({ success: true });
});

module.exports = router;
