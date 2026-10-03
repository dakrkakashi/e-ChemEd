/**
 * launch-servers.js — Launches Backend and Frontend in separate titled windows
 * 
 * Works cleanly on Windows, macOS, and Linux without shell quoting issues.
 * Saves process IDs to .pids for clean shutdown.
 */

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const PID_FILE = path.join(ROOT_DIR, '.pids');

const isWin = process.platform === 'win32';

let backendProcess, frontendProcess;

if (isWin) {
  // Use PowerShell Start-Process to accurately capture real Node process IDs
  const psCmd = `
    $b = Start-Process -FilePath "node.exe" -ArgumentList "server.js" -WorkingDirectory "${BACKEND_DIR.replace(/\\/g, '\\\\')}" -PassThru
    $f = Start-Process -FilePath "node.exe" -ArgumentList "${path.join(ROOT_DIR, 'scripts', 'serve-frontend.js').replace(/\\/g, '\\\\')}" -WorkingDirectory "${ROOT_DIR.replace(/\\/g, '\\\\')}" -PassThru
    "BACKEND_PID=" + $b.Id + "\`r\`nFRONTEND_PID=" + $f.Id | Out-File -Encoding utf8 -FilePath "${PID_FILE.replace(/\\/g, '\\\\')}"
  `;

  try {
    cp.execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd.replace(/\r?\n/g, ' ')}"`, {
      stdio: 'ignore'
    });
    console.log('[SERVERS] Started e-chemEd backend & frontend servers in background.');
  } catch (err) {
    console.error('Failed to start servers via PowerShell:', err.message);
  }
} else {
  // macOS / Linux
  backendProcess = cp.spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    detached: true,
    stdio: 'ignore'
  });
  backendProcess.unref();

  frontendProcess = cp.spawn('node', [path.join(ROOT_DIR, 'scripts', 'serve-frontend.js')], {
    cwd: ROOT_DIR,
    detached: true,
    stdio: 'ignore'
  });
  frontendProcess.unref();

  fs.writeFileSync(PID_FILE, `BACKEND_PID=${backendProcess.pid}\nFRONTEND_PID=${frontendProcess.pid}\n`, 'utf-8');
  console.log('[SERVERS] Started e-chemEd backend & frontend servers in background.');
}
