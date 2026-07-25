/**
 * Screenshot Generation Script for Play Store
 * 
 * This script generates app screenshots for the Play Store listing.
 * It needs Puppeteer (install with: npm install --save-dev puppeteer)
 * 
 * Usage: node scripts/generate-screenshots.cjs
 * 
 * Each screenshot will be 1080x1920 (portrait) as required by Play Store.
 * 
 * NOTE: This requires a running dev server. Start one first with `bun run dev`,
 * then run this script pointing to the dev URL.
 * 
 * Alternatively, take screenshots manually:
 * 1. Open the app on your phone
 * 2. Navigate to each page (POS, Stock, Insights, Daftari)
 * 3. Take screenshots (Power + Volume Down on Android)
 * 4. Crop to 1080x1920
 * 5. Save to public/screenshots/ directory
 */

const DEV_URL = process.env.DEV_URL || 'http://localhost:5173';

async function generate() {
  try {
    const puppeteer = require('puppeteer');
    const { promises: fs } = require('fs');
    const path = require('path');

    // Ensure screenshots directory exists
    await fs.mkdir(path.join(__dirname, '..', 'public', 'screenshots'), { recursive: true });

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 }); // 1080x1920 effective

    const pages = [
      { url: '/pos', name: 'pos.png', desc: 'Point of Sale' },
      { url: '/stock', name: 'stock.png', desc: 'Stock Management' },
      { url: '/insights', name: 'insights.png', desc: 'Insights & Audit' },
      { url: '/daftari', name: 'daftari.png', desc: 'Daftari Debt Ledger' },
    ];

    for (const { url, name, desc } of pages) {
      try {
        console.log(`📸 Capturing ${desc}...`);
        await page.goto(`${DEV_URL}${url}`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(2000); // Let JS render

        const outputPath = path.join(__dirname, '..', 'public', 'screenshots', name);
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log(`✅ Generated ${name} (1080x1920)`);
      } catch (err) {
        console.warn(`⚠️  Failed to capture ${name}: ${err.message}`);
      }
    }

    await browser.close();
    console.log('\n✅ All screenshots generated!');
  } catch (err) {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SCREENSHOT GENERATION - MANUAL STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To generate screenshots for Play Store:

1. Open the app on your phone or in Chrome DevTools
2. Navigate to these pages:
   • /pos     → Point of Sale
   • /stock   → Stock Management  
   • /insights → Insights & Audit
   • /daftari → Daftari Debt Ledger

3. Take a screenshot on each page
4. Crop images to 1080×1920 resolution
5. Save them to: public/screenshots/
6. Files needed:
   • pos.png      (1080×1920)
   • stock.png    (1080×1920)
   • insights.png (1080×1920)
   • daftari.png  (1080×1920)

The manifest.json already references these filenames.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  }
}

generate();
