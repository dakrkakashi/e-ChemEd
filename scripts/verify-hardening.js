/**
 * verify-hardening.js — Comprehensive Hardening & Verification Suite
 * 
 * Verifies:
 * 1. HTTP Security Headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * 2. Brute-Force Rate Limiting on /api/auth/login
 * 3. All 12 HTML pages have valid PWA Manifest links
 * 4. Offline status indicator implementation & CSS tokens
 * 5. SQL injection payloads safely rejected with 400 and clean envelope
 * 6. Uniform JSON error envelope across bad requests and 404s
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../backend/app');
const { resetRateLimits } = require('../backend/middleware/rate-limit');

let server;
let port;
let baseUrl;

function startTestServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

function request(method, pathUrl, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, baseUrl);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body !== null && typeof body === 'object') {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    } else if (typeof body === 'string') {
      postData = body;
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runHardeningSuite() {
  console.log('======================================================================');
  console.log('          e-chemEd PLATFORM HARDENING VERIFICATION SUITE              ');
  console.log('======================================================================\n');

  await startTestServer();
  resetRateLimits();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------
    // TEST 1: HTTP Security Headers
    // -------------------------------------------------------------------
    console.log('--- TEST 1: HTTP SECURITY HEADERS ---');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'Health endpoint responds with 200 OK');
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options is SAMEORIGIN');
    assert(healthRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Referrer-Policy is strict-origin-when-cross-origin');
    assert(healthRes.headers['permissions-policy'] && healthRes.headers['permissions-policy'].includes('camera=()'), 'Permissions-Policy is set');
    assert(healthRes.headers['x-xss-protection'] === '1; mode=block', 'X-XSS-Protection is 1; mode=block');

    // -------------------------------------------------------------------
    // TEST 2: Brute-Force Rate Limiting on Login
    // -------------------------------------------------------------------
    console.log('\n--- TEST 2: AUTH LOGIN BRUTE-FORCE RATE LIMITING ---');
    resetRateLimits();
    let rateLimitedTriggered = false;
    for (let i = 1; i <= 11; i++) {
      const res = await request('POST', '/api/auth/login', {}, { username: 'test_brute', password: 'wrongpassword' });
      if (res.status === 429) {
        rateLimitedTriggered = true;
        assert(res.json && res.json.ok === false, '429 response conforms to { ok: false } envelope');
        assert(res.json && res.json.error.includes('Too many login attempts'), '429 error message is user-friendly');
        assert(res.headers['retry-after'] !== undefined, 'Retry-After header present on 429 response');
        break;
      }
    }
    assert(rateLimitedTriggered, '11th failed login attempt successfully throttled with HTTP 429');

    // -------------------------------------------------------------------
    // TEST 3: PWA Manifest Links in all HTML views
    // -------------------------------------------------------------------
    console.log('\n--- TEST 3: PWA MANIFEST LINK COMPLETENESS ---');
    const htmlFiles = [
      'frontend/index.html',
      'frontend/pages/admin.html',
      'frontend/pages/attendance.html',
      'frontend/pages/games.html',
      'frontend/pages/mind-maps.html',
      'frontend/pages/question-bank.html',
      'frontend/pages/quizzes.html',
      'frontend/pages/unit.html',
      'frontend/pages/video-lectures.html',
      'frontend/games/periodic-table.html',
      'frontend/games/unit1-puzzle.html',
      'frontend/games/unit2-arcade.html'
    ];

    let allManifestsPresent = true;
    for (const file of htmlFiles) {
      const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
      const hasManifest = content.includes('rel="manifest"') || content.includes("rel='manifest'");
      if (!hasManifest) {
        allManifestsPresent = false;
        console.error(`Missing manifest link in ${file}`);
      }
    }
    assert(allManifestsPresent, 'All 12 HTML pages contain valid PWA manifest links');

    // -------------------------------------------------------------------
    // TEST 4: Offline Status Indicator Code & CSS
    // -------------------------------------------------------------------
    console.log('\n--- TEST 4: OFFLINE STATUS INDICATOR ---');
    const mainJs = fs.readFileSync(path.resolve(__dirname, '..', 'frontend/assets/js/main.js'), 'utf8');
    const componentsCss = fs.readFileSync(path.resolve(__dirname, '..', 'frontend/assets/css/components.css'), 'utf8');

    assert(mainJs.includes('setupOfflineIndicator'), 'main.js defines setupOfflineIndicator()');
    assert(mainJs.includes("addEventListener('offline'"), 'main.js binds offline event listener');
    assert(mainJs.includes("addEventListener('online'"), 'main.js binds online event listener');
    assert(componentsCss.includes('.offline-indicator-banner'), 'components.css styles .offline-indicator-banner');

    // -------------------------------------------------------------------
    // TEST 5: SQL Injection Rejection
    // -------------------------------------------------------------------
    console.log('\n--- TEST 5: SQL INJECTION DEFENSE & INPUT SANITIZATION ---');
    const sqliAttendance = await request('POST', '/api/attendance', {}, {
      name: "Student'; DROP TABLE attendance; --",
      prn: "' OR '1'='1",
      rollNo: "101; SELECT * FROM users",
      division: "A (Computer)",
      unit: "Unit 1: Water Processing and Environmental Sustainability",
      session: "Lecture",
      date: "2026-10-04"
    });
    assert(sqliAttendance.status === 400, 'Malicious PRN injection cleanly rejected with 400 Bad Request');
    assert(sqliAttendance.json && sqliAttendance.json.ok === false, 'Error response envelope is valid JSON');
    assert(!sqliAttendance.body.includes('syntax error') && !sqliAttendance.body.includes('SQLite'), 'No raw database error leaked');

    // -------------------------------------------------------------------
    // TEST 6: Standard Error Envelopes on Malformed Input and 404
    // -------------------------------------------------------------------
    console.log('\n--- TEST 6: UNIFORM ERROR ENVELOPE CONSISTENCY ---');
    const notFound = await request('GET', '/api/nonexistent-route-endpoint');
    assert(notFound.status === 404, 'Unknown API route returns 404');
    assert(notFound.json && notFound.json.ok === false && typeof notFound.json.error === 'string', '404 conforms to { ok: false, error: ... }');

    const malformed = await request('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, '{ bad json payload');
    assert(malformed.status === 400, 'Malformed JSON returns 400 Bad Request');
    assert(malformed.json && malformed.json.ok === false, 'Malformed JSON returns { ok: false, error: ... }');

    console.log('\n======================================================================');
    if (failed === 0) {
      console.log(`         ALL ${passed} HARDENING CHECKS PASSED PERFECTLY (100% SUCCESS)         `);
    } else {
      console.error(`         ${failed} CHECKS FAILED (${passed} passed)`);
    }
    console.log('======================================================================\n');
  } finally {
    await stopTestServer();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningSuite().catch((err) => {
  console.error('[HARDENING SUITE ERROR]:', err);
  process.exit(1);
});

