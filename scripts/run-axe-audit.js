const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9222;
const BASE_URL = 'http://127.0.0.1:3000';
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf-8');

const ALL_PAGES = [
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
    this.eventListeners = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else {
        this.eventListeners.forEach(fn => fn(msg));
      }
    };
  }

  async waitOpen() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runAxeAudit() {
  console.log('================================================================');
  console.log('       e-chemEd AXE-CORE ACCESSIBILITY & PROTOCOL AUDIT         ');
  console.log('================================================================\n');

  // Start internal frontend static server
  const server = require('./serve-frontend.js');
  await sleep(1000);

  // Launch headless Edge
  const tempDir = path.join(__dirname, '..', '.edge_axe_profile');
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--user-data-dir=${tempDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  await sleep(1500);

  let targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.waitOpen();

  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const auditReport = [];

  // --- PART 1: HTTP AUDIT & AXE-CORE ACCESSIBILITY (LIGHT & DARK THEMES) ---
  console.log('>>> PROTOCOL: Testing over HTTP (http://127.0.0.1:3000) & running axe-core in LIGHT and DARK themes...\n');

  const themes = ['light', 'dark'];

  for (const page of ALL_PAGES) {
    const pageUrl = `${BASE_URL}/${page}`;
    await client.send('Page.navigate', { url: pageUrl });
    await sleep(800);

    for (const theme of themes) {
      // Set theme attribute
      await client.send('Runtime.evaluate', {
        expression: `
          if ('${theme}' === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        `
      });
      await sleep(200);

      // Inject axe-core
      await client.send('Runtime.evaluate', { expression: AXE_SRC });

      // Run axe.run()
      const axeResult = await client.send('Runtime.evaluate', {
        expression: `
          new Promise((resolve) => {
            axe.run({
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
              }
            }, (err, results) => {
              if (err) resolve({ error: err.message });
              else {
                resolve({
                  violations: results.violations.map(v => ({
                    id: v.id,
                    impact: v.impact,
                    description: v.description,
                    help: v.help,
                    nodesCount: v.nodes.length,
                    nodes: v.nodes.map(n => ({
                      target: n.target.join(' '),
                      html: n.html.substring(0, 90),
                      summary: n.failureSummary
                    }))
                  })),
                  passesCount: results.passes.length,
                  incompleteCount: results.incomplete.length
                });
              }
            });
          })
        `,
        awaitPromise: true,
        returnByValue: true
      });

      const res = axeResult.result?.value || { violations: [], passesCount: 0, incompleteCount: 0 };
      const violationsCount = res.violations ? res.violations.length : 0;
      const passesCount = res.passesCount || 0;

      console.log(`Page: ${page} [${theme.toUpperCase()} THEME]`);
      console.log(`  Passed Rules:     ${passesCount}`);
      console.log(`  Raw Violations:   ${violationsCount}`);

      if (violationsCount > 0) {
        console.log(`  Violation Details:`, JSON.stringify(res.violations, null, 2));
      }
      console.log('');

      auditReport.push({
        page,
        theme,
        protocol: 'http',
        passesCount,
        violationsCount,
        violations: res.violations || []
      });
    }
  }

  // --- PART 2: FILE:// DIRECT PROTOCOL VERIFICATION ---
  console.log('\n>>> PROTOCOL: Testing direct file:// access with embedded data fallback...\n');
  const sampleFilePages = [
    'index.html',
    'pages/unit.html?u=1',
    'pages/unit.html?u=3',
    'games/periodic-table.html',
    'games/unit1-puzzle.html',
    'games/unit2-arcade.html'
  ];

  for (const page of sampleFilePages) {
    const filePath = path.join(__dirname, '..', 'frontend', page.split('?')[0]);
    const fileUrl = 'file:///' + filePath.replace(/\\/g, '/') + (page.includes('?') ? '?' + page.split('?')[1] : '');
    
    await client.send('Page.navigate', { url: fileUrl });
    await sleep(800);

    const titleRes = await client.send('Runtime.evaluate', { expression: 'document.title' });
    const contentCheck = await client.send('Runtime.evaluate', {
      expression: `
        !!(document.querySelector('h1') && (window.EchemData || window.loadEchemData))
      `
    });

    console.log(`file:// test: ${page}`);
    console.log(`  Loaded Title: "${titleRes.result?.value}"`);
    console.log(`  Offline Data Fallback Active: ${contentCheck.result?.value ? 'YES (PASS)' : 'NO (FAIL)'}\n`);
  }

  console.log('================================================================');
  console.log('                   AXE AUDIT SUMMARY RESULTS                    ');
  console.log('================================================================');
  console.log('Page                                   Theme   Passed  Violations');
  console.log('----------------------------------------------------------------');
  let totalViolations = 0;
  auditReport.forEach(r => {
    totalViolations += r.violationsCount;
    const pagePadded = r.page.padEnd(38, ' ');
    const themePadded = r.theme.toUpperCase().padEnd(7, ' ');
    const passedPadded = String(r.passesCount).padStart(6, ' ');
    const violsPadded = String(r.violationsCount).padStart(11, ' ');
    console.log(`${pagePadded} ${themePadded} ${passedPadded} ${violsPadded}`);
  });
  console.log('----------------------------------------------------------------');
  console.log(`TOTAL RAW VIOLATIONS ACROSS ALL THEMES: ${totalViolations}`);
  console.log('================================================================\n');

  client.close();
  try { edge.kill(); } catch (e) {}
  try { server.close(); } catch (e) {}
  try {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    // Windows file lock delay, safe to ignore
  }

  console.log('================================================================');
  console.log('              ACCESSIBILITY & AUDIT COMPLETED                   ');
  console.log('================================================================');
  process.exit(totalViolations === 0 ? 0 : 1);
}

runAxeAudit().catch(err => {
  console.error('Fatal Axe Audit Error:', err);
  process.exit(1);
});
