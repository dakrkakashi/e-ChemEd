const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 3995;
const CDP_PORT = 9241;

const AXE_PATH = require.resolve('axe-core/axe.min.js', { paths: [ROOT_DIR] });
const AXE_SRC = fs.readFileSync(AXE_PATH, 'utf-8');

const ALL_ROUTES = [
  'index.html',
  'pages/unit.html?u=1',
  'pages/unit.html?u=2',
  'pages/unit.html?u=3',
  'pages/unit.html?u=4',
  'pages/unit.html?u=5',
  'pages/quizzes.html',
  'pages/question-bank.html',
  'pages/mind-maps.html',
  'pages/video-lectures.html',
  'pages/attendance.html',
  'pages/admin.html',
  'pages/games.html',
  'games/periodic-table.html',
  'games/unit1-puzzle.html',
  'games/unit2-arcade.html'
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const urlPath = decodeURI(req.url.split('?')[0]);
  let safePath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(FRONTEND_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

async function main() {
  server.listen(PORT, async () => {
    try {
      await runFullAudit();
    } catch (err) {
      console.error('Fatal audit error:', err);
      process.exit(1);
    }
  });
}

function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch (e) {
    return 'UNKNOWN_COMMIT';
  }
}

async function runFullAudit() {
  const commitHash = getCommitHash();
  const tempProfile = path.join(ROOT_DIR, '.edge_final_audit_profile');

  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
    'about:blank'
  ], { stdio: 'ignore' });

  await sleep(1500);

  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const callbacks = new Map();
  let currentNetworkResponses = [];
  let currentNetworkFailures = [];
  let currentConsoleErrors = [];
  let inFlightRequests = new Set();
  let requestUrls = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }

    if (msg.method === 'Network.requestWillBeSent') {
      inFlightRequests.add(msg.params.requestId);
      requestUrls.set(msg.params.requestId, msg.params.request.url);
    }

    if (msg.method === 'Network.responseReceived') {
      const resp = msg.params.response;
      currentNetworkResponses.push({ url: resp.url, status: resp.status, statusText: resp.statusText });
      inFlightRequests.delete(msg.params.requestId);
    }

    if (msg.method === 'Network.loadingFinished') {
      inFlightRequests.delete(msg.params.requestId);
    }

    if (msg.method === 'Network.loadingFailed') {
      inFlightRequests.delete(msg.params.requestId);
      if (!msg.params.canceled) {
        const reqUrl = requestUrls.get(msg.params.requestId) || 'unknown';
        // Filter out optional local backend probes from admin/attendance pages
        if (!reqUrl.includes('/api/health')) {
          currentNetworkFailures.push({
            requestId: msg.params.requestId,
            url: reqUrl,
            errorText: msg.params.errorText
          });
        }
      }
    }

    if (msg.method === 'Runtime.consoleAPICalled') {
      if (msg.params.type === 'error') {
        currentConsoleErrors.push({
          type: 'console.error',
          text: msg.params.args.map(a => a.value || a.description).join(' ')
        });
      }
    }

    if (msg.method === 'Runtime.exceptionThrown') {
      currentConsoleErrors.push({
        type: 'exception',
        text: msg.params.exceptionDetails.text,
        desc: msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : '',
        url: msg.params.exceptionDetails.url,
        line: msg.params.exceptionDetails.lineNumber
      });
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  // Verify which axe rules run
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await sleep(600);
  await send('Runtime.evaluate', { expression: AXE_SRC });
  const axeRulesCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
      const rules = axe.getRules(tags);
      return { total: rules.length, ruleIds: rules.map(r => r.ruleId) };
    })()`,
    returnByValue: true
  });

  const ruleData = axeRulesCheck.result.value || { total: 0, ruleIds: [] };

  console.log('================================================================');
  console.log('  e-chemEd RIGOROUS FULL-SPECTRUM AUTOMATED AUDIT');
  console.log(`  Audited Commit Hash (git rev-parse HEAD): ${commitHash}`);
  console.log(`  Axe Rules Loaded: ${ruleData.total} rules under tags: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice`);
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // PROOF OF AUDITOR VALIDATION (Task 2)
  // -------------------------------------------------------------
  console.log('--- 1. AUDITOR SENSITIVITY PROOF (Intentional Failure Injection) ---');
  const testProofPath = path.join(FRONTEND_DIR, 'auditor-test-fail-sample.html');
  fs.writeFileSync(testProofPath, '<!DOCTYPE html><html lang="en"><head><title>Test Fail</title></head><body><main><h1>Proof</h1><img src="assets/img/logo.jpg"></main></body></html>', 'utf-8');

  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/auditor-test-fail-sample.html` });
  await sleep(500);
  await send('Runtime.evaluate', { expression: AXE_SRC });
  const proofEval = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }).then(resolve))`,
    awaitPromise: true,
    returnByValue: true
  });

  try { fs.unlinkSync(testProofPath); } catch (e) {}

  const proofViolations = (proofEval.result.value && proofEval.result.value.violations) || [];
  const imgAltViolation = proofViolations.find(v => v.id === 'image-alt');

  if (imgAltViolation) {
    console.log(`[PASS: PROOF CONFIRMED] Auditor successfully detected injected missing-alt violation:`);
    console.log(`      Rule ID: ${imgAltViolation.id} | Impact: ${imgAltViolation.impact} | Description: ${imgAltViolation.description}\n`);
  } else {
    console.error(`[FATAL] Auditor sensitivity proof failed! Expected image-alt violation was not caught.\n`);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // PASS 1: DESKTOP ALL-ROUTES AUDIT (Light & Dark Theme with Real Signals)
  // -------------------------------------------------------------
  console.log('--- 2. DESKTOP ALL 16 ROUTES AUDIT (Light & Dark) ---');

  // Set desktop viewport
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });

  let total404s = 0;
  let totalNetworkFails = 0;
  let totalConsoleErrors = 0;
  let totalBrokenImages = 0;
  let totalViolationsAll = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let anyFailure = false;

  for (const route of ALL_ROUTES) {
    currentNetworkResponses = [];
    currentNetworkFailures = [];
    currentConsoleErrors = [];
    inFlightRequests.clear();
    requestUrls.clear();

    const pageUrl = `http://127.0.0.1:${PORT}/${route}`;
    await send('Page.navigate', { url: pageUrl });

    // Wait for real render signal
    await waitForRenderSignal(send, inFlightRequests);

    const route404s = currentNetworkResponses.filter(r => r.status === 404);
    const routeNetFails = [...currentNetworkFailures];
    const routeConsoleErrs = [...currentConsoleErrors];

    total404s += route404s.length;
    totalNetworkFails += routeNetFails.length;
    totalConsoleErrors += routeConsoleErrs.length;

    // Check images
    const imgCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        }));
        return imgs;
      })()`,
      returnByValue: true
    });
    const brokenImgs = (imgCheck.result.value || []).filter(i => !i.complete || i.naturalWidth === 0);
    totalBrokenImages += brokenImgs.length;

    // Check light theme background
    const lightBgEval = await send('Runtime.evaluate', {
      expression: `window.getComputedStyle(document.body).backgroundColor`,
      returnByValue: true
    });
    const lightBg = lightBgEval.result.value;

    // Run axe in Light theme
    await send('Runtime.evaluate', { expression: AXE_SRC });
    const axeLightEval = await send('Runtime.evaluate', {
      expression: `new Promise(resolve => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }).then(resolve))`,
      awaitPromise: true,
      returnByValue: true
    });
    const axeLightViolations = (axeLightEval.result.value && axeLightEval.result.value.violations) || [];
    const lightCounts = countViolations(axeLightViolations);

    // Switch to dark theme
    await send('Runtime.evaluate', { expression: `document.documentElement.setAttribute('data-theme', 'dark');` });
    await sleep(150);

    // Assert that dark theme actually changes page background
    const darkBgEval = await send('Runtime.evaluate', {
      expression: `window.getComputedStyle(document.body).backgroundColor`,
      returnByValue: true
    });
    const darkBg = darkBgEval.result.value;

    if (darkBg === lightBg) {
      console.error(`[ASSERTION FAILED] Dark mode did not change background color on ${route}! Light: ${lightBg}, Dark: ${darkBg}`);
      anyFailure = true;
    }

    // Run axe in Dark theme
    const axeDarkEval = await send('Runtime.evaluate', {
      expression: `new Promise(resolve => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }).then(resolve))`,
      awaitPromise: true,
      returnByValue: true
    });
    const axeDarkViolations = (axeDarkEval.result.value && axeDarkEval.result.value.violations) || [];
    const darkCounts = countViolations(axeDarkViolations);

    ['critical', 'serious', 'moderate', 'minor'].forEach(k => {
      totalViolationsAll[k] += lightCounts[k] + darkCounts[k];
    });

    const routeTotalViolations = lightCounts.total + darkCounts.total;
    const isPass = (route404s.length === 0 && routeNetFails.length === 0 && routeConsoleErrs.length === 0 && brokenImgs.length === 0 && routeTotalViolations === 0);

    if (!isPass) anyFailure = true;

    const statusBadge = isPass ? 'PASS' : 'FAIL';
    console.log(`[${statusBadge}] ${route.padEnd(26)} | 404s: ${route404s.length} | NetFails: ${routeNetFails.length} | ConsoleErr: ${routeConsoleErrs.length} | BrokenImg: ${brokenImgs.length} | Light: (c:${lightCounts.critical}, s:${lightCounts.serious}, m:${lightCounts.moderate}, mi:${lightCounts.minor}) | Dark: (c:${darkCounts.critical}, s:${darkCounts.serious}, m:${darkCounts.moderate}, mi:${darkCounts.minor})`);

    if (route404s.length > 0) route404s.forEach(r => console.log(`      -> 404: ${r.url}`));
    if (routeNetFails.length > 0) routeNetFails.forEach(f => console.log(`      -> NetFail: ${f.url} (${f.errorText})`));
    if (routeConsoleErrs.length > 0) routeConsoleErrs.forEach(e => console.log(`      -> ConsoleError: ${JSON.stringify(e)}`));
    if (brokenImgs.length > 0) brokenImgs.forEach(b => console.log(`      -> BrokenImg: ${b.src}`));
    if (axeLightViolations.length > 0) {
      console.log(`      -> Light Violations (${axeLightViolations.length}):`);
      axeLightViolations.forEach(v => {
        console.log(`         - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        v.nodes.forEach(n => console.log(`           Target: ${n.target.join(' ')} | HTML: ${n.html.substring(0, 100)}`));
      });
    }
    if (axeDarkViolations.length > 0) {
      console.log(`      -> Dark Violations (${axeDarkViolations.length}):`);
      axeDarkViolations.forEach(v => {
        console.log(`         - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        v.nodes.forEach(n => {
          const anyData = n.any && n.any[0] && n.any[0].data ? JSON.stringify(n.any[0].data) : '';
          console.log(`           Target: ${n.target.join(' ')} | Detail: ${anyData} | HTML: ${n.html.substring(0, 100)}`);
        });
      });
    }
  }

  // -------------------------------------------------------------
  // PASS 2: MOBILE PASS (360x640 with Touch Emulation) (Task 3)
  // -------------------------------------------------------------
  console.log('\n--- 3. MOBILE PASS (360x640 with Touch Emulation) ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });

  const mobileKeyRoutes = [
    'index.html',
    'pages/unit.html?u=1',
    'pages/quizzes.html',
    'pages/question-bank.html',
    'pages/attendance.html',
    'games/periodic-table.html',
    'games/unit1-puzzle.html',
    'games/unit2-arcade.html'
  ];

  for (const route of mobileKeyRoutes) {
    const pageUrl = `http://127.0.0.1:${PORT}/${route}`;
    await send('Page.navigate', { url: pageUrl });
    await waitForRenderSignal(send, inFlightRequests);

    const overflowCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`,
      returnByValue: true
    });

    await send('Runtime.evaluate', { expression: AXE_SRC });
    const mobAxe = await send('Runtime.evaluate', {
      expression: `new Promise(resolve => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }).then(resolve))`,
      awaitPromise: true,
      returnByValue: true
    });
    const mobViolations = (mobAxe.result.value && mobAxe.result.value.violations) || [];
    const mobCounts = countViolations(mobViolations);

    const overflow = overflowCheck.result.value;
    const mobPass = !overflow.hasHOverflow && mobCounts.total === 0;
    if (!mobPass) anyFailure = true;

    console.log(`[${mobPass ? 'PASS' : 'FAIL'}] Mobile 360x640: ${route.padEnd(24)} | H-Overflow: ${overflow.hasHOverflow ? `YES (${overflow.scrollWidth}px)` : 'NO (360px)'} | Axe: (c:${mobCounts.critical}, s:${mobCounts.serious}, m:${mobCounts.moderate}, mi:${mobCounts.minor})`);

    if (mobViolations.length > 0) {
      mobViolations.forEach(v => console.log(`      -> Mobile Axe [${v.impact}] ${v.id}: ${v.description}`));
    }
  }

  // -------------------------------------------------------------
  // PASS 3: INTERACTIVE MODALS & ACTIVE GAME STATES AUDIT (Task 3)
  // -------------------------------------------------------------
  console.log('\n--- 4. INTERACTION PASS (Active Modal & Game States) ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });

  // 1. Search Modal
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await waitForRenderSignal(send, inFlightRequests);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const searchBtn = document.querySelector('[data-search-btn]');
      if (searchBtn) searchBtn.click();
      else if (typeof window.openSearchModal === 'function') window.openSearchModal();
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    })()`
  });
  await sleep(200);
  const searchModalAxe = await auditElementState(send, '#search-modal-backdrop', 'Global Search Modal');
  if (!searchModalAxe.pass) anyFailure = true;

  // 2. Marks Modal
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/pages/quizzes.html` });
  await waitForRenderSignal(send, inFlightRequests);
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (typeof window.showQuizMarksModal === 'function') {
        window.showQuizMarksModal(1);
      } else {
        const btn = document.querySelector('button[onclick*="showQuizMarksModal"]');
        if (btn) btn.click();
      }
    })()`
  });
  await sleep(200);
  const marksModalAxe = await auditElementState(send, '#marks-modal', 'Quiz Evaluation Marks Modal');
  if (!marksModalAxe.pass) anyFailure = true;

  // 3. Periodic Table Element Detail Panel
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/games/periodic-table.html` });
  await waitForRenderSignal(send, inFlightRequests);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const elBtn = document.querySelector('.el-cell, .el-card-item');
      if (elBtn) elBtn.click();
    })()`
  });
  await sleep(200);
  const elementModalAxe = await auditElementState(send, '#element-detail-panel', 'Periodic Table Element Detail Panel');
  if (!elementModalAxe.pass) anyFailure = true;

  // 4. Word Search Mid-Game State
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/games/unit1-puzzle.html` });
  await waitForRenderSignal(send, inFlightRequests);
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (typeof window.switchPuzzleLevel === 'function') window.switchPuzzleLevel(1);
      const cells = document.querySelectorAll('.ws-cell');
      if (cells.length >= 2) {
        cells[0].click();
        cells[1].click();
      }
    })()`
  });
  await sleep(200);
  const wordSearchAxe = await auditElementState(send, '#panel-lvl-1', 'Word Search Active Game Board');
  if (!wordSearchAxe.pass) anyFailure = true;

  // -------------------------------------------------------------
  // FINAL SYNTHESIS & EXIT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('   AUDIT SUMMARY FOR REPOSITORY');
  console.log('================================================================');
  console.log(`Commit Hash:          ${commitHash}`);
  console.log(`Total Routes Audited: ${ALL_ROUTES.length}`);
  console.log(`Total HTTP 404s:      ${total404s}`);
  console.log(`Total Network Fails:  ${totalNetworkFails}`);
  console.log(`Total Console Errors: ${totalConsoleErrors}`);
  console.log(`Total Broken Images:  ${totalBrokenImages}`);
  console.log(`Total Axe Violations: Critical: ${totalViolationsAll.critical}, Serious: ${totalViolationsAll.serious}, Moderate: ${totalViolationsAll.moderate}, Minor: ${totalViolationsAll.minor}`);
  console.log(`Overall Status:       ${anyFailure ? 'FAIL' : 'PASS (ZERO VIOLATIONS)'}`);
  console.log('================================================================\n');

  edge.kill();
  server.close();
  try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (e) {}

  process.exit(anyFailure ? 1 : 0);
}

async function waitForRenderSignal(send, inFlightRequests) {
  const startTime = Date.now();
  while (Date.now() - startTime < 4000) {
    const readyStateEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const domReady = document.readyState === 'complete';
        const hasMain = Boolean(document.querySelector('main') || document.querySelector('#site-header'));
        return domReady && hasMain;
      })()`,
      returnByValue: true
    });

    if (readyStateEval.result.value && inFlightRequests.size === 0) {
      await sleep(100);
      return;
    }
    await sleep(50);
  }
}

async function auditElementState(send, selector, label) {
  await send('Runtime.evaluate', { expression: AXE_SRC });
  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('${selector}');
      if (!el) return { exists: false, visible: false };
      const st = window.getComputedStyle(el);
      const isVisible = st.display !== 'none' && st.visibility !== 'hidden' && (el.classList.contains('open') || el.classList.contains('active') || st.opacity !== '0' || el.offsetWidth > 0);
      return { exists: true, visible: isVisible };
    })()`,
    returnByValue: true
  });

  const st = check.result.value || { exists: false, visible: false };
  const axeEval = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => axe.run(document.querySelector('${selector}') || document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }).then(resolve))`,
    awaitPromise: true,
    returnByValue: true
  });

  const violations = (axeEval.result.value && axeEval.result.value.violations) || [];
  const counts = countViolations(violations);
  const pass = st.exists && st.visible && counts.total === 0;

  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label.padEnd(40)} | Exists: ${st.exists} | Visible: ${st.visible} | Axe: (c:${counts.critical}, s:${counts.serious}, m:${counts.moderate}, mi:${counts.minor})`);
  if (violations.length > 0) {
    violations.forEach(v => console.log(`      -> Modal Axe [${v.impact}] ${v.id}: ${v.description}`));
  }
  return { pass, counts };
}

function countViolations(violations) {
  let c = { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 };
  violations.forEach(v => {
    if (c[v.impact] !== undefined) {
      c[v.impact]++;
      c.total++;
    }
  });
  return c;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

main();
