/**
 * rate-limit.js — In-Memory Sliding-Window Rate Limiters
 * 
 * Provides:
 * 1. rateLimit: Limits submissions to 60 requests per minute per client IP.
 * 2. loginRateLimit: Brute-force protection for /api/auth/login (max 10 failed attempts per IP / 5 min).
 * Cleans up expired IP windows automatically with unref'd intervals to avoid memory leaks.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per IP

const requestHistory = new Map();

// Periodic cleanup of stale submission tracking entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestHistory.entries()) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) {
      requestHistory.delete(ip);
    } else {
      requestHistory.set(ip, valid);
    }
  }
}, 2 * WINDOW_MS).unref();

function getClientIp(req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
}

function rateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();

  const timestamps = requestHistory.get(ip) || [];
  const recent = timestamps.filter(t => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      ok: false,
      error: 'Too many submissions from this device. Please wait a moment before trying again.'
    });
  }

  recent.push(now);
  requestHistory.set(ip, recent);
  next();
}

// -------------------------------------------------------------
// Auth Brute-Force Rate Limiter (Max 10 failed logins per 5 min)
// -------------------------------------------------------------
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_LOGINS = 10; // 10 failed login attempts per IP

const loginFailureHistory = new Map();

// Periodic cleanup of stale login failure tracking entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of loginFailureHistory.entries()) {
    const valid = timestamps.filter(t => now - t < LOGIN_WINDOW_MS);
    if (valid.length === 0) {
      loginFailureHistory.delete(ip);
    } else {
      loginFailureHistory.set(ip, valid);
    }
  }
}, LOGIN_WINDOW_MS).unref();

function loginRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();

  const timestamps = loginFailureHistory.get(ip) || [];
  const recent = timestamps.filter(t => now - t < LOGIN_WINDOW_MS);

  if (recent.length >= MAX_FAILED_LOGINS) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((LOGIN_WINDOW_MS - (now - oldest)) / 1000));
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      ok: false,
      error: 'Too many login attempts. Please try again later.'
    });
  }

  // Intercept response finish event to track failed attempts (401) or clear on success (2xx)
  res.on('finish', () => {
    if (res.statusCode === 401) {
      const current = loginFailureHistory.get(ip) || [];
      const updated = current.filter(t => Date.now() - t < LOGIN_WINDOW_MS);
      updated.push(Date.now());
      loginFailureHistory.set(ip, updated);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      loginFailureHistory.delete(ip);
    }
  });

  next();
}

function resetRateLimits() {
  requestHistory.clear();
  loginFailureHistory.clear();
}

module.exports = {
  rateLimit,
  loginRateLimit,
  resetRateLimits
};
