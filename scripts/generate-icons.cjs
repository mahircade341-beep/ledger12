const { promises: fs } = require('fs');
const { renderAsync, Resvg } = require('@resvg/resvg-js');

async function generate() {
  const sizes = [
    { size: 192, output: 'public/icons/icon-192.png' },
    { size: 512, output: 'public/icons/icon-512.png' },
  ];

  const svg192 = await fs.readFile('public/icons/icon-192.svg', 'utf-8');
  const svg512 = await fs.readFile('public/icons/icon-512.svg', 'utf-8');

  for (const { size, output } of sizes) {
    const svg = size === 192 ? svg192 : svg512;
    const opts = {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0,0,0,0)',
      imageRendering: 'optimizeQuality',
    };
    const resvg = new Resvg(svg, opts);
    const pngBuffer = resvg.render().asPng();
    await fs.writeFile(output, pngBuffer);
    console.log(`✅ Generated ${output} (${size}x${size})`);
  }

  // Also generate smaller favicon
  const resvg16 = new Resvg(svg192, { fitTo: { mode: 'width', value: 48 }, background: 'rgba(0,0,0,0)' });
  const png16 = resvg16.render().asPng();
  await fs.writeFile('public/favicon.png', png16);
  console.log('✅ Generated public/favicon.png (48x48)');

  console.log('\n✅ All icons generated!');
}

generate().catch(console.error);
