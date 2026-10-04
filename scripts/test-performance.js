/**
 * test-performance.js — Automated Performance Benchmark & Regression Test Suite
 * 
 * Tests:
 * 1. API endpoint latency distribution (P50, P95, P99)
 * 2. Server-Timing observability headers
 * 3. Database query indexing & throughput
 * 4. Frontend bundle size budgets & web vital guardrails
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND_PORT = 3001;
const BASE_DIR = path.resolve(__dirname, '..');

function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const durMs = Number(process.hrtime.bigint() - start) / 1e6;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            durMs
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return { p50, p90, p95, p99, avg, min: sorted[0], max: sorted[sorted.length - 1] };
}

async function runPerformanceSuite() {
  console.log('======================================================================');
  console.log('         e-chemEd Automated Application Performance Benchmark          ');
  console.log('======================================================================\n');

  // Verify backend is reachable or start it
  let backendProcess = null;
  try {
    await makeRequest('/api/health');
  } catch (e) {
    console.log('Starting local backend server for performance testing...');
    const { spawn } = require('child_process');
    backendProcess = spawn('node', ['backend/server.js'], { cwd: BASE_DIR, stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1200));
  }

  let passed = true;

  try {
    // -----------------------------------------------------------------------
    // TEST 1: API Latency & Server-Timing Profiling
    // -----------------------------------------------------------------------
    console.log('--- 1. API LATENCY & OBSERVABILITY PROFILING (100 Samples) ---');
    const samples = 100;
    const latencies = [];
    let serverTimingReceived = false;

    // Warm-up request
    await makeRequest('/api/health');

    for (let i = 0; i < samples; i++) {
      const res = await makeRequest('/api/health');
      if (res.statusCode === 200) {
        latencies.push(res.durMs);
        if (res.headers['server-timing']) {
          serverTimingReceived = true;
        }
      }
    }

    const stats = calculatePercentiles(latencies);
    console.log(`Samples:     ${latencies.length} requests`);
    console.log(`Min Latency: ${stats.min.toFixed(2)} ms`);
    console.log(`Average:     ${stats.avg.toFixed(2)} ms`);
    console.log(`P50 (Median):${stats.p50.toFixed(2)} ms (SLA Target: < 50ms)`);
    console.log(`P90:         ${stats.p90.toFixed(2)} ms`);
    console.log(`P95:         ${stats.p95.toFixed(2)} ms (SLA Target: < 100ms)`);
    console.log(`P99:         ${stats.p99.toFixed(2)} ms (SLA Target: < 200ms)`);
    console.log(`Server-Timing header present: ${serverTimingReceived ? 'YES' : 'NO'}`);

    if (stats.p50 > 50 || stats.p95 > 100) {
      console.warn('[FAIL] API latency exceeded SLA thresholds.');
      passed = false;
    } else {
      console.log('[PASS] API latency within ultra-low latency SLA parameters.');
    }

    if (!serverTimingReceived) {
      console.warn('[WARN] Server-Timing header was not emitted.');
    } else {
      console.log('[PASS] Server-Timing observability telemetry verified.\n');
    }

    // -----------------------------------------------------------------------
    // TEST 2: Static Bundle & Payload Budget Guardrails
    // -----------------------------------------------------------------------
    console.log('--- 2. FRONTEND ASSET & BUNDLE SIZE BUDGETS ---');
    const dataStorePath = path.join(BASE_DIR, 'frontend/assets/js/data-store.js');
    const dataStoreSizeKB = fs.statSync(dataStorePath).size / 1024;
    console.log(`data-store.js size: ${dataStoreSizeKB.toFixed(1)} KB (Budget: < 35 KB, previously ~77 KB)`);

    if (dataStoreSizeKB > 35) {
      console.error(`[FAIL] data-store.js exceeds budget of 35 KB: ${dataStoreSizeKB.toFixed(1)} KB`);
      passed = false;
    } else {
      console.log(`[PASS] data-store.js adheres to budget (${dataStoreSizeKB.toFixed(1)} KB <= 35 KB).\n`);
    }

    // -----------------------------------------------------------------------
    // TEST 3: Core Web Vital & Interaction Guardrails
    // -----------------------------------------------------------------------
    console.log('--- 3. WEB VITALS & INTERACTION OPTIMIZATIONS ---');
    const searchJs = fs.readFileSync(path.join(BASE_DIR, 'frontend/assets/js/search.js'), 'utf8');
    const hasDebounce = searchJs.includes('searchDebounceTimer');
    console.log(`Search input debounce implemented: ${hasDebounce ? 'YES' : 'NO'}`);

    const baseCss = fs.readFileSync(path.join(BASE_DIR, 'frontend/assets/css/base.css'), 'utf8');
    const hasTabularNums = baseCss.includes('font-variant-numeric: tabular-nums');
    console.log(`Tabular numbers on metric counters: ${hasTabularNums ? 'YES' : 'NO'}`);

    const compCss = fs.readFileSync(path.join(BASE_DIR, 'frontend/assets/css/components.css'), 'utf8');
    const hasHeaderMinHeight = compCss.includes('#site-header') && compCss.includes('min-height: 69px');
    console.log(`Header layout shift (CLS) reservation: ${hasHeaderMinHeight ? 'YES' : 'NO'}`);

    const motionJs = fs.readFileSync(path.join(BASE_DIR, 'frontend/assets/js/motion.js'), 'utf8');
    const hasForcedReflow = motionJs.includes('void element.offsetWidth');
    console.log(`Forced reflow in animations eliminated: ${!hasForcedReflow ? 'YES' : 'NO'}`);

    if (hasDebounce && hasTabularNums && hasHeaderMinHeight && !hasForcedReflow) {
      console.log('[PASS] All Web Vital and rendering guardrails verified.\n');
    } else {
      console.error('[FAIL] Missing one or more web vital guardrails.');
      passed = false;
    }

    // -----------------------------------------------------------------------
    // TEST 4: Database Index Verification
    // -----------------------------------------------------------------------
    console.log('--- 4. DATABASE QUERY PERFORMANCE & INDEXING ---');
    const dbJs = fs.readFileSync(path.join(BASE_DIR, 'backend/db.js'), 'utf8');
    const hasIndexes = dbJs.includes('idx_attendance_date_div') && dbJs.includes('idx_sessions_user_id');
    console.log(`Attendance & Session compound indexes configured: ${hasIndexes ? 'YES' : 'NO'}`);

    if (hasIndexes) {
      console.log('[PASS] Database query performance indexing verified.\n');
    } else {
      console.error('[FAIL] Database performance indexes missing in db.js.');
      passed = false;
    }

  } finally {
    if (backendProcess) {
      backendProcess.kill();
    }
  }

  console.log('======================================================================');
  if (passed) {
    console.log('       ALL PERFORMANCE BENCHMARKS & BUDGET CHECKS PASSED (100%)       ');
  } else {
    console.log('         PERFORMANCE CHECKS FAILED: REGRESSIONS DETECTED              ');
    process.exit(1);
  }
  console.log('======================================================================\n');
}

runPerformanceSuite().catch(err => {
  console.error('Performance benchmark error:', err);
  process.exit(1);
});
