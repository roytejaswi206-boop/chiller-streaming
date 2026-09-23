const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const masterPath = 'public/branding/chiller-master-logo.png';
  if (!fs.existsSync(masterPath)) {
    console.error('Master image not found at', masterPath);
    process.exit(1);
  }

  // Ensure output directories exist
  ['public/branding', 'public/icons', 'app'].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  console.log('1. Extracting high-res emblem & creating alpha-feathered mask...');

  // 1. Raw centered emblem crop (600x600)
  const rawEmblemBuffer = await sharp(masterPath)
    .extract({ left: 212, top: 105, width: 600, height: 600 })
    .toBuffer();

  // Create smooth feathered alpha mask for seamless blending
  const maskSvg = Buffer.from(`
    <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="feather" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="97%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="url(#feather)" />
    </svg>
  `);

  const maskBuffer = await sharp(maskSvg).toColourspace('b-w').toBuffer();

  const featheredEmblemBuffer = await sharp(rawEmblemBuffer)
    .ensureAlpha()
    .composite([{ input: maskBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Save isolated emblem assets
  await sharp(featheredEmblemBuffer)
    .png({ quality: 100 })
    .toFile('public/branding/chiller-icon-emblem.png');

  await sharp(featheredEmblemBuffer)
    .webp({ quality: 95 })
    .toFile('public/branding/chiller-icon-emblem.webp');

  console.log('2. Extracting wordmark & tagline...');

  // 2. CHILLER Wordmark
  const wordmarkBuffer = await sharp(masterPath)
    .extract({ left: 228, top: 712, width: 568, height: 105 })
    .toBuffer();

  await sharp(wordmarkBuffer)
    .png({ quality: 100 })
    .toFile('public/branding/chiller-wordmark.png');

  await sharp(wordmarkBuffer)
    .webp({ quality: 95 })
    .toFile('public/branding/chiller-wordmark.webp');

  // Tagline "WATCH BEYOND"
  const taglineBuffer = await sharp(masterPath)
    .extract({ left: 228, top: 815, width: 568, height: 50 })
    .toBuffer();

  await sharp(taglineBuffer)
    .png({ quality: 100 })
    .toFile('public/branding/chiller-tagline.png');

  console.log('3. Generating horizontal logo lockup...');

  // 3. Horizontal Lockup for Navbar and Headers (Emblem on left + Wordmark on right)
  const navEmblem = await sharp(featheredEmblemBuffer)
    .resize(90, 90, { fit: 'contain' })
    .toBuffer();

  const navWordmark = await sharp(wordmarkBuffer)
    .resize(null, 46, { fit: 'contain' })
    .toBuffer();

  const navWordmarkMeta = await sharp(navWordmark).metadata();

  const lockupWidth = 90 + 16 + navWordmarkMeta.width + 16;
  const lockupHeight = 100;

  const lockupBg = Buffer.from(`
    <svg width="${lockupWidth}" height="${lockupHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${lockupWidth}" height="${lockupHeight}" fill="#08090c" rx="14" ry="14" />
    </svg>
  `);

  await sharp(lockupBg)
    .composite([
      { input: navEmblem, left: 6, top: 5 },
      { input: navWordmark, left: 112, top: Math.round((lockupHeight - navWordmarkMeta.height) / 2) }
    ])
    .png()
    .toFile('public/branding/chiller-logo-horizontal.png');

  await sharp('public/branding/chiller-logo-horizontal.png')
    .webp({ quality: 95 })
    .toFile('public/branding/chiller-logo-horizontal.webp');

  console.log('4. Building master App Icon (launcher)...');

  // 4. Standalone App Icon (512x512)
  // Designed per Sections 3, 4, 5:
  // Rounded squircle container, dark glass interior, glowing pink/magenta & violet/cyan rim, centered C+Play emblem.
  const iconSize = 512;
  const emblemInIconSize = 380;

  const scaledEmblem = await sharp(featheredEmblemBuffer)
    .resize(emblemInIconSize, emblemInIconSize, { fit: 'contain' })
    .toBuffer();

  const squircleSvg = Buffer.from(`
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="46%" r="65%">
          <stop offset="0%" stop-color="#141524"/>
          <stop offset="55%" stop-color="#0c0d14"/>
          <stop offset="100%" stop-color="#08090c"/>
        </radialGradient>
        <linearGradient id="rimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff3b6b"/>
          <stop offset="35%" stop-color="#ff3b6b" stop-opacity="0.85"/>
          <stop offset="65%" stop-color="#7044ff" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
        <linearGradient id="innerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Outer dark background -->
      <rect width="${iconSize}" height="${iconSize}" fill="#08090c" rx="115" ry="115" />

      <!-- Glowing rim neon stroke -->
      <rect x="18" y="18" width="${iconSize - 36}" height="${iconSize - 36}" rx="100" ry="100" fill="url(#bgGlow)" stroke="url(#rimGlow)" stroke-width="4.5" />

      <!-- Inner glass highlight border -->
      <rect x="23" y="23" width="${iconSize - 46}" height="${iconSize - 46}" rx="96" ry="96" fill="none" stroke="url(#innerGlow)" stroke-width="1.5" />
    </svg>
  `);

  const emblemPos = Math.round((iconSize - emblemInIconSize) / 2);

  const baseAppIcon = await sharp(squircleSvg)
    .composite([{ input: scaledEmblem, left: emblemPos, top: emblemPos }])
    .png()
    .toBuffer();

  await sharp(baseAppIcon)
    .toFile('public/branding/chiller-app-icon.png');

  await sharp(baseAppIcon)
    .webp({ quality: 95 })
    .toFile('public/branding/chiller-app-icon.webp');

  console.log('5. Building maskable App Icon with safe-zone margin...');

  // 5. Maskable Icon (512x512)
  // Per Section 8: Safe zone is 80% circle (diameter 410px in center).
  // Emblem scaled to 310px so it sits safely inside the circle with plenty of margin.
  const maskableEmblemSize = 310;
  const maskableEmblem = await sharp(featheredEmblemBuffer)
    .resize(maskableEmblemSize, maskableEmblemSize, { fit: 'contain' })
    .toBuffer();

  const maskableBgSvg = Buffer.from(`
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="maskBgGlow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#141524"/>
          <stop offset="60%" stop-color="#0c0d14"/>
          <stop offset="100%" stop-color="#08090c"/>
        </radialGradient>
      </defs>
      <!-- Full-bleed background for Android Adaptive Icon masking -->
      <rect width="${iconSize}" height="${iconSize}" fill="url(#maskBgGlow)" />
    </svg>
  `);

  const maskablePos = Math.round((iconSize - maskableEmblemSize) / 2);
  const baseMaskableIcon = await sharp(maskableBgSvg)
    .composite([{ input: maskableEmblem, left: maskablePos, top: maskablePos }])
    .png()
    .toBuffer();

  await sharp(baseMaskableIcon)
    .toFile('public/branding/chiller-app-icon-maskable.png');

  console.log('6. Generating responsive PWA and launcher icon suite...');

  // 6. Generate all launcher sizes (16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512)
  const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];

  for (const s of sizes) {
    // Generate regular icon
    await sharp(baseAppIcon)
      .resize(s, s)
      .png()
      .toFile(`public/icons/icon-${s}.png`);

    // Maskable variants for PWA sizes
    if ([192, 384, 512].includes(s)) {
      await sharp(baseMaskableIcon)
        .resize(s, s)
        .png()
        .toFile(`public/icons/icon-maskable-${s}.png`);
    }
  }

  console.log('7. Generating Apple Touch icons & favicons...');

  // 7. Apple Touch Icon (180x180)
  await sharp(baseAppIcon)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  await sharp(baseAppIcon)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon-precomposed.png');

  // Favicons
  await sharp(baseAppIcon)
    .resize(16, 16)
    .png()
    .toFile('public/favicon-16x16.png');

  await sharp(baseAppIcon)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32x32.png');

  await sharp(baseAppIcon)
    .resize(48, 48)
    .png()
    .toFile('public/favicon-48x48.png');

  await sharp(baseAppIcon)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.png');

  await sharp(baseAppIcon)
    .resize(32, 32)
    .toFile('public/favicon.ico');

  await sharp(baseAppIcon)
    .resize(32, 32)
    .toFile('app/favicon.ico');

  console.log('8. Generating player watermark...');

  // 8. Player Watermark (low visual weight, subtle emblem with 35% opacity)
  const watermarkEmblem = await sharp(featheredEmblemBuffer)
    .resize(120, 120, { fit: 'contain' })
    .composite([{
      input: Buffer.from([255, 255, 255, 90]), // 35% opacity
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in'
    }])
    .png()
    .toFile('public/branding/chiller-player-watermark.png');

  console.log('9. Generating Social OG image (1200x630)...');

  // 9. OpenGraph Social Share Card (1200x630)
  const ogWidth = 1200;
  const ogHeight = 630;

  const masterSquare = await sharp(masterPath)
    .resize(560, 560, { fit: 'contain' })
    .toBuffer();

  const ogBgSvg = Buffer.from(`
    <svg width="${ogWidth}" height="${ogHeight}" viewBox="0 0 ${ogWidth} ${ogHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ogGlow1" cx="25%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff3b6b" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#ff3b6b" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="ogGlow2" cx="75%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#7044ff" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#7044ff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${ogWidth}" height="${ogHeight}" fill="#08090c" />
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#ogGlow1)" />
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#ogGlow2)" />
    </svg>
  `);

  await sharp(ogBgSvg)
    .composite([
      { input: masterSquare, left: Math.round((ogWidth - 560) / 2), top: Math.round((ogHeight - 560) / 2) }
    ])
    .jpeg({ quality: 92 })
    .toFile('public/branding/og-image.jpg');

  console.log('10. Generating mobile splash screen...');

  // 10. Mobile Splash Screen Art
  const splashMobileSvg = Buffer.from(`
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="splashGlow" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stop-color="#ff3b6b" stop-opacity="0.14"/>
          <stop offset="45%" stop-color="#7044ff" stop-opacity="0.09"/>
          <stop offset="100%" stop-color="#08090c" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="#08090c" />
      <rect width="1080" height="1920" fill="url(#splashGlow)" />
    </svg>
  `);

  const splashEmblem = await sharp(featheredEmblemBuffer)
    .resize(440, 440, { fit: 'contain' })
    .toBuffer();

  const splashWordmark = await sharp(wordmarkBuffer)
    .resize(null, 82, { fit: 'contain' })
    .toBuffer();
  const splashWordmarkMeta = await sharp(splashWordmark).metadata();

  const splashTagline = await sharp(taglineBuffer)
    .resize(null, 26, { fit: 'contain' })
    .toBuffer();
  const splashTaglineMeta = await sharp(splashTagline).metadata();

  await sharp(splashMobileSvg)
    .composite([
      { input: splashEmblem, left: Math.round((1080 - 440) / 2), top: 630 },
      { input: splashWordmark, left: Math.round((1080 - splashWordmarkMeta.width) / 2), top: 1110 },
      { input: splashTagline, left: Math.round((1080 - splashTaglineMeta.width) / 2), top: 1205 }
    ])
    .png()
    .toFile('public/branding/splash-screen.png');

  await sharp('public/branding/splash-screen.png')
    .webp({ quality: 92 })
    .toFile('public/branding/splash-screen.webp');

  console.log('BRAND ASSET SUITE FULLY BUILT!');
}

main().catch(err => {
  console.error('Fatal error building brand assets:', err);
  process.exit(1);
});
