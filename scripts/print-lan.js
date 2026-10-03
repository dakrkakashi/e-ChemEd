/**
 * print-lan.js — Prints Local & Wi-Fi LAN access links
 */

const os = require('os');

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Find IPv4 non-internal adapter
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

const lanIp = getLanIp();

console.log('\n======================================================');
console.log('      e-chemEd Engineering Chemistry Platform         ');
console.log('======================================================');
console.log('Access Links:');
console.log('  On this PC:');
console.log('    http://localhost:3000');
console.log('    Faculty Portal: http://localhost:3000/pages/admin.html\n');

if (lanIp) {
  console.log('  On Phones / Tablets on the same Wi-Fi:');
  console.log(`    http://${lanIp}:3000`);
  console.log(`    Student Attendance: http://${lanIp}:3000/pages/attendance.html`);
} else {
  console.log('  Wi-Fi network adapter not detected.');
  console.log('  Connect to Wi-Fi to allow student devices to access this PC.');
}

console.log('======================================================\n');
