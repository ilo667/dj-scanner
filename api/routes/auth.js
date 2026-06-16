const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { isEmail } = require('validator');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
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

const BASE_COOKIE_OPTIONS = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3 * 24 * 60 * 60 * 1000
};

function setAuthCookies(res, user) {
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '3d' }
    );

    res.cookie('token', token, { ...BASE_COOKIE_OPTIONS, httpOnly: true });
    res.cookie('logged_in', JSON.stringify({ email: user.email, role: user.role }), { ...BASE_COOKIE_OPTIONS, httpOnly: false });
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
            const disifyRes = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`, {
                signal: AbortSignal.timeout(10000)
            });
            const disifyData = await disifyRes.json();

            if (disifyData.disposable) {
                return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
            }
        } catch {
            // if Disify is unavailable — allow registration to proceed
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
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Registration failed. Please try a different email or log in.' });
        }
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

        const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);

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

router.post('/google', loginLimiter, async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Missing credential' });

        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
        const { email } = ticket.getPayload();

        let result = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email.toLowerCase()]);
        if (result.rows.length === 0) {
            result = await pool.query(
                'INSERT INTO users (email) VALUES ($1) RETURNING id, email, role',
                [email.toLowerCase()]
            );
        }

        setAuthCookies(res, result.rows[0]);
        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(401).json({ error: 'Google authentication failed' });
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
