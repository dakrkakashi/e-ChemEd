/**
 * server.js — e-chemEd Express API Server
 * 
 * Binds to 0.0.0.0 so students on the same Wi-Fi can submit attendance.
 * Provides health check, rate-limited attendance submission, and faculty admin endpoints.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration from backend/.env if present
dotenv.config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const attendanceRoutes = require('./routes/attendance');
const { dbEngine } = require('./db');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_PORT = String(process.env.FRONTEND_PORT || '3000');

// Trust proxy configuration (supports boolean, hop count, or subnet/IP strings)
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
}

// Dynamic CORS configuration allowing localhost and LAN IP on frontend port
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

      // Check if connecting from frontend port on localhost or LAN
      if (port === FRONTEND_PORT && isLanIp(host)) {
        return callback(null, true);
      }

      // Check explicit allowed origins from environment
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
  allowedHeaders: ['Content-Type', 'x-admin-key', 'x-session-code']
};

app.use(cors(corsOptions));

// JSON Body Parser with malformed JSON protection
app.use(express.json({ limit: '100kb' }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: 'Malformed JSON payload in request body.'
    });
  }
  next(err);
});

// Mount Routes
app.use('/api', healthRoutes);
app.use('/api', attendanceRoutes);

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

// Start listening on all network interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`e-chemEd Backend running on http://0.0.0.0:${PORT}`);
  console.log(`Database Engine: ${dbEngine} (echemed.db)`);
  console.log(`Allowing frontend requests from port ${FRONTEND_PORT}`);
  console.log(`=================================================`);
});

// Process signal handling for clean exit
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

app.server = server;
app.close = function (cb) {
  return server.close(cb);
};

module.exports = app;
