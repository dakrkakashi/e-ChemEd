/**
 * init-env.js — Auto-generate backend/.env with random ADMIN_KEY if missing
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
const ENV_FILE = path.join(BACKEND_DIR, '.env');
const EXAMPLE_FILE = path.join(BACKEND_DIR, '.env.example');

if (!fs.existsSync(ENV_FILE)) {
  let template = '';
  if (fs.existsSync(EXAMPLE_FILE)) {
    template = fs.readFileSync(EXAMPLE_FILE, 'utf-8');
  } else {
    template = `PORT=3001\nFRONTEND_PORT=3000\nADMIN_KEY=change_this\nTRUST_PROXY=false\nSESSION_CODE=\n`;
  }

  const generatedKey = crypto.randomBytes(24).toString('hex');
  const envContent = template.replace(/ADMIN_KEY=[^\r\n]*/, `ADMIN_KEY=${generatedKey}`);

  fs.writeFileSync(ENV_FILE, envContent, 'utf-8');

  console.log('\n================================================================');
  console.log('             [e-chemEd SECURITY] NEW ADMIN KEY GENERATED         ');
  console.log('================================================================');
  console.log('A secure ADMIN_KEY was created for faculty attendance exports:');
  console.log(`\n  >>> ${generatedKey} <<<\n`);
  console.log('Please save this key in a safe place. You will need it to:');
  console.log('  1. View the attendance roster at /pages/admin.html');
  console.log('  2. Download attendance CSV files');
  console.log('  3. Configure per-class session codes');
  console.log('(Stored securely in backend/.env — never committed to git)');
  console.log('================================================================\n');
} else {
  // .env already exists
  try {
    const existing = fs.readFileSync(ENV_FILE, 'utf-8');
    const match = existing.match(/ADMIN_KEY=([^\r\n]+)/);
    if (!match || match[1].includes('change_this')) {
      const generatedKey = crypto.randomBytes(24).toString('hex');
      const updated = existing.replace(/ADMIN_KEY=[^\r\n]*/, `ADMIN_KEY=${generatedKey}`);
      fs.writeFileSync(ENV_FILE, updated, 'utf-8');
      console.log(`[SECURITY] Updated placeholder ADMIN_KEY to: ${generatedKey}`);
    }
  } catch (e) {}
}
