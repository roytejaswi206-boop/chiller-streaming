const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. MASTER SVG GENERATOR
// Always uses standard 512x512 coordinate space with viewBox="0 0 512 512",
// so it cleanly scales to ANY output width/height!
function getChillerSvg({
  width = 512,
  height = 512,
  mode = 'app-icon', // 'app-icon' | 'maskable' | 'favicon' | 'monochrome' | 'light' | 'transparent' | 'watermark'
  scale = 1.0,
  cx = 256,
  cy = 256
} = {}) {
  const rOut = 168 * scale;
  const rIn = 82 * scale;

  // Key terminal points (scaled around cx, cy)
  const pTopOut = { x: cx + (340 - 256) * scale, y: cy + (146 - 256) * scale };
  const pTopIn  = { x: cx + (284 - 256) * scale, y: cy + (198 - 256) * scale };
  const pBotIn  = { x: cx + (300 - 256) * scale, y: cy + (284 - 256) * scale };
  const pBotOut = { x: cx + (356 - 256) * scale, y: cy + (330 - 256) * scale };

  const cPath = `
    M ${pTopOut.x.toFixed(2)} ${pTopOut.y.toFixed(2)}
    A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 1 0 ${pBotOut.x.toFixed(2)} ${pBotOut.y.toFixed(2)}
    L ${pBotIn.x.toFixed(2)} ${pBotIn.y.toFixed(2)}
    A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 1 1 ${pTopIn.x.toFixed(2)} ${pTopIn.y.toFixed(2)}
    Z
  `;

  // Play triangle
  const triLeft = cx + (208 - 256) * scale;
  const triRight = cx + (312 - 256) * scale;
  const triHalfH = 48 * scale;
  const triRadius = 13 * scale;

  const triTop = cy - triHalfH;
  const triBottom = cy + triHalfH;

  const triPath = `
    M ${(triLeft + triRadius).toFixed(2)} ${triTop.toFixed(2)}
    L ${(triRight - triRadius * 1.3).toFixed(2)} ${(cy - triRadius * 0.7).toFixed(2)}
    Q ${triRight.toFixed(2)} ${cy.toFixed(2)} ${(triRight - triRadius * 1.3).toFixed(2)} ${(cy + triRadius * 0.7).toFixed(2)}
    L ${(triLeft + triRadius).toFixed(2)} ${triBottom.toFixed(2)}
    Q ${triLeft} ${triBottom} ${triLeft} ${(triBottom - triRadius).toFixed(2)}
    L ${triLeft} ${(triTop + triRadius).toFixed(2)}
    Q ${triLeft} ${triTop} ${(triLeft + triRadius).toFixed(2)} ${triTop.toFixed(2)}
    Z
  `;

  // Backgrounds & Fills
  let bg = '#09090C';
  let cFill = 'url(#cGrad)';
  let triFill = 'url(#triGrad)';
  let opacity = 1.0;

  if (mode === 'monochrome') {
    bg = '#09090C';
    cFill = '#FFFFFF';
    triFill = '#FFFFFF';
  } else if (mode === 'light') {
    bg = '#FFFFFF';
    cFill = '#09090C';
    triFill = '#09090C';
  } else if (mode === 'watermark') {
    bg = 'none';
    cFill = '#FFFFFF';
    triFill = '#FF3B6B';
    opacity = 0.45;
  } else if (mode === 'transparent') {
    bg = 'none';
  }

  // Gradients
  const gradDefs = `
    <linearGradient id="cGrad" x1="${cx - 156 * scale}" y1="${cy - 136 * scale}" x2="${cx + 24 * scale}" y2="${cy + 174 * scale}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="42%" stop-color="#FFFFFF" />
      <stop offset="56%" stop-color="#FFA8BC" />
      <stop offset="72%" stop-color="#FF3B6B" />
      <stop offset="100%" stop-color="#FF1A50" />
    </linearGradient>
    <linearGradient id="triGrad" x1="${triLeft}" y1="${triTop}" x2="${triRight}" y2="${triBottom}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF4776" />
      <stop offset="100%" stop-color="#FF2458" />
    </linearGradient>
  `;

  // Squircle vs Circle vs None
  let bgElement = '';
  if (mode === 'app-icon' || mode === 'monochrome' || mode === 'light') {
    const rx = 126;
    bgElement = `
      <rect width="512" height="512" rx="${rx}" fill="${bg}" />
      <rect width="510" height="510" x="1" y="1" rx="${rx}" fill="none" stroke="${mode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}" stroke-width="2" />
    `;
  } else if (mode === 'favicon') {
    bgElement = `<circle cx="256" cy="256" r="256" fill="${bg}" />`;
  } else if (mode === 'maskable') {
    bgElement = `<rect width="512" height="512" fill="${bg}" />`;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradDefs}
  </defs>

  ${bgElement}

  <g opacity="${opacity}">
    <!-- The "C" Symbol -->
    <path d="${cPath}" fill="${cFill}" stroke="${cFill}" stroke-width="${12 * scale}" stroke-linejoin="round" stroke-linecap="round" />

    <!-- The Play Triangle -->
    <path d="${triPath}" fill="${triFill}" />
  </g>
</svg>
  `.trim();
}

// 2. CHILLER HORIZONTAL LOCKUP SVG (Emblem + Wordmark)
function getChillerHorizontalSvg({ width = 640, height = 160 } = {}) {
  const emblemSvg = getChillerSvg({
    width: 512,
    height: 512,
    mode: 'transparent',
    scale: 0.92,
    cx: 256,
    cy: 256
  });

  const innerDefs = emblemSvg.match(/<defs>([\s\S]*?)<\/defs>/)[1];
  const innerPaths = emblemSvg.match(/<g opacity="1">([\s\S]*?)<\/g>/)[1];

  return `
<svg width="${width}" height="${height}" viewBox="0 0 640 160" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${innerDefs}
  </defs>

  <!-- Emblem scaled to 130x130 at x=15, y=15 -->
  <g transform="translate(15, 15) scale(0.254)">
    ${innerPaths}
  </g>

  <!-- Wordmark "CHILLER" in modern geometric sans-serif -->
  <text x="175" y="105" fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="76" font-weight="900" letter-spacing="0.10em">CHILLER</text>
</svg>
  `.trim();
}

// 3. SOCIAL OPENGRAPH IMAGE (1200x630)
function getChillerOgSvg() {
  const width = 1200;
  const height = 630;
  const emblemSvg = getChillerSvg({
    width: 512,
    height: 512,
    mode: 'transparent',
    scale: 1.0,
    cx: 256,
    cy: 256
  });

  const innerDefs = emblemSvg.match(/<defs>([\s\S]*?)<\/defs>/)[1];
  const innerPaths = emblemSvg.match(/<g opacity="1">([\s\S]*?)<\/g>/)[1];

  return `
<svg width="${width}" height="${height}" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${innerDefs}
    <radialGradient id="bgGlow" cx="50%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#1A0D15" />
      <stop offset="60%" stop-color="#09090C" />
      <stop offset="100%" stop-color="#050507" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGlow)" />

  <!-- Subtle ambient glow under emblem -->
  <circle cx="600" cy="220" r="160" fill="#FF3B6B" opacity="0.12" />

  <!-- Centered Emblem -->
  <g transform="translate(460, 80) scale(0.55)">
    ${innerPaths}
  </g>

  <!-- Wordmark -->
  <text x="600" y="445" text-anchor="middle" fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="64" font-weight="900" letter-spacing="0.14em">CHILLER</text>

  <!-- Tagline / Subtitle -->
  <text x="600" y="500" text-anchor="middle" fill="#94A3B8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="22" font-weight="500" letter-spacing="0.06em">Movies, Anime &amp; TV Shows</text>
</svg>
  `.trim();
}

// 4. SPLASH SCREEN (1080x1920)
function getChillerSplashSvg() {
  const emblemSvg = getChillerSvg({
    width: 512,
    height: 512,
    mode: 'transparent',
    scale: 1.0,
    cx: 256,
    cy: 256
  });

  const innerDefs = emblemSvg.match(/<defs>([\s\S]*?)<\/defs>/)[1];
  const innerPaths = emblemSvg.match(/<g opacity="1">([\s\S]*?)<\/g>/)[1];

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${innerDefs}
  </defs>

  <!-- Pure dark background -->
  <rect width="1080" height="1920" fill="#09090C" />

  <!-- Centered Emblem (scale 0.72 -> 368x368 at x=356, y=720) -->
  <g transform="translate(356, 720) scale(0.72)">
    ${innerPaths}
  </g>

  <!-- Wordmark -->
  <text x="540" y="1170" text-anchor="middle" fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="52" font-weight="900" letter-spacing="0.16em">CHILLER</text>
</svg>
  `.trim();
}

async function main() {
  console.log('=== STARTING CHILLER OFFICIAL BRAND ASSET GENERATION ===\n');

  ['public/icons', 'public/branding', 'public'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 1. SAVE MASTER VECTOR SVGS
  const masterIconSvg = getChillerSvg({ width: 512, height: 512, mode: 'app-icon' });
  const masterTransparentSvg = getChillerSvg({ width: 512, height: 512, mode: 'transparent' });
  const masterFaviconSvg = getChillerSvg({ width: 512, height: 512, mode: 'favicon' });
  const masterMaskableSvg = getChillerSvg({ width: 512, height: 512, mode: 'maskable', scale: 0.74 });
  const masterMonoSvg = getChillerSvg({ width: 512, height: 512, mode: 'monochrome' });
  const masterLightSvg = getChillerSvg({ width: 512, height: 512, mode: 'light' });
  const masterHorizontalSvg = getChillerHorizontalSvg();
  const masterOgSvg = getChillerOgSvg();
  const masterSplashSvg = getChillerSplashSvg();

  fs.writeFileSync('public/branding/chiller-logo.svg', masterIconSvg);
  fs.writeFileSync('public/branding/chiller-emblem.svg', masterTransparentSvg);
  fs.writeFileSync('public/branding/chiller-horizontal.svg', masterHorizontalSvg);
  fs.writeFileSync('public/favicon.svg', masterFaviconSvg);

  console.log('✅ Generated Master Vector SVGs');

  // 2. GENERATE PWA ICONS (/public/icons/chiller-*.png)
  const pwaSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];
  for (const s of pwaSizes) {
    const svgForSize = getChillerSvg({ width: s, height: s, mode: 'app-icon' });
    await sharp(Buffer.from(svgForSize))
      .resize(s, s)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(`public/icons/chiller-${s}.png`);

    await sharp(Buffer.from(svgForSize))
      .resize(s, s)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(`public/icons/icon-${s}.png`);

    console.log(`  - public/icons/chiller-${s}.png (${s}x${s})`);
  }

  // 3. GENERATE MASKABLE ICONS (Safe zone inside 80% circle)
  const maskableSizes = [192, 384, 512];
  for (const s of maskableSizes) {
    const maskableSvg = getChillerSvg({ width: 512, height: 512, mode: 'maskable', scale: 0.74 });
    await sharp(Buffer.from(maskableSvg))
      .resize(s, s)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(`public/icons/chiller-maskable-${s}.png`);

    await sharp(Buffer.from(maskableSvg))
      .resize(s, s)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(`public/icons/icon-maskable-${s}.png`);

    console.log(`  - public/icons/chiller-maskable-${s}.png (${s}x${s})`);
  }

  // 4. GENERATE MONOCHROME ICONS
  for (const s of [192, 512]) {
    const monoSvg = getChillerSvg({ width: 512, height: 512, mode: 'monochrome', scale: 0.74 });
    await sharp(Buffer.from(monoSvg))
      .resize(s, s)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(`public/icons/chiller-monochrome-${s}.png`);
    console.log(`  - public/icons/chiller-monochrome-${s}.png (${s}x${s})`);
  }

  // 5. GENERATE FAVICONS
  for (const s of [16, 32, 48]) {
    const favSvg = getChillerSvg({ width: 512, height: 512, mode: 'favicon', scale: 0.95 });
    await sharp(Buffer.from(favSvg))
      .resize(s, s)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(`public/favicon-${s}x${s}.png`);
    if (s === 32) {
      await sharp(Buffer.from(favSvg)).resize(32, 32).png().toFile('public/favicon.png');
      await sharp(Buffer.from(favSvg)).resize(32, 32).png().toFile('public/favicon.ico');
    }
    console.log(`  - public/favicon-${s}x${s}.png (${s}x${s})`);
  }

  // Apple touch icons
  const appleSvg = getChillerSvg({ width: 512, height: 512, mode: 'app-icon' });
  await sharp(Buffer.from(appleSvg)).resize(180, 180).png({ quality: 100 }).toFile('public/apple-touch-icon.png');
  await sharp(Buffer.from(appleSvg)).resize(180, 180).png({ quality: 100 }).toFile('public/apple-touch-icon-precomposed.png');
  await sharp(Buffer.from(appleSvg)).resize(180, 180).png({ quality: 100 }).toFile('public/icons/icon-180.png');
  console.log('  - public/apple-touch-icon.png (180x180)');

  // 6. GENERATE BRANDING DIRECTORY ASSETS
  const appIconSvg512 = getChillerSvg({ width: 512, height: 512, mode: 'app-icon' });
  await sharp(Buffer.from(appIconSvg512)).png().toFile('public/branding/chiller-app-icon.png');
  await sharp(Buffer.from(appIconSvg512)).webp({ quality: 95 }).toFile('public/branding/chiller-app-icon.webp');
  await sharp(Buffer.from(appIconSvg512)).png().toFile('public/branding/chiller-logo.png');

  const maskable512 = getChillerSvg({ width: 512, height: 512, mode: 'maskable', scale: 0.74 });
  await sharp(Buffer.from(maskable512)).png().toFile('public/branding/chiller-app-icon-maskable.png');

  const emblem512 = getChillerSvg({ width: 512, height: 512, mode: 'transparent' });
  await sharp(Buffer.from(emblem512)).png().toFile('public/branding/chiller-icon-emblem.png');
  await sharp(Buffer.from(emblem512)).webp({ quality: 95 }).toFile('public/branding/chiller-icon-emblem.webp');

  const master1024 = getChillerSvg({ width: 512, height: 512, mode: 'app-icon' });
  await sharp(Buffer.from(master1024)).resize(1024, 1024).png().toFile('public/branding/chiller-master-logo.png');
  await sharp(Buffer.from(master1024)).resize(1024, 1024).webp({ quality: 95 }).toFile('public/branding/chiller-master-logo.webp');

  await sharp(Buffer.from(masterHorizontalSvg)).png().toFile('public/branding/chiller-logo-horizontal.png');
  await sharp(Buffer.from(masterHorizontalSvg)).webp({ quality: 95 }).toFile('public/branding/chiller-logo-horizontal.webp');

  // Wordmark transparent
  const wordmarkSvg = `
<svg width="568" height="105" viewBox="0 0 568 105" fill="none" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="78" text-anchor="middle" fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="78" font-weight="900" letter-spacing="0.12em">CHILLER</text>
</svg>
  `.trim();
  await sharp(Buffer.from(wordmarkSvg)).png().toFile('public/branding/chiller-wordmark.png');
  await sharp(Buffer.from(wordmarkSvg)).webp({ quality: 95 }).toFile('public/branding/chiller-wordmark.webp');

  // Player Watermark (128x128 transparent watermark)
  const watermarkSvg = getChillerSvg({ width: 512, height: 512, mode: 'watermark', scale: 0.9 });
  await sharp(Buffer.from(watermarkSvg)).resize(128, 128).png().toFile('public/branding/chiller-player-watermark.png');

  // Social OpenGraph Image (1200x630)
  await sharp(Buffer.from(masterOgSvg)).jpeg({ quality: 90 }).toFile('public/branding/og-image.jpg');

  // Splash Screen (1080x1920)
  await sharp(Buffer.from(masterSplashSvg)).png().toFile('public/branding/splash-screen.png');
  await sharp(Buffer.from(masterSplashSvg)).webp({ quality: 95 }).toFile('public/branding/splash-screen.webp');

  console.log('\n✅ All official CHILLER brand assets generated successfully!');
}

main().catch(console.error);
