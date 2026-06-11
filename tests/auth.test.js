process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { test, describe } = require('node:test');
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
