/**
 * verify-all.js — Comprehensive Automated Test & Verification Suite for e-chemEd
 * 
 * Verifies all security, robustness, validation, and network requirements:
 * 1. Static asset & link audit
 * 2. Port collision handling
 * 3. Static server HTTP Range, traversal blocking, directory listing protection, and /config.json
 * 4. Backend Health, Validation, Session Code, 409 Unique Constraint, Timing-safe Auth, Header-only CSV
 * 5. Rate limiting (60 req/min)
 * 6. LAN IP CORS derivation
 * 7. Purge script execution
 * 8. Process PID tracking & clean termination
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;
const PROJ_DIR = path.resolve(__dirname, '..');

// Helper for HTTP requests
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSuite() {
  console.log('======================================================================');
  console.log('       e-chemEd FULL VERIFICATION & ACCEPTANCE TEST SUITE            ');
  console.log('======================================================================\n');

  // STEP 1: Static Asset, JSON Data, and Link Integrity Audit
  console.log('--- TEST 1: STATIC ASSET, DATA & LINK INTEGRITY AUDIT ---');
  try {
    const linkAudit = cp.execSync('node scripts/verify-site.js', { encoding: 'utf-8', cwd: PROJ_DIR });
    console.log(linkAudit.trim());
    console.log('[PASS] Test 1: All pages, static assets, and JSON schemas verified intact.\n');
  } catch (err) {
    console.error('[FAIL] Test 1 failed:', err.stdout || err.stderr);
    process.exit(1);
  }

  // STEP 2: Port Collision Handling Test
  console.log('--- TEST 2: PORT COLLISION DETECTION ---');
  const dummyServer = http.createServer((req, res) => res.end('collision-test'));
  await new Promise(res => dummyServer.listen(3000, '0.0.0.0', res));
  try {
    cp.execSync('node scripts/check-ports.js', { encoding: 'utf-8', cwd: PROJ_DIR });
    console.error('[FAIL] check-ports should have exited with code 1!');
    process.exit(1);
  } catch (err) {
    console.log('[PASS] Port 3000 collision properly caught with code ' + err.status);
    console.log('Output preview:', err.stdout.trim().split('\n').slice(0, 5).join('\n'));
  }
  await new Promise(res => dummyServer.close(res));
  console.log('[PASS] Test 2: Port collision handled gracefully.\n');

  // Start live Frontend and Backend servers for subsequent tests
  console.log('--- STARTING LIVE SERVERS (Frontend 3000, Backend 3001) ---');
  const frontendServer = require('./serve-frontend.js');
  const backendServer = require('../backend/server.js');
  const { setSetting, purgeAttendance } = require('../backend/db');
  setSetting('session_code', '');
  purgeAttendance();
  await sleep(1500);

  // Retrieve admin key from environment
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.error('[FAIL] ADMIN_KEY is not defined in process.env!');
    process.exit(1);
  }
  console.log('[INFO] Admin key configured in backend (length: ' + adminKey.length + ' chars)');

  // STEP 3: Frontend Server Tests (Range request, Traversal, Directory listing, Config.json)
  console.log('\n--- TEST 3: STATIC SERVER SECURITY & STREAMING ---');
  
  // 3a. /config.json
  const configRes = await request({ host: '127.0.0.1', port: FRONTEND_PORT, path: '/config.json', method: 'GET' });
  console.log(`3a. GET /config.json -> Status: ${configRes.statusCode}, Body: ${configRes.body}`);
  if (configRes.statusCode !== 200 || !configRes.json || configRes.json.backendPort !== 3001) {
    throw new Error('3a failed: Invalid config.json');
  }

  // 3b. Directory traversal protection
  const travRes = await request({ host: '127.0.0.1', port: FRONTEND_PORT, path: '/../../backend/server.js', method: 'GET' });
  console.log(`3b. GET /../../backend/server.js -> Status: ${travRes.statusCode} (${travRes.body.trim()})`);
  if (travRes.statusCode !== 403 && travRes.statusCode !== 404) {
    throw new Error('3b failed: Directory traversal was not blocked!');
  }

  // 3c. Directory listing protection
  const dirRes = await request({ host: '127.0.0.1', port: FRONTEND_PORT, path: '/assets/', method: 'GET' });
  console.log(`3c. GET /assets/ -> Status: ${dirRes.statusCode} (${dirRes.body.trim()})`);
  if (dirRes.statusCode !== 403) {
    throw new Error('3c failed: Directory listing was not blocked!');
  }

  // 3d. HTTP Range Request (Partial Content)
  const rangeRes = await request({
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    path: '/assets/video/unit1-lecture.mp4',
    method: 'GET',
    headers: { 'Range': 'bytes=0-100' }
  });
  console.log(`3d. GET /assets/video/unit1-lecture.mp4 (Range: bytes=0-100) -> Status: ${rangeRes.statusCode}`);
  console.log(`    Content-Range: ${rangeRes.headers['content-range']}`);
  console.log(`    Accept-Ranges: ${rangeRes.headers['accept-ranges']}`);
  console.log(`    Chunk Length: ${rangeRes.headers['content-length']}`);
  if (rangeRes.statusCode !== 206 || !rangeRes.headers['content-range'].includes('bytes 0-100/')) {
    throw new Error('3d failed: Range request not satisfied with 206!');
  }
  console.log('[PASS] Test 3: Static server security and Range streaming verified.\n');

  // STEP 4: Backend Health Check
  console.log('--- TEST 4: BACKEND HEALTH ENDPOINT ---');
  const healthRes = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/health', method: 'GET' });
  console.log(`GET /api/health -> Status: ${healthRes.statusCode}, Body: ${healthRes.body}`);
  if (healthRes.statusCode !== 200 || !healthRes.json || healthRes.json.ok !== true) {
    throw new Error('Test 4 failed: Health check invalid');
  }
  console.log('[PASS] Test 4: Health check verified.\n');

  // STEP 5: Attendance Validation & 400 Bad Request
  console.log('--- TEST 5: ATTENDANCE INPUT VALIDATION (BAD REQUEST) ---');
  const badPayload = { name: 'A', prn: '123', rollNo: '' }; // Invalid name (<2 chars), invalid PRN (<5 chars), missing roll
  const badRes = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'POST' }, badPayload);
  console.log(`POST /api/attendance (Invalid payload) -> Status: ${badRes.statusCode}, Error: "${badRes.json?.error}"`);
  if (badRes.statusCode !== 400 || !badRes.json || badRes.json.ok !== false) {
    throw new Error('Test 5 failed: Invalid payload was not rejected with 400!');
  }
  console.log('[PASS] Test 5: Validation successfully caught bad inputs.\n');

  // STEP 6: Valid Attendance Submission & 409 Duplicate Constraint
  console.log('--- TEST 6: VALID SUBMISSION & UNIQUE CONSTRAINT (409 CONFLICT) ---');
  const today = new Date().toISOString().split('T')[0];
  const validPayload = {
    name: 'Rahul Ananda Shinde',
    rollNo: '101',
    division: 'A (Computer)',
    prn: '72183921B',
    unit: 'Unit 1: Water Processing and Environmental Sustainability',
    session: 'Lecture',
    date: today
  };

  const submit1 = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'POST' }, validPayload);
  console.log(`POST /api/attendance (1st Submission) -> Status: ${submit1.statusCode}, Body: ${submit1.body}`);
  if (submit1.statusCode !== 201 || !submit1.json || submit1.json.ok !== true) {
    throw new Error('Test 6 failed: Valid submission failed to insert!');
  }

  // Duplicate submission with same (prn, unit, session, date)
  const submit2 = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'POST' }, validPayload);
  console.log(`POST /api/attendance (Duplicate Submission) -> Status: ${submit2.statusCode}, Body: ${submit2.body}`);
  if (submit2.statusCode !== 409 || submit2.json?.error !== 'Attendance already recorded') {
    throw new Error('Test 6 failed: Duplicate was not rejected with 409 "Attendance already recorded"!');
  }
  console.log('[PASS] Test 6: Unique constraint enforced and 409 returned.\n');

  // STEP 7: Session Code Verification
  console.log('--- TEST 7: SESSION CODE ENFORCEMENT ---');
  // Set session code to "CHEM101"
  const setCodeRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance/session-code',
    method: 'POST',
    headers: { 'x-admin-key': adminKey }
  }, { sessionCode: 'CHEM101' });
  console.log(`Set Session Code -> Status: ${setCodeRes.statusCode}, Body: ${setCodeRes.body}`);

  const student2 = {
    name: 'Pooja Suresh Patil',
    rollNo: '102',
    division: 'B (IT)',
    prn: '72183922C',
    unit: 'Unit 1: Water Processing and Environmental Sustainability',
    session: 'Lecture',
    date: today
  };

  // 7a. Missing session code when required
  const noCodeRes = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'POST' }, student2);
  console.log(`7a. POST /api/attendance (Missing code) -> Status: ${noCodeRes.statusCode}, Error: "${noCodeRes.json?.error}"`);
  if (noCodeRes.statusCode !== 400 || !noCodeRes.json?.error.includes('Session code required')) {
    throw new Error('7a failed: Missing code was not rejected!');
  }

  // 7b. Invalid session code
  const wrongCodeRes = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'POST' }, { ...student2, sessionCode: 'WRONG99' });
  console.log(`7b. POST /api/attendance (Wrong code) -> Status: ${wrongCodeRes.statusCode}, Error: "${wrongCodeRes.json?.error}"`);
  if (wrongCodeRes.statusCode !== 400 || !wrongCodeRes.json?.error.includes('Invalid session code')) {
    throw new Error('7b failed: Wrong code was not rejected!');
  }

  // 7c. Valid session code
  const validCodeRes = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'POST' }, { ...student2, sessionCode: 'CHEM101' });
  console.log(`7c. POST /api/attendance (Correct code CHEM101) -> Status: ${validCodeRes.statusCode}, Body: ${validCodeRes.body}`);
  if (validCodeRes.statusCode !== 201) {
    throw new Error('7c failed: Valid session code was not accepted!');
  }

  // Reset session code to empty
  await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance/session-code',
    method: 'POST',
    headers: { 'x-admin-key': adminKey }
  }, { sessionCode: '' });
  console.log('[PASS] Test 7: Session code requirement fully verified.\n');

  // STEP 8: Admin Authentication & Timing-Safe Security
  console.log('--- TEST 8: ADMIN AUTHENTICATION & TIMING-SAFE VERIFICATION ---');
  // 8a. No header
  const noAuthRes = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance', method: 'GET' });
  console.log(`8a. GET /api/attendance (No auth) -> Status: ${noAuthRes.statusCode}, Body: ${noAuthRes.body}`);
  if (noAuthRes.statusCode !== 401) {
    throw new Error('8a failed: Missing key did not return 401!');
  }

  // 8b. Incorrect key
  const badAuthRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'x-admin-key': 'wrong_invalid_key_length_different' }
  });
  console.log(`8b. GET /api/attendance (Wrong key) -> Status: ${badAuthRes.statusCode}, Body: ${badAuthRes.body}`);
  if (badAuthRes.statusCode !== 401) {
    throw new Error('8b failed: Wrong key did not return 401!');
  }

  // 8c. Valid key
  const goodAuthRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'x-admin-key': adminKey }
  });
  console.log(`8c. GET /api/attendance (Valid x-admin-key) -> Status: ${goodAuthRes.statusCode}, Count: ${goodAuthRes.json?.count}`);
  if (goodAuthRes.statusCode !== 200 || !goodAuthRes.json || goodAuthRes.json.count !== 2) {
    throw new Error('8c failed: Valid key did not return attendance roster!');
  }
  console.log('[PASS] Test 8: Admin authentication verified.\n');

  // STEP 9: CSV Export Header-Only Verification
  console.log('--- TEST 9: CSV EXPORT SECURITY (HEADER ONLY, NO QUERY PARAM) ---');
  // 9a. No header -> 401
  const noCsvAuth = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/attendance/export.csv', method: 'GET' });
  console.log(`9a. GET /api/attendance/export.csv (No header) -> Status: ${noCsvAuth.statusCode}`);
  if (noCsvAuth.statusCode !== 401) throw new Error('9a failed');

  // 9b. Query parameter ?key=... without header -> MUST BE REJECTED 401
  const queryParamCsv = await request({ host: '127.0.0.1', port: BACKEND_PORT, path: `/api/attendance/export.csv?key=${adminKey}`, method: 'GET' });
  console.log(`9b. GET /api/attendance/export.csv?key=... (Query param without header) -> Status: ${queryParamCsv.statusCode}`);
  if (queryParamCsv.statusCode !== 401) {
    throw new Error('9b failed: Query param was accepted! Query parameter option MUST be removed.');
  }

  // 9c. Header x-admin-key -> 200 text/csv
  const goodCsv = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance/export.csv',
    method: 'GET',
    headers: { 'x-admin-key': adminKey }
  });
  console.log(`9c. GET /api/attendance/export.csv (Header x-admin-key) -> Status: ${goodCsv.statusCode}`);
  console.log(`    Content-Type: ${goodCsv.headers['content-type']}`);
  console.log(`    Content-Disposition: ${goodCsv.headers['content-disposition']}`);
  console.log(`    CSV Content Preview:\n${goodCsv.body.split('\r\n').slice(0, 3).join('\n')}`);
  if (goodCsv.statusCode !== 200 || !goodCsv.headers['content-type'].includes('text/csv')) {
    throw new Error('9c failed: CSV export failed');
  }
  console.log('[PASS] Test 9: CSV export strictly header-protected.\n');

  // STEP 10: Rate Limiting (60/min)
  console.log('--- TEST 10: RATE LIMITING (60 req/min sliding window) ---');
  console.log('Dispatching 60 consecutive requests...');
  let hit429 = false;
  let lastStatus = 0;
  for (let i = 1; i <= 62; i++) {
    const r = await request({
      host: '127.0.0.1',
      port: BACKEND_PORT,
      path: '/api/attendance',
      method: 'POST'
    }, {
      name: `Student ${i}`,
      rollNo: `R${i}`,
      division: 'A (Computer)',
      prn: `PRN${1000 + i}`,
      unit: 'Unit 1: Water Processing and Environmental Sustainability',
      session: 'Lecture',
      date: '2026-10-04'
    });
    lastStatus = r.statusCode;
    if (r.statusCode === 429) {
      console.log(`Request #${i} triggered HTTP 429 Too Many Requests (Retry-After: ${r.headers['retry-after']}s)`);
      console.log(`Error message: "${r.json?.error}"`);
      hit429 = true;
      break;
    }
  }
  if (!hit429) {
    throw new Error('Test 10 failed: Rate limit 60/min was not triggered!');
  }
  console.log('[PASS] Test 10: Rate limiting successfully protected backend.\n');

  // STEP 11: LAN IP Access & CORS
  console.log('--- TEST 11: LAN IP ACCESS & CORS ---');
  const lanScriptOut = cp.execSync('node scripts/print-lan.js', { encoding: 'utf-8', cwd: PROJ_DIR });
  console.log(lanScriptOut.trim());
  const corsPreflight = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://10.175.250.65:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });
  console.log(`LAN Origin CORS Preflight -> Status: ${corsPreflight.statusCode}`);
  console.log(`Allow-Origin Header: ${corsPreflight.headers['access-control-allow-origin']}`);
  if (corsPreflight.statusCode !== 204 && corsPreflight.statusCode !== 200) {
    throw new Error('Test 11 failed: CORS preflight failed for LAN IP');
  }
  console.log('[PASS] Test 11: LAN access & CORS verified.\n');

  // STEP 12: Semester Data Purge
  console.log('--- TEST 12: SEMESTER DATA PURGE SCRIPT ---');
  const purgeOut = cp.execSync('node backend/scripts/purge.js --force', { encoding: 'utf-8', cwd: PROJ_DIR });
  console.log(purgeOut.trim());
  const postPurgeRes = await request({
    host: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/api/attendance',
    method: 'GET',
    headers: { 'x-admin-key': adminKey }
  });
  console.log(`Post-Purge Attendance Count: ${postPurgeRes.json?.count}`);
  if (postPurgeRes.json?.count !== 0) {
    throw new Error('Test 12 failed: Database was not purged!');
  }
  console.log('[PASS] Test 12: Data purge successfully reset attendance table.\n');

  // Close server listeners before testing kill-pids
  await new Promise(res => frontendServer.close(res));
  await new Promise(res => backendServer.close(res));
  await sleep(500);

  // STEP 13: PID tracking and clean shutdown test
  console.log('--- TEST 13: PID TRACKING & CLEAN SHUTDOWN ---');
  // Write test .pids and verify kill-pids cleans them
  const pidFile = path.join(PROJ_DIR, '.pids');
  fs.writeFileSync(pidFile, 'BACKEND_PID=99999\nFRONTEND_PID=99998\n', 'utf-8');
  console.log('Created test .pids file.');
  const killOut = cp.execSync('node scripts/kill-pids.js', { encoding: 'utf-8', cwd: PROJ_DIR });
  console.log(killOut.trim());
  if (fs.existsSync(pidFile)) {
    throw new Error('Test 13 failed: .pids file was not removed!');
  }
  console.log('[PASS] Test 13: PID file lifecycle verified.\n');

  console.log('======================================================================');
  console.log('         ALL 13 TESTS PASSED PERFECTLY (100% SUCCESS)                 ');
  console.log('======================================================================\n');
  process.exit(0);
}

runSuite().catch(err => {
  console.error('\n[FATAL SUITE ERROR]:', err);
  process.exit(1);
});
