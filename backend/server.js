/**
 * server.js — e-chemEd Express API Server (Standalone Local Runtime)
 * 
 * Binds to 0.0.0.0 so students on the same Wi-Fi can submit attendance.
 * Provides health check, rate-limited attendance submission, and faculty admin endpoints.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration from backend/.env if present
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = require('./app');
const { dbEngine } = require('./db');

const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_PORT = String(process.env.FRONTEND_PORT || '3000');

// Start listening on all network interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`e-chemEd Backend running on http://0.0.0.0:${PORT}`);
  console.log(`Database Engine: ${dbEngine}`);
  console.log(`Allowing frontend requests from port ${FRONTEND_PORT}`);
  console.log(`=================================================`);
});

// Process signal handling for clean exit
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

app.server = server;
app.close = function (cb) {
  return server.close(cb);
};

module.exports = app;
