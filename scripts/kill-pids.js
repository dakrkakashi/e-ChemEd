/**
 * kill-pids.js — Terminates e-chemEd backend & frontend processes
 * 
 * Reads .pids file to kill only e-chemEd processes, and cleans up .pids.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PID_FILE = path.resolve(__dirname, '..', '.pids');

let pids = [];

if (fs.existsSync(PID_FILE)) {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf-8');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const parts = line.split('=');
      const pid = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(pid) && pid > 0) {
        pids.push(pid);
      }
    }
  } catch (e) {}
}

const isWin = process.platform === 'win32';

if (pids.length > 0) {
  console.log(`Stopping e-chemEd server processes (PIDs: ${pids.join(', ')})...`);
  for (const pid of pids) {
    try {
      if (isWin) {
        cp.execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGKILL');
      }
      console.log(`[STOPPED] Terminated PID ${pid}`);
    } catch (e) {
      // Process might have already stopped
    }
  }
} else {
  console.log('No active .pids file found. Checking ports 3000 and 3001...');
}

// Fallback cleanup by port on Windows
if (isWin) {
  try {
    const ports = [3000, 3001];
    for (const port of ports) {
      try {
        const out = cp.execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
        const lines = out.split('\n').filter(l => l.includes('LISTENING'));
        for (const l of lines) {
          const parts = l.trim().split(/\s+/);
          const portPid = parts[parts.length - 1];
          if (portPid && !isNaN(portPid) && portPid !== '0') {
            cp.execSync(`taskkill /F /PID ${portPid}`, { stdio: 'ignore' });
            console.log(`[STOPPED] Cleaned up port ${port} (PID ${portPid})`);
          }
        }
      } catch (err) {}
    }
  } catch (e) {}
}

// Remove .pids file
if (fs.existsSync(PID_FILE)) {
  try {
    fs.unlinkSync(PID_FILE);
  } catch (e) {}
}

console.log('\n[SUCCESS] e-chemEd servers have been stopped.');
