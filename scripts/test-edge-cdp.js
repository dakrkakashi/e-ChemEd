const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;

console.log('Testing Edge headless launch...');
const edgeProcess = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.join(__dirname, '..', '.edge_temp_profile'),
  'about:blank'
], { stdio: 'ignore' });

setTimeout(() => {
  http.get(`http://127.0.0.1:${PORT}/json/version`, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Edge CDP Version Response:', data);
      edgeProcess.kill();
    });
  }).on('error', err => {
    console.error('CDP connection error:', err.message);
    edgeProcess.kill();
  });
}, 2000);
