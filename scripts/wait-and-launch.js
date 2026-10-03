/**
 * wait-and-launch.js — Polls backend health, records PIDs to .pids, and opens browser
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3001/api/health', { timeout: 1000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ok === true);
        } catch (e) {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function recordPortPids() {
  const isWin = process.platform === 'win32';
  const pidFile = path.resolve(__dirname, '..', '.pids');
  let bPid = null;
  let fPid = null;

  if (isWin) {
    try {
      const out = cp.execSync('netstat -ano', { encoding: 'utf-8' });
      for (const line of out.split(/\r?\n/)) {
        if (line.includes('LISTENING')) {
          if (line.includes(':3001')) {
            const parts = line.trim().split(/\s+/);
            bPid = parts[parts.length - 1];
          } else if (line.includes(':3000')) {
            const parts = line.trim().split(/\s+/);
            fPid = parts[parts.length - 1];
          }
        }
      }
    } catch (e) {}
  } else {
    try {
      bPid = cp.execSync('lsof -ti:3001 2>/dev/null', { encoding: 'utf-8' }).trim().split('\n')[0];
    } catch (e) {}
    try {
      fPid = cp.execSync('lsof -ti:3000 2>/dev/null', { encoding: 'utf-8' }).trim().split('\n')[0];
    } catch (e) {}
  }

  if (bPid || fPid) {
    let content = '';
    if (bPid) content += `BACKEND_PID=${bPid}\n`;
    if (fPid) content += `FRONTEND_PID=${fPid}\n`;
    fs.writeFileSync(pidFile, content, 'utf-8');
  }
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      cp.exec(`start "" "${url}"`);
    } else if (platform === 'darwin') {
      cp.exec(`open "${url}"`);
    } else {
      cp.exec(`xdg-open "${url}"`);
    }
  } catch (e) {
    // Fail silently if browser open command cannot be executed
  }
}

async function main() {
  let attempts = 0;
  const maxAttempts = 30; // 12 seconds max

  while (attempts < maxAttempts) {
    const ok = await checkHealth();
    if (ok) {
      // Backend is online! Record PIDs and open browser
      recordPortPids();
      openBrowser('http://localhost:3000');
      process.exit(0);
    }
    attempts++;
    await new Promise(r => setTimeout(r, 400));
  }

  console.warn('[WARNING] Backend health probe timed out after 12 seconds.');
  recordPortPids();
  openBrowser('http://localhost:3000');
  process.exit(0);
}

main();
