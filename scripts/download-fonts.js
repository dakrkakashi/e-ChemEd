const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location, headers));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function run() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  const queries = [
    {
      family: 'Newsreader',
      url: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&display=swap'
    },
    {
      family: 'Instrument Sans',
      url: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'
    },
    {
      family: 'IBM Plex Mono',
      url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap'
    }
  ];

  for (const q of queries) {
    const cssBuf = await get(q.url, { 'User-Agent': userAgent });
    const css = cssBuf.toString('utf-8');
    
    // We split into font-face blocks
    const blocks = css.split('@font-face').slice(1);
    for (const b of blocks) {
      // prefer latin
      if (!b.includes('unicode-range') || b.includes('U+0000-00FF') || b.includes('latin')) {
        const weightMatch = b.match(/font-weight:\s*([^;]+);/);
        const styleMatch = b.match(/font-style:\s*([^;]+);/);
        const urlMatch = b.match(/url\((https:\/\/[^)]+\.woff2)\)/);
        if (!weightMatch || !urlMatch) continue;
        
        const weight = weightMatch[1].trim();
        const style = styleMatch ? styleMatch[1].trim() : 'normal';
        const fontUrl = urlMatch[1];
        
        const slug = q.family.toLowerCase().replace(/\s+/g, '-');
        const weightClean = weight.includes(' ') ? 'var' : weight;
        const filename = `${slug}-${style}-${weightClean}.woff2`;
        const targetPath = path.join(fontsDir, filename);
        
        if (!fs.existsSync(targetPath)) {
          console.log(`Downloading ${q.family} ${style} ${weightClean} -> ${filename}...`);
          const fontData = await get(fontUrl);
          fs.writeFileSync(targetPath, fontData);
        }
      }
    }
  }

  // Create OFL license notice in fonts directory
  const licenseContent = `# Typography Licenses

All fonts utilized in e-chemEd are open-source and licensed under the SIL Open Font License (OFL), Version 1.1.
They are fully self-hosted locally within \`assets/fonts/\` to function without external dependencies, working offline and over HTTP.

1. **Newsreader**
   - Designer: Production Type (Hugues Gentile)
   - License: SIL Open Font License, Version 1.1
   - Website: https://github.com/productiontype/Newsreader

2. **Instrument Sans**
   - Designer: Instrument & Rodrigo Fuenzalida
   - License: SIL Open Font License, Version 1.1
   - Website: https://github.com/Instrument/Instrument-Sans

3. **IBM Plex Mono**
   - Designer: Mike Abbink, Bold Monday
   - License: SIL Open Font License, Version 1.1
   - Website: https://github.com/IBM/plex
`;

  fs.writeFileSync(path.join(fontsDir, 'FONTS_LICENSE.md'), licenseContent, 'utf-8');
  console.log('Fonts license file generated.');
  console.log('Files in assets/fonts:', fs.readdirSync(fontsDir));
}

run().catch(console.error);
