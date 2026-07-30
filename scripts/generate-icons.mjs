import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const sizes = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
];

for (const { size, file } of sizes) {
  const svgPath = join(root, 'public/icons', `${file.replace('.png', '.svg')}`);
  const pngPath = join(root, 'public/icons', file);

  console.log(`Converting ${svgPath} → ${pngPath}...`);

  const svg = readFileSync(svgPath, 'utf-8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
    imageRendering: 1, // optimizeQuality
    shapeRendering: 2, // geometricPrecision
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  writeFileSync(pngPath, pngBuffer);
  console.log(`  ✓ ${file} (${size}x${size}) — ${(pngBuffer.length / 1024).toFixed(1)} KB`);
}

// Also generate favicon.png (48x48) from the 192 SVG
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

console.log('\n✅ All icons generated successfully!');
