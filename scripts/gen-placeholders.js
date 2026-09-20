const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const posterSvg = Buffer.from(`
    <svg width="500" height="750" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F172A"/>
          <stop offset="100%" stop-color="#09090C"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="20" y="20" width="460" height="710" rx="20" fill="none" stroke="#1E293B" stroke-width="2"/>
      <circle cx="250" cy="320" r="54" fill="#1E293B"/>
      <text x="250" y="340" font-family="system-ui, sans-serif" font-size="52" font-weight="900" fill="#FF3B6B" text-anchor="middle">C</text>
      <text x="250" y="420" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">CHILLER</text>
      <text x="250" y="455" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#64748B" text-anchor="middle">No Poster Preview</text>
    </svg>
  `);

  const backdropSvg = Buffer.from(`
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F172A"/>
          <stop offset="100%" stop-color="#09090C"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="640" cy="320" r="64" fill="#1E293B"/>
      <text x="640" y="344" font-family="system-ui, sans-serif" font-size="64" font-weight="900" fill="#FF3B6B" text-anchor="middle">C</text>
      <text x="640" y="420" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">CHILLER</text>
    </svg>
  `);

  await sharp(posterSvg).png().toFile(path.join(publicDir, 'placeholder-poster.png'));
  await sharp(backdropSvg).png().toFile(path.join(publicDir, 'placeholder-backdrop.png'));
  console.log('Successfully created public/placeholder-poster.png and public/placeholder-backdrop.png');
}

main().catch(console.error);
