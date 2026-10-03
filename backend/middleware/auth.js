/**
 * auth.js — Admin Authentication Middleware using timingSafeEqual
 * 
 * Verifies x-admin-key header against process.env.ADMIN_KEY.
 * Strictly prevents timing attacks and never logs sensitive credentials.
 */

const crypto = require('crypto');

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

function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || adminKey === 'change_this_to_a_secure_random_key_min_32_chars') {
    return res.status(500).json({
      ok: false,
      error: 'Server misconfiguration: ADMIN_KEY has not been configured in backend environment.'
    });
  }

  const providedKey = req.headers['x-admin-key'];

  if (!providedKey || !timingSafeCompare(String(providedKey), String(adminKey))) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: valid x-admin-key header required.'
    });
  }

  next();
}

module.exports = {
  requireAdmin,
  timingSafeCompare
};
