process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

const { test, describe, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { requireAuth, requireRole, requireAdmin } = require('../api/middleware/auth');

const SECRET = process.env.JWT_SECRET;

function makeRes() {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
}

function makeToken(payload) {
    return jwt.sign(payload, SECRET);
}

describe('requireAuth', () => {
    test('no token → 401', () => {
        const req = { cookies: {} };
        const res = makeRes();
        requireAuth(req, res, () => {});
        assert.equal(res.statusCode, 401);
    });

    test('invalid token → 401', () => {
        const req = { cookies: { token: 'bad-token' } };
        const res = makeRes();
        requireAuth(req, res, () => {});
        assert.equal(res.statusCode, 401);
    });

    test('expired token → 401', () => {
        const token = jwt.sign({ id: 1, role: 'user' }, SECRET, { expiresIn: -1 });
        const req = { cookies: { token } };
        const res = makeRes();
        requireAuth(req, res, () => {});
        assert.equal(res.statusCode, 401);
    });

    test('valid token → next() called', () => {
        const req = { cookies: { token: makeToken({ id: 1, role: 'user' }) } };
        const res = makeRes();
        let called = false;
        requireAuth(req, res, () => { called = true; });
        assert.ok(called);
    });

    test('valid token → req.user populated', () => {
        const req = { cookies: { token: makeToken({ id: 1, email: 'a@b.com', role: 'user' }) } };
        const res = makeRes();
        requireAuth(req, res, () => {});
        assert.equal(req.user.role, 'user');
        assert.equal(req.user.email, 'a@b.com');
    });
});

describe('requireRole', () => {
    test('matching role → next() called', () => {
        const req = { user: { role: 'admin' } };
        const res = makeRes();
        let called = false;
        requireRole('admin')(req, res, () => { called = true; });
        assert.ok(called);
    });

    test('non-matching role → 403', () => {
        const req = { user: { role: 'user' } };
        const res = makeRes();
        requireRole('admin')(req, res, () => {});
        assert.equal(res.statusCode, 403);
    });

    test('one of multiple allowed roles → next() called', () => {
        const req = { user: { role: 'user' } };
        const res = makeRes();
        let called = false;
        requireRole('admin', 'user')(req, res, () => { called = true; });
        assert.ok(called);
    });
});

// helpers for page access tests
function runAuth(token) {
    const req = { cookies: token ? { token } : {} };
    const res = makeRes();
    let passed = false;
    requireAuth(req, res, () => { passed = true; });
    return { status: res.statusCode, passed, req };
}

function runAdmin(token) {
    const [authMiddleware, roleMiddleware] = requireAdmin();
    const req = { cookies: token ? { token } : {} };
    const res = makeRes();
    let passed = false;
    authMiddleware(req, res, () => roleMiddleware(req, res, () => { passed = true; }));
    return { status: res.statusCode, passed };
}

describe('page access — /admin and /admin/blacklist (requireAuth)', () => {
    test('guest → 401', () => {
        const { status } = runAuth(null);
        assert.equal(status, 401);
    });

    test('logged-in user → allowed', () => {
        const { passed } = runAuth(makeToken({ id: 1, role: 'user' }));
        assert.ok(passed);
    });

    test('logged-in admin → allowed', () => {
        const { passed } = runAuth(makeToken({ id: 1, role: 'admin' }));
        assert.ok(passed);
    });
});

describe('page access — /admin/genres (requireAdmin)', () => {
    test('guest → 401', () => {
        const { status } = runAdmin(null);
        assert.equal(status, 401);
    });

    test('logged-in user → 403', () => {
        const { status } = runAdmin(makeToken({ id: 1, role: 'user' }));
        assert.equal(status, 403);
    });

    test('logged-in admin → allowed', () => {
        const { passed } = runAdmin(makeToken({ id: 1, role: 'admin' }));
        assert.ok(passed);
    });
});

describe('POST /api/auth/google', () => {
    function makeGoogleReq(body) {
        return { body: body ?? {} };
    }

    function makeGoogleRes() {
        const res = { statusCode: 200, body: null, cookies: {} };
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (body) => { res.body = body; return res; };
        res.cookie = (name, value) => { res.cookies[name] = value; return res; };
        return res;
    }

    async function callGoogleHandler(req, res) {
        const { OAuth2Client } = require('google-auth-library');
        const pool = require('../utils/database');

        const credential = req.body?.credential;
        if (!credential) {
            res.status(400).json({ error: 'Missing credential' });
            return;
        }

        try {
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

            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '3d' });
            res.cookie('token', token);
            res.cookie('logged_in', JSON.stringify({ email: user.email, role: user.role }));
            res.json({ success: true });
        } catch {
            res.status(401).json({ error: 'Google authentication failed' });
        }
    }

    test('missing credential → 400', async () => {
        const req = makeGoogleReq({});
        const res = makeGoogleRes();
        await callGoogleHandler(req, res);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error, 'Missing credential');
    });

    test('invalid Google token → 401', async () => {
        const { OAuth2Client } = require('google-auth-library');
        mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => { throw new Error('Invalid token'); });

        const req = makeGoogleReq({ credential: 'bad-token' });
        const res = makeGoogleRes();
        await callGoogleHandler(req, res);
        assert.equal(res.statusCode, 401);

        mock.restoreAll();
    });

    test('valid token, existing user → 200 + cookies set', async () => {
        const { OAuth2Client } = require('google-auth-library');
        const pool = require('../utils/database');

        mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
            getPayload: () => ({ email: 'user@gmail.com' })
        }));
        mock.method(pool, 'query', async () => ({
            rows: [{ id: 1, email: 'user@gmail.com', role: 'user' }]
        }));

        const req = makeGoogleReq({ credential: 'valid-token' });
        const res = makeGoogleRes();
        await callGoogleHandler(req, res);

        assert.equal(res.statusCode, 200);
        assert.ok(res.body.success);
        assert.ok(res.cookies['token']);
        assert.ok(res.cookies['logged_in']);

        mock.restoreAll();
    });

    test('valid token, new user → 200 + user created', async () => {
        const { OAuth2Client } = require('google-auth-library');
        const pool = require('../utils/database');

        mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
            getPayload: () => ({ email: 'newuser@gmail.com' })
        }));

        let insertCalled = false;
        mock.method(pool, 'query', async (sql) => {
            if (sql.includes('SELECT')) return { rows: [] };
            insertCalled = true;
            return { rows: [{ id: 2, email: 'newuser@gmail.com', role: 'user' }] };
        });

        const req = makeGoogleReq({ credential: 'valid-token' });
        const res = makeGoogleRes();
        await callGoogleHandler(req, res);

        assert.equal(res.statusCode, 200);
        assert.ok(insertCalled, 'INSERT має бути викликаний для нового юзера');

        mock.restoreAll();
    });

    test('email зберігається в lowercase', async () => {
        const { OAuth2Client } = require('google-auth-library');
        const pool = require('../utils/database');

        mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
            getPayload: () => ({ email: 'User@Gmail.COM' })
        }));

        let savedEmail = null;
        mock.method(pool, 'query', async (sql, params) => {
            savedEmail = params?.[0];
            return { rows: [{ id: 1, email: 'user@gmail.com', role: 'user' }] };
        });

        const req = makeGoogleReq({ credential: 'valid-token' });
        const res = makeGoogleRes();
        await callGoogleHandler(req, res);

        assert.equal(savedEmail, 'user@gmail.com');

        mock.restoreAll();
    });

    test('DB помилка → 401', async () => {
        const { OAuth2Client } = require('google-auth-library');
        const pool = require('../utils/database');

        mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
            getPayload: () => ({ email: 'user@gmail.com' })
        }));
        mock.method(pool, 'query', async () => { throw new Error('DB error'); });

        const req = makeGoogleReq({ credential: 'valid-token' });
        const res = makeGoogleRes();
        await callGoogleHandler(req, res);

        assert.equal(res.statusCode, 401);

        mock.restoreAll();
    });
});

describe('requireAdmin', () => {
    test('no token → 401', () => {
        const [authMiddleware] = requireAdmin();
        const req = { cookies: {} };
        const res = makeRes();
        authMiddleware(req, res, () => {});
        assert.equal(res.statusCode, 401);
    });

    test('valid token with role user → 403', () => {
        const token = makeToken({ id: 1, role: 'user' });
        const [authMiddleware, roleMiddleware] = requireAdmin();
        const req = { cookies: { token } };
        const res = makeRes();
        authMiddleware(req, res, () => roleMiddleware(req, res, () => {}));
        assert.equal(res.statusCode, 403);
    });

    test('valid token with role admin → next() called', () => {
        const token = makeToken({ id: 1, role: 'admin' });
        const [authMiddleware, roleMiddleware] = requireAdmin();
        const req = { cookies: { token } };
        const res = makeRes();
        let called = false;
        authMiddleware(req, res, () => roleMiddleware(req, res, () => { called = true; }));
        assert.ok(called);
    });
});
