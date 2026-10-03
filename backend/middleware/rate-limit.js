/**
 * rate-limit.js — In-Memory Sliding-Window Rate Limiter
 * 
 * Limits submissions to 60 requests per minute per client IP.
 * Cleans up expired IP windows automatically to avoid memory leaks.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per IP

const requestHistory = new Map();

// Periodic cleanup of stale tracking entries every 2 minutes
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

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const timestamps = requestHistory.get(ip) || [];
  const recent = timestamps.filter(t => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
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

module.exports = {
  rateLimit
};
