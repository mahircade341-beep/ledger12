import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── PWA Icons ──
const iconSizes = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
];

for (const { size, file } of iconSizes) {
  const svgPath = join(root, 'public/icons', `${file.replace('.png', '.svg')}`);
  const pngPath = join(root, 'public/icons', file);

  console.log(`Converting ${svgPath} → ${pngPath}...`);

  const svg = readFileSync(svgPath, 'utf-8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
    imageRendering: 1,
    shapeRendering: 2,
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  writeFileSync(pngPath, pngBuffer);
  console.log(`  ✓ ${file} (${size}x${size}) — ${(pngBuffer.length / 1024).toFixed(1)} KB`);
}

// ── Favicon ──
console.log('\nGenerating favicon.png (48x48)...');
const svg192 = readFileSync(join(root, 'public/icons/icon-192.svg'), 'utf-8');
const favicon = new Resvg(svg192, {
  fitTo: { mode: 'width', value: 48 },
  background: 'rgba(0,0,0,0)',
  imageRendering: 1,
  shapeRendering: 2,
});
const faviconData = favicon.render();
writeFileSync(join(root, 'public/favicon.png'), faviconData.asPng());
console.log(`  ✓ favicon.png (48x48)`);

// ── iOS Splash Screens ──
// Key portrait sizes for modern iOS devices
const splashSizes = [
  // iPhone 15 Pro Max / 14 Plus / 13 Pro Max
  { width: 1290, height: 2796, name: 'splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 15 Pro / 15 / 14 Pro / 14 / 13 Pro
  { width: 1179, height: 2556, name: 'splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 13 / 13 mini / 12 / 12 Pro
  { width: 1170, height: 2532, name: 'splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone SE 3rd gen / 8 / 7 / 6s
  { width: 750, height: 1334, name: 'splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad Pro 12.9" (5th/6th gen)
  { width: 2048, height: 2732, name: 'splash-2048x2732.png', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad Pro 11" (4th gen)
  { width: 1668, height: 2388, name: 'splash-1668x2388.png', media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad Air / iPad 10th gen
  { width: 1640, height: 2360, name: 'splash-1640x2360.png', media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad mini 6th gen
  { width: 1488, height: 2266, name: 'splash-1488x2266.png', media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)' },
];

console.log('\nGenerating iOS splash screens...');

// Ensure splash output directory exists
const splashDir = join(root, 'public/splash');
try { mkdirSync(splashDir, { recursive: true }); } catch {}

const splashSvg = readFileSync(join(splashDir, 'splash.svg'), 'utf-8');

for (const { width, height, name } of splashSizes) {
  const pngPath = join(splashDir, name);
  console.log(`  Generating ${name} (${width}x${height})...`);

  const resvg = new Resvg(splashSvg, {
    fitTo: { mode: 'width', value: Math.max(width, height) },
    background: 'rgba(0,0,0,0)',
    imageRendering: 1,
    shapeRendering: 2,
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  writeFileSync(pngPath, pngBuffer);
  console.log(`    ✓ ${(pngBuffer.length / 1024).toFixed(1)} KB`);
}

console.log(`\n✅ All ${splashSizes.length} splash screens generated!`);
