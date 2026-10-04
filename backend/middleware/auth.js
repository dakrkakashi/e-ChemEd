/**
 * auth.js — Authentication & Role Authorization Middleware
 * 
 * Supports:
 * - Session cookies ('echemed_session')
 * - Authorization Bearer tokens
 * - 'x-session-token' header
 * - Legacy timing-safe 'x-admin-key' header verification (backwards compatible)
 */

const crypto = require('crypto');
const { getSession } = require('../db');

function timingSafeCompare(providedKey, realKey) {
  if (typeof providedKey !== 'string' || typeof realKey !== 'string') {
    return false;
  }
  const bufProvided = Buffer.from(providedKey);
  const bufReal = Buffer.from(realKey);

  if (bufProvided.length !== bufReal.length) {
    // Execute timingSafeEqual against dummy buffer of identical length to neutralize timing leaks
    const dummy = Buffer.alloc(bufReal.length);
    crypto.timingSafeEqual(bufReal, dummy);
    return false;
  }

  return crypto.timingSafeEqual(bufProvided, bufReal);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx !== -1) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch (e) {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

/**
 * Extracts session token from Cookie, Authorization header, or x-session-token
 */
function extractToken(req) {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  // 2. Custom header x-session-token
  const sessionHeader = req.headers['x-session-token'];
  if (sessionHeader && typeof sessionHeader === 'string' && sessionHeader.trim()) {
    return sessionHeader.trim();
  }

  // 3. Cookie echemed_session
  const cookies = req.cookies || parseCookies(req.headers['cookie']);
  if (cookies && cookies.echemed_session) {
    return cookies.echemed_session;
  }

  return null;
}

/**
 * Attaches user to req if valid session exists
 */
async function attachUser(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const session = await getSession(token);
      if (session) {
        req.user = session.user;
        req.sessionToken = token;
      }
    }
  } catch (err) {
    // Fail quietly in optional attachment
  }
  next();
}

/**
 * Enforce that user is authenticated
 */
async function requireAuth(req, res, next) {
  try {
    if (!req.user) {
      // Attempt lazy resolution if attachUser was skipped
      const token = extractToken(req);
      if (token) {
        const session = await getSession(token);
        if (session) {
          req.user = session.user;
          req.sessionToken = token;
        }
      }
    }

    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required. Please sign in to continue.'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Enforce admin privileges: accepts valid session with role === 'admin'
 * OR legacy valid x-admin-key header
 */
async function requireAdmin(req, res, next) {
  try {
    // Check session first
    if (!req.user) {
      const token = extractToken(req);
      if (token) {
        const session = await getSession(token);
        if (session) {
          req.user = session.user;
          req.sessionToken = token;
        }
      }
    }

    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Fallback to legacy x-admin-key header
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];

    if (adminKey && adminKey !== 'change_this_to_a_secure_random_key_min_32_chars') {
      if (providedKey && timingSafeCompare(String(providedKey), String(adminKey))) {
        return next();
      }
    }

    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Forbidden: Faculty Administrator privileges required.'
      });
    }

    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: valid x-admin-key header required.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  timingSafeCompare,
  parseCookies,
  extractToken,
  attachUser,
  requireAuth,
  requireAdmin
};
