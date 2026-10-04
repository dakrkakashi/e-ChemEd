/**
 * test-session-persistence.js — Comprehensive Session Persistence & Navigation Suite
 * 
 * Verifies:
 * 1. Session creation via /api/auth/login through frontend proxy
 * 2. Cross-section document navigation across all protected pages (200 OK, no 302 redirects)
 * 3. Deep-link direct document requests with cookie
 * 4. Dual-header fallback (Authorization Bearer & x-session-token)
 * 5. Strict role boundaries: Student (403 on admin endpoints) vs Admin (200 OK)
 * 6. Explicit logout terminates session in DB and invalidates cookies
 * 7. Post-logout route protection redirects unauthenticated requests (302)
 */

const http = require('http');
const path = require('path');
const { getSession, seedDefaultUsers } = require('../backend/db');

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 3001;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });
    req.on('error', reject);
    if (body) {
      if (typeof body === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

function parseCookieFromHeaders(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookieList = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookieList) {
    const match = c.match(/echemed_session=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

async function runSessionPersistenceTests() {
  console.log('======================================================================');
  console.log('       e-chemEd PERSISTENT AUTHENTICATION & NAVIGATION REGRESSION     ');
  console.log('======================================================================\n');

  await seedDefaultUsers();

  // Ensure servers are running
  let isAlive = false;
  try {
    const probe = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/health', method: 'GET' });
    if (probe && probe.statusCode === 200) isAlive = true;
  } catch (e) {}

  if (!isAlive) {
    console.log('[INFO] Spawning servers for test execution...');
    require('../backend/server.js');
    require('./serve-frontend.js');
    await new Promise(r => setTimeout(r, 800));
  } else {
    console.log('[INFO] Verified active backend and frontend instances.');
  }

  // TEST 1: Login through frontend reverse proxy (port 3000 -> 3001)
  console.log('\n--- TEST 1: PROXIED LOGIN & COOKIE ISSUANCE ---');
  const studentLoginRes = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'student', password: 'student123' });

  console.log(`POST /api/auth/login via port ${FRONTEND_PORT} -> Status: ${studentLoginRes.statusCode}`);
  if (studentLoginRes.statusCode !== 200 || !studentLoginRes.json?.ok) {
    throw new Error('Test 1 failed: Proxied student login failed!');
  }

  const studentToken = studentLoginRes.json.token;
  const studentCookie = parseCookieFromHeaders(studentLoginRes.headers);
  console.log(`Received token: ${studentToken.slice(0, 16)}... | Cookie attached: ${Boolean(studentCookie)}`);

  if (!studentCookie) {
    throw new Error('Test 1 failed: Set-Cookie echemed_session was not forwarded by the frontend proxy!');
  }

  const cookieHeader = `echemed_session=${studentCookie}`;
  console.log('[PASS] Test 1: Proxied login successfully set session cookie on frontend port.');

  // TEST 2: Cross-Section Navigation across ALL protected sections
  console.log('\n--- TEST 2: CROSS-SECTION NAVIGATION WITH PERSISTENT SESSION ---');
  const protectedPages = [
    '/index.html',
    '/pages/mind-maps.html',
    '/pages/quizzes.html',
    '/pages/question-bank.html',
    '/pages/video-lectures.html',
    '/pages/attendance.html',
    '/pages/games.html',
    '/pages/unit.html?u=1',
    '/pages/admin.html',
    '/games/periodic-table.html',
    '/games/unit1-puzzle.html',
    '/games/unit2-arcade.html'
  ];

  for (const pagePath of protectedPages) {
    const res = await request({
      host: '127.0.0.1',
      port: FRONTEND_PORT,
      path: pagePath,
      method: 'GET',
      headers: { 'Cookie': cookieHeader }
    });

    console.log(`Navigating to ${pagePath} -> Status: ${res.statusCode}`);
    if (res.statusCode !== 200) {
      throw new Error(`Test 2 failed: Navigation to ${pagePath} failed with status ${res.statusCode} (expected 200 OK)`);
    }
  }
  console.log('[PASS] Test 2: All 12 protected pages accessible with session cookie (zero login bounces).');

  // TEST 3: Header Fallback Authorization (Bearer and x-session-token)
  console.log('\n--- TEST 3: HEADER-BASED AUTHENTICATION FALLBACK ---');
  // 3a. Authorization: Bearer
  const bearerRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`GET /api/auth/me (Authorization: Bearer) -> Status: ${bearerRes.statusCode}, User: ${bearerRes.json?.user?.name}`);
  if (bearerRes.statusCode !== 200 || bearerRes.json?.user?.username !== 'student') {
    throw new Error('Test 3a failed: Bearer header authorization failed!');
  }

  // 3b. x-session-token header
  const customHeaderRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'x-session-token': studentToken }
  });
  console.log(`GET /api/auth/me (x-session-token) -> Status: ${customHeaderRes.statusCode}, User: ${customHeaderRes.json?.user?.name}`);
  if (customHeaderRes.statusCode !== 200 || customHeaderRes.json?.user?.username !== 'student') {
    throw new Error('Test 3b failed: x-session-token header authorization failed!');
  }
  console.log('[PASS] Test 3: Redundant header authentication verified.');

  // TEST 4: Strict Role Boundaries (Student vs Faculty Admin)
  console.log('\n--- TEST 4: ROLE ACCESS CONTROL & SECURITY BOUNDARIES ---');
  // Student must be blocked from admin roster
  const studentBlocked = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'Cookie': cookieHeader }
  });
  console.log(`Student accessing GET /api/attendance -> Status: ${studentBlocked.statusCode} (Expected 403 Forbidden)`);
  if (studentBlocked.statusCode !== 403) {
    throw new Error('Test 4 failed: Student account was not forbidden from faculty roster!');
  }

  // Admin login and access
  const adminLoginRes = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'admin', password: 'admin123' });
  const adminCookie = parseCookieFromHeaders(adminLoginRes.headers);
  const adminToken = adminLoginRes.json.token;

  const adminAccess = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'Cookie': `echemed_session=${adminCookie}` }
  });
  console.log(`Admin accessing GET /api/attendance -> Status: ${adminAccess.statusCode} (Expected 200 OK)`);
  if (adminAccess.statusCode !== 200 || !adminAccess.json?.ok) {
    throw new Error('Test 4 failed: Faculty admin session failed to access attendance roster!');
  }
  console.log('[PASS] Test 4: Role-based authorization boundaries strictly preserved.');

  // TEST 5: Explicit Logout and Invalidation
  console.log('\n--- TEST 5: EXPLICIT LOGOUT & IMMEDIATE SESSION TERMINATION ---');
  const logoutRes = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Cookie': cookieHeader }
  });
  console.log(`POST /api/auth/logout -> Status: ${logoutRes.statusCode}`);
  if (logoutRes.statusCode !== 200) {
    throw new Error('Test 5 failed: Logout request failed!');
  }

  // Verify DB session is purged
  const dbSession = await getSession(studentToken);
  console.log(`Direct DB Session lookup for student token: ${dbSession ? 'ACTIVE (Error)' : 'PURGED (Success)'}`);
  if (dbSession !== null) {
    throw new Error('Test 5 failed: Session record was not deleted from database!');
  }

  // Subsequent check should return 401
  const meAfterLogout = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Cookie': cookieHeader }
  });
  console.log(`GET /api/auth/me after logout -> Status: ${meAfterLogout.statusCode} (Expected 401)`);
  if (meAfterLogout.statusCode !== 401) {
    throw new Error('Test 5 failed: Terminated session was not rejected with 401!');
  }

  // Subsequent page request must redirect to login
  const pageAfterLogout = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/pages/attendance.html',
    method: 'GET',
    headers: { 'Cookie': cookieHeader }
  });
  console.log(`GET /pages/attendance.html after logout -> Status: ${pageAfterLogout.statusCode}, Location: ${pageAfterLogout.headers.location}`);
  if (pageAfterLogout.statusCode !== 302 || !pageAfterLogout.headers.location.includes('/pages/login.html')) {
    throw new Error('Test 5 failed: Terminated session was not redirected to /pages/login.html!');
  }
  console.log('[PASS] Test 5: Explicit logout immediately terminates session across DB and route guards.');

  console.log('\n======================================================================');
  console.log('       ALL PERSISTENCE & NAVIGATION REGRESSION TESTS PASSED!          ');
  console.log('======================================================================\n');
}

if (require.main === module) {
  runSessionPersistenceTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n[FATAL TEST ERROR]:', err.message);
      process.exit(1);
    });
}

module.exports = { runSessionPersistenceTests };
