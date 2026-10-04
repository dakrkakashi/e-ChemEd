/**
 * app.js — Express Application Factory for e-chemEd
 * 
 * Shared across both local Node server and Vercel serverless functions.
 */

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const attendanceRoutes = require('./routes/attendance');
const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const { attachUser } = require('./middleware/auth');
const { dbEngine } = require('./db');

const app = express();
const FRONTEND_PORT = String(process.env.FRONTEND_PORT || '3000');

// Trust proxy configuration (essential for Vercel, reverse proxies, and rate limiters)
if (process.env.TRUST_PROXY !== undefined) {
  const tp = String(process.env.TRUST_PROXY).trim();
  if (tp === 'true' || tp === '1') {
    app.set('trust proxy', 1);
  } else if (tp === 'false' || tp === '0') {
    app.set('trust proxy', false);
  } else if (!isNaN(Number(tp))) {
    app.set('trust proxy', Number(tp));
  } else if (tp) {
    app.set('trust proxy', tp);
  }
} else if (process.env.VERCEL) {
  app.set('trust proxy', 1);
}

// LAN IP / Localhost detection
const isLanIp = (host) => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
};

const customOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) or file:// origin: null
    if (!origin || origin === 'null') {
      return callback(null, true);
    }

    try {
      const parsed = new URL(origin);
      const host = parsed.hostname;
      const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');

      // 1. Check if connecting from frontend port on localhost or LAN
      if (port === FRONTEND_PORT && isLanIp(host)) {
        return callback(null, true);
      }

      // 2. Allow Vercel preview and production domains
      if (host.endsWith('.vercel.app') || (process.env.VERCEL_URL && host === process.env.VERCEL_URL)) {
        return callback(null, true);
      }

      // 3. Allow same-origin requests
      if (process.env.VERCEL) {
        return callback(null, true);
      }

      // 4. Check explicit allowed origins from environment
      if (customOrigins.includes(origin)) {
        return callback(null, true);
      }
    } catch (e) {
      // Invalid URL format
    }

    callback(new Error(`CORS policy rejection: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-key', 'x-session-code', 'Authorization', 'x-session-token']
};

app.use(cors(corsOptions));

// JSON Body Parser with malformed JSON protection
app.use(express.json({ limit: '100kb' }));

// Attach user from session if present
app.use(attachUser);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: 'Malformed JSON payload in request body.'
    });
  }
  next(err);
});

// Mount Routes under /api
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', progressRoutes);
app.use('/api', attendanceRoutes);

// Fallback mounting at root (supports serverless environments where /api prefix may be rewritten)
app.use('/', healthRoutes);
app.use('/', authRoutes);
app.use('/', progressRoutes);
app.use('/', attendanceRoutes);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    ok: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS policy rejection')) {
    return res.status(403).json({
      ok: false,
      error: err.message
    });
  }
  console.error('[UNHANDLED SERVER ERROR]', err.message);
  res.status(500).json({
    ok: false,
    error: 'Internal server error.'
  });
});

module.exports = app;
