const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9222;
const BASE_URL = 'http://127.0.0.1:3000';

const PAGES = [
  'index.html',
  'pages/unit.html?u=1',
  'pages/unit.html?u=2',
  'pages/quizzes.html',
  'pages/question-bank.html',
  'pages/mind-maps.html',
  'pages/video-lectures.html',
  'pages/attendance.html',
  'pages/games.html',
  'games/periodic-table.html',
  'games/unit1-puzzle.html',
  'games/unit2-arcade.html'
];

const VIEWPORTS = [
  { name: 'Mobile (360px)', width: 360, height: 740, mobile: true },
  { name: 'Desktop (1280px)', width: 1280, height: 800, mobile: false }
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
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

  onEvent(fn) {
    this.eventListeners.push(fn);
  }

  close() {
    this.ws.close();
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('   e-chemEd HEADLESS EDGE BROWSER & CONSOLE AUDIT (360px & 1280px)  ');
  console.log('================================================================\n');

  // 1. Launch Edge
  const tempDir = path.join(__dirname, '..', '.edge_audit_profile');
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  await sleep(1500);

  let targets;
  try {
    targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  } catch (e) {
    console.error('Failed to communicate with Edge CDP:', e.message);
    edge.kill();
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  if (!pageTarget) {
    console.error('No page target found in Edge.');
    edge.kill();
    process.exit(1);
  }

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.waitOpen();

  // Enable domains
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');

  const auditResults = [];

  for (const page of PAGES) {
    const pageUrl = `${BASE_URL}/${page}`;
    console.log(`\nTesting Page: ${page}`);
    console.log('----------------------------------------------------');

    for (const vp of VIEWPORTS) {
      const consoleErrors = [];
      const failedRequests = [];

      const eventHandler = (msg) => {
        if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            consoleErrors.push(text);
          }
        } else if (msg.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
        } else if (msg.method === 'Network.responseReceived') {
          const resp = msg.params.response;
          if (resp.status >= 400) {
            failedRequests.push(`${resp.status} ${resp.statusText} -> ${resp.url}`);
          }
        }
      };

      client.onEvent(eventHandler);

      // Set viewport
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });

      // Navigate
      await client.send('Page.navigate', { url: pageUrl });
      await sleep(1000);

      // Verify DOM
      const titleRes = await client.send('Runtime.evaluate', { expression: 'document.title' });
      const pageTitle = titleRes.result?.value || 'Untitled';

      const navCheck = await client.send('Runtime.evaluate', { 
        expression: '!!(document.querySelector("#site-header") && document.querySelector("#site-footer"))' 
      });
      const hasHeaderFooter = navCheck.result?.value;

      // Extract all internal links on page to verify no broken targets
      const linksRes = await client.send('Runtime.evaluate', {
        expression: `
          Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.getAttribute('href'))
            .filter(h => h && !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('mailto:'))
        `,
        returnByValue: true
      });
      const internalLinks = linksRes.result?.value || [];

      // Check broken links on this page
      const brokenLinks = [];
      for (const link of internalLinks) {
        if (link.includes('${')) continue; // Skip unrendered template string if any
        try {
          const checkUrl = new URL(link, pageUrl).href;
          const status = await new Promise(res => {
            http.get(checkUrl, r => res(r.statusCode)).on('error', () => res(500));
          });
          if (status === 404 || status >= 500) {
            brokenLinks.push(`${link} (HTTP ${status})`);
          }
        } catch (e) {
          brokenLinks.push(`${link} (Invalid URL)`);
        }
      }

      // Remove listener for next iteration
      client.eventListeners = client.eventListeners.filter(h => h !== eventHandler);

      const isPass = consoleErrors.length === 0 && failedRequests.length === 0 && brokenLinks.length === 0;

      console.log(`  [${vp.name}] Status: ${isPass ? 'PASS' : 'FAIL'} | Title: "${pageTitle.slice(0, 45)}..."`);
      if (consoleErrors.length > 0) {
        console.log(`    ! Console Errors (${consoleErrors.length}):`, consoleErrors);
      }
      if (failedRequests.length > 0) {
        console.log(`    ! Failed Network Requests (${failedRequests.length}):`, failedRequests);
      }
      if (brokenLinks.length > 0) {
        console.log(`    ! Broken Internal Links (${brokenLinks.length}):`, brokenLinks);
      }

      auditResults.push({
        page,
        viewport: vp.name,
        width: vp.width,
        pass: isPass,
        pageTitle,
        consoleErrors,
        failedRequests,
        brokenLinks
      });
    }
  }

  client.close();
  edge.kill();

  console.log('\n================================================================');
  console.log('                    AUDIT SUMMARY REPORT                        ');
  console.log('================================================================');

  const totalRuns = auditResults.length;
  const passedRuns = auditResults.filter(r => r.pass).length;
  const failedRuns = totalRuns - passedRuns;

  console.log(`Total Viewport Tests Conducted: ${totalRuns} (12 pages x 2 viewports)`);
  console.log(`Successful Tests:              ${passedRuns}`);
  console.log(`Failed Tests:                  ${failedRuns}`);

  if (failedRuns === 0) {
    console.log('\n>>> RESULT: 100% CLEAN BILL OF HEALTH! NO CONSOLE ERRORS, NO BROKEN LINKS, NO 404s <<<\n');
  } else {
    console.log('\n>>> SOME TESTS FAILED. PLEASE REVIEW DETAILS ABOVE <<<\n');
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
