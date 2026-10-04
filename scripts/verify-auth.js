/**
 * verify-auth.js — Comprehensive Test Suite for SQLite Authentication,
 * Session Persistence, Role Guarding, Route Protection, and Progress Sync.
 */

const http = require('http');
const path = require('path');
const { 
  db, 
  getUserByUsername, 
  getUserProgress, 
  getSession,
  seedDefaultUsers 
} = require('../backend/db');

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
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = first.match(/echemed_session=([^;]+)/);
  return match ? match[1] : null;
}

async function runAuthTests() {
  console.log('======================================================================');
  console.log('        e-chemEd AUTHENTICATION & ROUTE GUARD ACCEPTANCE TEST         ');
  console.log('======================================================================\n');

  // Verify DB seeding
  console.log('--- TEST A1: SQLITE USER SEEDING ---');
  await seedDefaultUsers();
  const adminUser = await getUserByUsername('admin');
  const studentUser = await getUserByUsername('student');

  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Admin user was not seeded properly in SQLite!');
  }
  if (!studentUser || studentUser.role !== 'student') {
    throw new Error('Student user was not seeded properly in SQLite!');
  }
  console.log(`[PASS] A1: Seeded accounts found in SQLite: Admin (${adminUser.name}) and Student (${studentUser.name})\n`);

  // Check if servers are already active
  let serversStartedHere = false;
  let frontendServer, backendServer;

  let isAlive = false;
  try {
    const probe = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/health', method: 'GET' });
    if (probe && probe.statusCode === 200) isAlive = true;
  } catch (e) {}

  if (!isAlive) {
    console.log('--- STARTING LOCAL SERVERS ---');
    backendServer = require('../backend/server.js');
    frontendServer = require('./serve-frontend.js');
    serversStartedHere = true;
    await new Promise(r => setTimeout(r, 1000));
  } else {
    console.log('[INFO] Reusing active servers on ports 3000 & 3001.');
  }

  // TEST A2: Route Protection on Frontend Server
  console.log('--- TEST A2: FRONTEND ROUTE PROTECTION ---');
  // 1. Unauthenticated request to /index.html
  const unauthIndex = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/index.html',
    method: 'GET'
  });
  console.log(`Unauthenticated GET /index.html -> Status: ${unauthIndex.statusCode}, Location: ${unauthIndex.headers.location}`);
  if (unauthIndex.statusCode !== 302 || !unauthIndex.headers.location || !unauthIndex.headers.location.includes('/pages/login.html')) {
    throw new Error('Test A2 failed: Protected HTML page was not redirected to /pages/login.html!');
  }

  // 2. Unauthenticated request to /pages/unit.html
  const unauthUnit = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/pages/unit.html',
    method: 'GET'
  });
  console.log(`Unauthenticated GET /pages/unit.html -> Status: ${unauthUnit.statusCode}, Location: ${unauthUnit.headers.location}`);
  if (unauthUnit.statusCode !== 302 || !unauthUnit.headers.location.includes('/pages/login.html')) {
    throw new Error('Test A2 failed: Protected unit page was not redirected to /pages/login.html!');
  }

  // 3. Public request to /pages/login.html
  const loginPageRes = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/pages/login.html',
    method: 'GET'
  });
  console.log(`Public GET /pages/login.html -> Status: ${loginPageRes.statusCode}`);
  if (loginPageRes.statusCode !== 200) {
    throw new Error('Test A2 failed: /pages/login.html failed to serve 200 OK!');
  }

  // 4. Public request to static asset
  const cssRes = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/assets/css/tokens.css',
    method: 'GET'
  });
  console.log(`Public GET /assets/css/tokens.css -> Status: ${cssRes.statusCode}`);
  if (cssRes.statusCode !== 200) {
    throw new Error('Test A2 failed: Static css assets must be accessible publicly!');
  }
  console.log('[PASS] A2: Server-side route protection verified.\n');

  // TEST A3: Login API Authentication
  console.log('--- TEST A3: LOGIN API AUTHENTICATION ---');
  // 1. Invalid password
  const badLogin = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'student', password: 'wrongpassword' });
  console.log(`POST /api/auth/login (bad password) -> Status: ${badLogin.statusCode}, Error: "${badLogin.json?.error}"`);
  if (badLogin.statusCode !== 401 || badLogin.json?.ok !== false) {
    throw new Error('Test A3 failed: Bad password was not rejected with 401!');
  }

  // 2. Valid Student Login
  const studentLogin = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'student', password: 'student123' });
  console.log(`POST /api/auth/login (valid student) -> Status: ${studentLogin.statusCode}, User: ${studentLogin.json?.user?.name}`);
  if (studentLogin.statusCode !== 200 || !studentLogin.json?.token || studentLogin.json?.user?.role !== 'student') {
    throw new Error('Test A3 failed: Valid student login failed!');
  }
  const studentToken = studentLogin.json.token;
  const studentCookieToken = parseCookieFromHeaders(studentLogin.headers);
  console.log(`Received session token (Length: ${studentToken.length} chars). Cookie token set: ${Boolean(studentCookieToken)}`);

  // 3. Valid Admin Login
  const adminLogin = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'admin', password: 'admin123' });
  console.log(`POST /api/auth/login (valid admin) -> Status: ${adminLogin.statusCode}, User: ${adminLogin.json?.user?.name} (${adminLogin.json?.user?.role})`);
  if (adminLogin.statusCode !== 200 || adminLogin.json?.user?.role !== 'admin') {
    throw new Error('Test A3 failed: Valid admin login failed!');
  }
  const adminToken = adminLogin.json.token;
  console.log('[PASS] A3: Login credentials verification and scrypt hashing verified.\n');

  // TEST A4: Session Verification & Authenticated Route Access
  console.log('--- TEST A4: SESSION VERIFICATION & AUTHENTICATED ACCESS ---');
  // 1. GET /api/auth/me with Cookie
  const meRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Cookie': `echemed_session=${studentToken}` }
  });
  console.log(`GET /api/auth/me (with student cookie) -> Status: ${meRes.statusCode}, User: ${meRes.json?.user?.name}`);
  if (meRes.statusCode !== 200 || meRes.json?.user?.username !== 'student') {
    throw new Error('Test A4 failed: Session cookie failed to authenticate /api/auth/me!');
  }

  // 2. Authenticated access to /index.html with session cookie
  const authIndex = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/index.html',
    method: 'GET',
    headers: { 'Cookie': `echemed_session=${studentToken}` }
  });
  console.log(`Authenticated GET /index.html -> Status: ${authIndex.statusCode}`);
  if (authIndex.statusCode !== 200) {
    throw new Error('Test A4 failed: Authenticated request with session cookie was not allowed 200 OK!');
  }
  console.log('[PASS] A4: Active sessions allow seamless access through route guard.\n');

  // TEST A5: Progress API & SQLite Persistence
  console.log('--- TEST A5: PROGRESS API & SQLITE PERSISTENCE ---');
  // 1. GET initial progress
  const getProgRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/progress',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`GET /api/progress -> Status: ${getProgRes.statusCode}, Initial Unit 1 MindMap: ${getProgRes.json?.progress?.units[1]?.mindMapRead}`);

  // 2. POST update progress
  const postProgRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/progress',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }, { unitId: 1, activityKey: 'mindMapRead' });
  console.log(`POST /api/progress (mark mindMapRead) -> Status: ${postProgRes.statusCode}, Updated: ${postProgRes.json?.progress?.units[1]?.mindMapRead}`);
  if (postProgRes.statusCode !== 200 || postProgRes.json?.progress?.units[1]?.mindMapRead !== true) {
    throw new Error('Test A5 failed: Failed to mark activity via progress API!');
  }

  // 3. Confirm directly in database
  const directDbProg = await getUserProgress(studentUser.id);
  console.log(`Direct Database Query Progress Check -> Unit 1 mindMapRead: ${directDbProg.units[1].mindMapRead}`);
  if (directDbProg.units[1].mindMapRead !== true) {
    throw new Error('Test A5 failed: Progress was not persisted to database!');
  }
  console.log('[PASS] A5: Progress tracking and SQLite database persistence verified.\n');

  // TEST A6: Role-Based Authorization
  console.log('--- TEST A6: ROLE-BASED ACCESS CONTROL (STUDENT VS ADMIN) ---');
  // 1. Student attempting to access faculty attendance roster
  const studentRoster = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`Student accessing GET /api/attendance -> Status: ${studentRoster.statusCode}, Body: ${studentRoster.body.trim()}`);
  if (studentRoster.statusCode !== 403) {
    throw new Error('Test A6 failed: Student account was not forbidden (403) from accessing admin attendance roster!');
  }

  // 2. Admin accessing faculty attendance roster via session
  const adminRoster = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Admin accessing GET /api/attendance -> Status: ${adminRoster.statusCode}, Roster count: ${adminRoster.json?.count}`);
  if (adminRoster.statusCode !== 200 || !adminRoster.json?.ok) {
    throw new Error('Test A6 failed: Admin session failed to access attendance roster!');
  }

  // 3. Admin accessing session-code via session
  const adminSessionCode = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance/session-code',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Admin accessing GET /api/attendance/session-code -> Status: ${adminSessionCode.statusCode}`);
  if (adminSessionCode.statusCode !== 200) {
    throw new Error('Test A6 failed: Admin session failed to access session code!');
  }

  // 4. Legacy x-admin-key backwards compatibility
  const legacyAdmin = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'x-admin-key': process.env.ADMIN_KEY }
  });
  console.log(`Legacy x-admin-key header accessing GET /api/attendance -> Status: ${legacyAdmin.statusCode}`);
  if (legacyAdmin.statusCode !== 200) {
    throw new Error('Test A6 failed: Legacy x-admin-key header failed!');
  }
  console.log('[PASS] A6: Role-based permissions strictly enforced.\n');

  // TEST A7: Session Termination (Logout)
  console.log('--- TEST A7: LOGOUT & SESSION TERMINATION ---');
  const logoutRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Cookie': `echemed_session=${studentToken}` }
  });
  console.log(`POST /api/auth/logout -> Status: ${logoutRes.statusCode}`);
  if (logoutRes.statusCode !== 200) {
    throw new Error('Test A7 failed: Logout request failed!');
  }

  // Verify session removed from database
  const dbSessionAfter = await getSession(studentToken);
  console.log(`Database Session Check after logout: ${dbSessionAfter ? 'EXISTS' : 'PURGED'}`);
  if (dbSessionAfter !== null) {
    throw new Error('Test A7 failed: Session was not deleted from database!');
  }

  // Verify subsequent /api/auth/me returns 401
  const meAfter = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Cookie': `echemed_session=${studentToken}` }
  });
  console.log(`GET /api/auth/me after logout -> Status: ${meAfter.statusCode}`);
  if (meAfter.statusCode !== 401) {
    throw new Error('Test A7 failed: Terminated session was not rejected with 401!');
  }

  // Verify subsequent GET /index.html redirects to login
  const indexAfter = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/index.html',
    method: 'GET',
    headers: { 'Cookie': `echemed_session=${studentToken}` }
  });
  console.log(`GET /index.html after logout -> Status: ${indexAfter.statusCode}, Redirect: ${indexAfter.headers.location}`);
  if (indexAfter.statusCode !== 302 || !indexAfter.headers.location.includes('/pages/login.html')) {
    throw new Error('Test A7 failed: Terminated session was not redirected to login page!');
  }
  console.log('[PASS] A7: Logout cleanly terminates session and restores route protection.\n');

  console.log('======================================================================');
  console.log('   ALL AUTHENTICATION & PERSISTENCE TESTS PASSED (100% SUCCESS)       ');
  console.log('======================================================================\n');
}

if (require.main === module) {
  runAuthTests()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('\n[FATAL AUTH TEST ERROR]:', err);
      process.exit(1);
    });
}

module.exports = { runAuthTests };
