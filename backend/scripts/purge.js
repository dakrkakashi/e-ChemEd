/**
 * purge.js — Attendance Data Purge Script
 * 
 * Safely removes all attendance records at the end of the academic semester.
 * Requires interactive user confirmation typing "PURGE" or --force flag.
 */

const readline = require('readline');
const { purgeAttendance, getAttendanceCount } = require('../db');

async function executePurge() {
  const count = await purgeAttendance();
  console.log(`\n[SUCCESS] Purged ${count} attendance records from echemed.db.`);
  console.log('The attendance database table is now empty and reset for the new semester.\n');
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--force') || args.includes('-y')) {
    await executePurge();
    return;
  }

  const currentCount = await getAttendanceCount();
  console.log('\n======================================================');
  console.log('           e-chemEd DATA PURGE CONFIRMATION           ');
  console.log('======================================================');
  console.log(`Current records stored in database: ${currentCount}`);
  console.log('WARNING: This action is IRREVERSIBLE.');
  console.log('All student attendance records will be permanently deleted.');
  console.log('======================================================\n');

  if (currentCount === 0) {
    console.log('Database is already empty. No records to purge.\n');
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("To confirm data deletion, type 'PURGE' and press Enter: ", async (answer) => {
    rl.close();
    if (answer.trim() === 'PURGE') {
      await executePurge();
    } else {
      console.log('\n[CANCELLED] Purge confirmation did not match. No records were deleted.\n');
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error('[PURGE ERROR]:', err);
  process.exit(1);
});
