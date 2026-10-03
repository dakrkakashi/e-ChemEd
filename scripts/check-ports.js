/**
 * check-ports.js — Verify ports 3000 and 3001 are available
 */

const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.once('close', () => resolve(true)).close();
    });
    server.listen(port, '0.0.0.0');
  });
}

async function main() {
  const p3000Free = await checkPort(3000);
  const p3001Free = await checkPort(3001);

  if (!p3000Free || !p3001Free) {
    console.error('\n======================================================');
    console.error('              [PORT CONFLICT DETECTED]                ');
    console.error('======================================================');
    if (!p3000Free) {
      console.error('Port 3000 (Frontend) is currently in use by another program.');
    }
    if (!p3001Free) {
      console.error('Port 3001 (Backend API) is currently in use by another program.');
    }
    console.error('An existing e-chemEd instance may already be running.');
    console.error('Please run "stop.bat" (Windows) or "./stop.sh" (Linux/macOS)');
    console.error('to terminate the previous process, then try again.');
    console.error('======================================================\n');
    process.exit(1);
  }

  process.exit(0);
}

main();
