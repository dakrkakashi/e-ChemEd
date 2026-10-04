/**
 * test-serverless-export.js — Verification of Vercel Serverless Function Export
 * 
 * Tests that api/index.js correctly exports the Express application and responds
 * to API routes both under /api and / fallback rewrites.
 */

const http = require('http');

async function testServerlessExport() {
  console.log('--- TEST S1: VERIFY VERCEL EXPORT INTERFACE ---');
  const serverlessApp = require('../api/index');
  
  if (typeof serverlessApp !== 'function') {
    throw new Error('api/index.js does not export a callable Express application/handler!');
  }
  console.log('[PASS] S1: api/index.js exports valid Express app handler function.');

  console.log('\n--- TEST S2: EPHEMERAL HTTP INVOCATION TEST ---');
  const server = http.createServer(serverlessApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Ephemeral serverless test runner listening on 127.0.0.1:${port}`);

  function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: port,
          ...options
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data ? (() => { try { return JSON.parse(data); } catch (e) { return data; } })() : null
            });
          });
        }
      );
      req.on('error', reject);
      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    });
  }

  try {
    // 1. Health check via /api/health
    const healthApi = await makeRequest({ path: '/api/health', method: 'GET' });
    if (healthApi.statusCode !== 200 || !healthApi.body.ok) {
      throw new Error(`Expected 200 from /api/health, got ${healthApi.statusCode}`);
    }
    console.log(`[PASS] /api/health responded 200: service=${healthApi.body.service}, dbEngine=${healthApi.body.dbEngine}`);

    // 2. Health check via root fallback /health (as rewritten by serverless)
    const healthRoot = await makeRequest({ path: '/health', method: 'GET' });
    if (healthRoot.statusCode !== 200 || !healthRoot.body.ok) {
      throw new Error(`Expected 200 from /health fallback, got ${healthRoot.statusCode}`);
    }
    console.log('[PASS] /health fallback route responded 200.');

    // 3. Unauthenticated /api/auth/me should return 401
    const unauthMe = await makeRequest({ path: '/api/auth/me', method: 'GET' });
    if (unauthMe.statusCode !== 401) {
      throw new Error(`Expected 401 from /api/auth/me, got ${unauthMe.statusCode}`);
    }
    console.log('[PASS] Unauthenticated /api/auth/me properly rejected with 401.');

    // 4. Authenticate student via /api/auth/login
    const loginRes = await makeRequest(
      {
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { username: 'student', password: 'student123' }
    );
    if (loginRes.statusCode !== 200 || !loginRes.body.ok) {
      throw new Error(`Expected 200 from student login, got ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    }
    const cookieHeader = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
    console.log(`[PASS] Student login verified. User: ${loginRes.body.user.name}`);

    // 5. Verify /api/auth/me with session cookie
    const authMe = await makeRequest({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Cookie: cookieHeader }
    });
    if (authMe.statusCode !== 200 || authMe.body.user.username !== 'student') {
      throw new Error(`Expected 200 with student user, got ${authMe.statusCode}`);
    }
    console.log('[PASS] Authenticated /api/auth/me returned student session.');

    // 6. Unknown API endpoint returns 404 JSON
    const notFoundRes = await makeRequest({ path: '/api/non-existent-endpoint', method: 'GET' });
    if (notFoundRes.statusCode !== 404 || notFoundRes.body.ok !== false) {
      throw new Error(`Expected 404 from unknown route, got ${notFoundRes.statusCode}`);
    }
    console.log('[PASS] Unknown API route returned 404 envelope.');

    console.log('\n======================================================');
    console.log('   SERVERLESS EXPORT CHECKS PASSED (100% SUCCESS)     ');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

module.exports = { testServerlessExport };

if (require.main === module) {
  testServerlessExport().catch((err) => {
    console.error('[FATAL SERVERLESS TEST ERROR]:', err);
    process.exit(1);
  });
}

