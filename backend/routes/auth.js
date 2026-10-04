/**
 * auth.js — User Authentication Routes
 * 
 * Provides:
 * - POST /api/auth/login: Authenticates credentials, creates session, sets HttpOnly cookie
 * - POST /api/auth/logout: Terminates session, clears cookie
 * - GET  /api/auth/me: Returns current authenticated user and role
 * - GET  /api/auth/verify: Verifies token validity (for server-to-server or probe checks)
 */

const express = require('express');
const router = express.Router();
const { 
  getUserWithPassword, 
  verifyPassword, 
  createSession, 
  deleteSession, 
  getSession 
} = require('../db');
const { extractToken, requireAuth } = require('../middleware/auth');

function isRequestSecure(req) {
  return Boolean(
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production'
  );
}

/**
 * POST /api/auth/login
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Username is required.'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Password is required.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await getUserWithPassword(cleanUsername);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid username or password.'
      });
    }

    const valid = verifyPassword(password, user.salt, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid username or password.'
      });
    }

    // Create session (valid for 7 days)
    const session = await createSession(user.id, 7);

    // Set HTTP-only session cookie (add Secure flag in HTTPS / production environments)
    const maxAge = 7 * 24 * 60 * 60;
    const secureFlag = isRequestSecure(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `echemed_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`
    ]);

    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      roll_no: user.roll_no,
      division: user.division,
      prn: user.prn
    };

    return res.status(200).json({
      ok: true,
      message: 'Authentication successful.',
      user: safeUser,
      token: session.token
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'An internal authentication error occurred.'
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/auth/logout', async (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      await deleteSession(token);
    }

    // Clear cookie
    const secureFlag = isRequestSecure(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `echemed_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`
    ]);

    return res.status(200).json({
      ok: true,
      message: 'Signed out successfully.'
    });
  } catch (err) {
    console.error('[AUTH LOGOUT ERROR]:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'An internal error occurred during sign out.'
    });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/auth/me', requireAuth, (req, res) => {
  return res.status(200).json({
    ok: true,
    user: req.user
  });
});

/**
 * GET /api/auth/verify
 * Fast token validity checker
 */
router.get('/auth/verify', async (req, res) => {
  try {
    const token = req.query.token || extractToken(req);
    if (!token) {
      return res.status(200).json({ ok: true, valid: false });
    }

    const session = await getSession(token);
    if (!session) {
      return res.status(200).json({ ok: true, valid: false });
    }

    return res.status(200).json({
      ok: true,
      valid: true,
      user: session.user
    });
  } catch (err) {
    return res.status(200).json({ ok: true, valid: false });
  }
});

module.exports = router;
