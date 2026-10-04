/**
 * serve-frontend.js — Static HTTP Server & Route Guard for e-chemEd Frontend
 * 
 * Features:
 * - Serves exclusively from the frontend/ directory
 * - Blocks ../ directory traversal attacks
 * - Disallows directory listings
 * - Full HTTP 206 Range request support (essential for video seeking & MP4 streaming)
 * - Dynamic /config.json endpoint reporting backend port
 * - Transparent /api/ reverse-proxy to backend Express service
 * - Server-side route protection: redirects unauthenticated requests for protected HTML pages to /pages/login.html
 * - Binds to 0.0.0.0 for seamless Wi-Fi LAN access
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.FRONTEND_PORT || '3000', 10);
const BACKEND_PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

// Load database session validator
let getSession;
try {
  const dbModule = require('../backend/db');
  getSession = dbModule.getSession;
} catch (e) {
  console.warn('[FRONTEND SERVER] Note: backend/db will be loaded lazily if needed.');
}

async function checkValidSession(token) {
  if (!token) return false;
  try {
    if (!getSession) {
      getSession = require('../backend/db').getSession;
    }
    const session = await getSession(token);
    return Boolean(session && session.user);
  } catch (err) {
    return false;
  }
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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, x-session-token, x-admin-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const rawUrl = req.url || '/';
  const urlPath = decodeURI(rawUrl.split('?')[0]);

  // Transparent /api/ reverse proxy to backend
  if (urlPath.startsWith('/api/')) {
    const proxyHeaders = { ...req.headers };
    proxyHeaders.host = `127.0.0.1:${BACKEND_PORT}`;
    const clientIp = req.socket.remoteAddress;
    if (clientIp) {
      proxyHeaders['x-forwarded-for'] = req.headers['x-forwarded-for'] 
        ? `${req.headers['x-forwarded-for']}, ${clientIp}`
        : clientIp;
    }

    const proxyReq = http.request({
      host: '127.0.0.1',
      port: BACKEND_PORT,
      path: rawUrl,
      method: req.method,
      headers: proxyHeaders
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Backend API service is currently unavailable.' }));
    });

    req.pipe(proxyReq);
    return;
  }

  // Convenient alias: /login -> /pages/login.html
  if (urlPath === '/login' || urlPath === '/login.html') {
    res.writeHead(302, { 'Location': '/pages/login.html', 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  // Special Route: /config.json provides dynamic runtime configuration to frontend
  if (urlPath === '/config.json') {
    const configData = JSON.stringify({
      backendPort: BACKEND_PORT,
      frontendPort: PORT,
      timestamp: new Date().toISOString()
    });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(configData),
      'Cache-Control': 'no-cache'
    });
    res.end(configData);
    return;
  }

  // Normalize path and resolve within FRONTEND_DIR
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\' || safePath === '.') {
    safePath = '/index.html';
  }

  const targetPath = path.resolve(FRONTEND_DIR, '.' + safePath);

  // Security: Block directory traversal outside FRONTEND_DIR
  if (!targetPath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Directory traversal blocked.');
    return;
  }

  let finalPath = targetPath;

  // Handle directory requests: look for index.html; NEVER list directory
  if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
    const indexPath = path.join(finalPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      finalPath = indexPath;
    } else {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden: Directory listing disabled.');
      return;
    }
  }

  if (!fs.existsSync(finalPath) || !fs.statSync(finalPath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: The requested static resource does not exist.');
    return;
  }

  const ext = path.extname(finalPath).toLowerCase();

  // Route Protection for HTML pages
  if (ext === '.html') {
    const isLoginPage = finalPath.replace(/\\/g, '/').endsWith('/pages/login.html');
    if (!isLoginPage) {
      // Check session cookie or authorization header
      const cookies = parseCookies(req.headers['cookie']);
      let token = cookies.echemed_session || cookies.echemed_token;

      if (!token && req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
        token = req.headers['authorization'].slice(7).trim();
      }

      if (!token && req.headers['x-session-token']) {
        token = req.headers['x-session-token'];
      }

      const isAuthenticated = await checkValidSession(token);

      if (!isAuthenticated) {
        const redirectParam = encodeURIComponent(urlPath);
        res.writeHead(302, {
          'Location': `/pages/login.html?redirect=${redirectParam}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'text/html; charset=utf-8'
        });
        res.end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/pages/login.html?redirect=${redirectParam}"></head><body>Redirecting to login...</body></html>`);
        return;
      }
    }
  }

  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(finalPath);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  // Handle HTTP 206 Partial Content (Range requests)
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`,
        'Content-Type': 'text/plain'
      });
      res.end('416 Requested Range Not Satisfiable');
      return;
    }

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(finalPath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType
    });

    fileStream.pipe(res);
  } else {
    // Normal 200 OK stream
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': ext === '.html' ? 'no-cache, must-revalidate' : 'public, max-age=3600'
    });

    fs.createReadStream(finalPath).pipe(res);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[PORT CONFLICT] Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error('[FRONTEND SERVER ERROR]', err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`e-chemEd Frontend server listening on 0.0.0.0:${PORT}`);
  console.log(`Serving files strictly from: ${FRONTEND_DIR}`);
  console.log(`Protected routes enforced: Unauthenticated HTML requests redirect to /pages/login.html`);
  console.log(`=================================================`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

module.exports = server;
