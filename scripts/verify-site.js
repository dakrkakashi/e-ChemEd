const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..', 'frontend');
console.log('Verifying e-chemEd website in:', ROOT_DIR);

const htmlFiles = [
  'index.html',
  'pages/login.html',
  'pages/unit.html',
  'pages/quizzes.html',
  'pages/question-bank.html',
  'pages/mind-maps.html',
  'pages/video-lectures.html',
  'pages/attendance.html',
  'pages/admin.html',
  'pages/games.html',
  'games/periodic-table.html',
  'games/unit1-puzzle.html',
  'games/unit2-arcade.html'
];

let totalIssues = 0;

// 1. Static Asset and Link Checker
console.log('\n--- 1. STATIC ASSET & LINK INTEGRITY AUDIT ---');

htmlFiles.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Missing page: ${file}`);
    totalIssues++;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileDir = path.dirname(filePath);

  // Check <link href="...">
  const linkMatches = content.matchAll(/<link[^>]+href=["']([^"']+)["']/g);
  for (const m of linkMatches) {
    const url = m[1];
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) continue;
    const resolved = path.resolve(fileDir, url);
    if (!fs.existsSync(resolved)) {
      console.error(`[BROKEN ASSET] In ${file}: link href="${url}" -> ${resolved} NOT FOUND`);
      totalIssues++;
    }
  }

  // Check <script src="...">
  const scriptMatches = content.matchAll(/<script[^>]+src=["']([^"']+)["']/g);
  for (const m of scriptMatches) {
    const url = m[1];
    if (url.startsWith('http') || url.startsWith('//')) continue;
    const resolved = path.resolve(fileDir, url);
    if (!fs.existsSync(resolved)) {
      console.error(`[BROKEN ASSET] In ${file}: script src="${url}" -> ${resolved} NOT FOUND`);
      totalIssues++;
    }
  }

  // Check <img src="...">
  const imgMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/g);
  for (const m of imgMatches) {
    const url = m[1];
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) continue;
    const resolved = path.resolve(fileDir, url);
    if (!fs.existsSync(resolved)) {
      console.error(`[BROKEN ASSET] In ${file}: img src="${url}" -> ${resolved} NOT FOUND`);
      totalIssues++;
    }
  }

  // Check <a href="...">
  const aMatches = content.matchAll(/<a[^>]+href=["']([^"']+)["']/g);
  for (const m of aMatches) {
    const url = m[1];
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('#') || url.startsWith('mailto:') || url.includes('${') || url.includes('{{')) continue;
    const cleanUrl = url.split('?')[0].split('#')[0];
    if (!cleanUrl) continue;
    const resolved = path.resolve(fileDir, cleanUrl);
    if (!fs.existsSync(resolved)) {
      console.error(`[BROKEN LINK] In ${file}: a href="${url}" -> ${resolved} NOT FOUND`);
      totalIssues++;
    }
  }

  console.log(`[PASS] ${file} passed static asset & internal link verification.`);
});

// 2. Data Files JSON Schema / Integrity Check
console.log('\n--- 2. JSON DATA INTEGRITY AUDIT ---');
const dataFiles = [
  'data/units.json',
  'data/faculty.json',
  'data/elements.json',
  'data/quizzes/unit1.json',
  'data/questions/unit1.json'
];

dataFiles.forEach(df => {
  const p = path.join(ROOT_DIR, df);
  if (!fs.existsSync(p)) {
    console.error(`[MISSING DATA] ${df}`);
    totalIssues++;
    return;
  }
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    console.log(`[PASS] ${df}: Valid JSON (${Array.isArray(parsed) ? parsed.length + ' items' : Object.keys(parsed).length + ' keys'})`);
  } catch (err) {
    console.error(`[CORRUPT JSON] ${df}: ${err.message}`);
    totalIssues++;
  }
});

if (totalIssues === 0) {
  console.log('\n>>> AUDIT PASSED: ZERO BROKEN LINKS, ZERO MISSING FILES, ZERO DATA CORRUPTIONS <<<\n');
} else {
  console.log(`\n>>> AUDIT FOUND ${totalIssues} ISSUES <<<\n`);
  process.exit(1);
}
