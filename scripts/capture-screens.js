const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9222;
const BASE_URL = 'http://127.0.0.1:3000';

const prefix = process.argv[2] || 'before';

const TARGETS = [
  { name: `${prefix}_home.png`, path: 'index.html' },
  { name: `${prefix}_unit1.png`, path: 'pages/unit.html?u=1' },
  { name: `${prefix}_qbank.png`, path: 'pages/question-bank.html' },
  { name: `${prefix}_ptable.png`, path: 'games/periodic-table.html' }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
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

async function capture() {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Start internal server if not already running
  try {
    require('./server.js');
  } catch (e) {
    // Already running
  }
  await sleep(500);

  const tempDir = path.join(__dirname, '..', '.edge_snap_profile');
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

  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.waitOpen();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  for (const item of TARGETS) {
    const url = `${BASE_URL}/${item.path}`;
    console.log(`Navigating to ${url}...`);
    await client.send('Page.navigate', { url });
    await sleep(1500);

    // Ensure light theme first
    await client.send('Runtime.evaluate', {
      expression: `
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('echemed_theme');
      `
    });
    await sleep(300);

    // Light screenshot
    const shot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false
    });

    const outPath = path.join(screenshotsDir, item.name);
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${outPath}`);

    // If 'after', also capture dark theme
    if (prefix === 'after') {
      const evalRes = await client.send('Runtime.evaluate', {
        expression: `
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.getAttribute('data-theme');
        `,
        returnByValue: true
      });
      console.log('Dark eval result:', JSON.stringify(evalRes));
      await sleep(600);

      const darkShot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });

      const darkName = item.name.replace('.png', '_dark.png');
      const darkOutPath = path.join(screenshotsDir, darkName);
      fs.writeFileSync(darkOutPath, Buffer.from(darkShot.data, 'base64'));
      console.log(`Saved dark screenshot: ${darkOutPath}`);
    }
  }

  client.close();
  try {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}

  process.exit(0);
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
