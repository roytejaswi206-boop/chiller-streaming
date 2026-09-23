# CHILLER — Brand Identity & Design System Specification
**Version:** 2.0 (Super Master Edition)  
**Status:** Canonical Brand Architecture  
**Tagline:** *WATCH BEYOND*  
**Core Mission:** Standalone, cinematic, immersive streaming and discovery platform.

---

## 1. Master Brand Identity Overview

CHILLER represents high-end cinematic entertainment, futuristic atmosphere, and digital immersion. The visual identity distinguishes itself from legacy streaming providers (Netflix, Prime, Disney+, Crunchyroll) by featuring a bespoke **C-Emblem** housing a dimensional **Play Triangle** within an ultra-deep luminous glass squircle.

```
       ┌───────────────────────────────┐
       │   Master Visual Architecture   │
       │   Deep Cosmic Onyx (#09090C)   │
       │     + Luminous Coral/Magenta   │
       │     + Electric Violet/Blue     │
       │     + Luminous Glass C-Emblem  │
       │     + Integrated Play Triangle │
       └───────────────────────────────┘
```

---

## 2. Brand Asset System & Directory Hierarchy

All production assets are managed under `/public` with structured subdirectories:

| Category | File Path | Format | Dimensions | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Master Artwork** | `/public/branding/chiller-master-logo.png` | PNG/WebP | 1024×1024 | Full brand composition with typography & tagline |
| **Master Emblem** | `/public/branding/chiller-icon-emblem.webp` | WebP | 600×600 | Feathered alpha emblem for headers, UI, cards |
| **Wordmark** | `/public/branding/chiller-wordmark.webp` | WebP | 568×105 | Isolated typography with luminous pink capsule "I" |
| **Tagline** | `/public/branding/chiller-tagline.png` | PNG | 390×28 | "WATCH BEYOND" isolated typography |
| **Horizontal Lockup** | `/public/branding/chiller-logo-horizontal.webp` | WebP | 640×160 | Header lockup (Emblem + Wordmark + Tagline) |
| **App Launcher Icon** | `/public/branding/chiller-app-icon.webp` | WebP | 512×512 | Standalone launcher icon inside glowing squircle |
| **Maskable Icon** | `/public/branding/chiller-app-icon-maskable.png`| PNG | 512×512 | Android adaptive icon with 80% safe zone |
| **Player Watermark** | `/public/branding/chiller-player-watermark.png` | PNG | 128×128 | Non-obtrusive 35% opacity emblem for player |
| **Social / OpenGraph** | `/public/branding/og-image.jpg` | JPG | 1200×630 | Social sharing preview card (Twitter/Discord/FB) |
| **Splash Screen** | `/public/branding/splash-screen.webp` | WebP | 1080×1920 | Mobile launch & PWA splash composition |
| **Favicon Multi-size** | `/public/favicon-*.png` & `/public/favicon.ico` | PNG/ICO | 16/32/48 | Browser tab identity |
| **Vector Favicon** | `/public/favicon.svg` | SVG | Scalable | Modern browser vector favicon |
| **Apple Touch Icon** | `/public/apple-touch-icon.png` | PNG | 180×180 | iOS Safari Add to Home Screen |
| **PWA Icon Suite** | `/public/icons/icon-*x*.png` | PNG | 16 to 512 | Full progressive web app installation suite |

---

## 3. Launcher App Icon Geometry & Safe Zone

### Absolute Design Law: Emblem Only
> [!IMPORTANT]
> The launcher app icon MUST NEVER contain text, "CHILLER", or the "WATCH BEYOND" tagline. At 16px to 96px, typography devolves into visual noise. Visual recognition is driven strictly by the **C + Play silhouette** and luminous rim lighting.

### Android Adaptive Maskable Safe Zone
Android devices crop launcher icons using dynamic masks (circle, rounded squircle, teardrop).
- **Canvas Size:** 512×512 px.
- **Safe Zone Circle:** Radius 205 px (diameter 410 px = 80% of canvas).
- **Emblem Size inside Maskable:** Scaled to 310×310 px centered at (256, 256).
- **Guarantee:** Zero clipping of the C-curve, internal play triangle, or outer rim glow regardless of OEM launcher shape.

```
       +-------------------------+
       |   512x512 Background    |
       |      (Deep Onyx)        |
       |     .------------.      |
       |    /   Safe Zone  \     |  Safe Zone: 80% (r=205px)
       |   |   +--------+   |    |
       |   |   |   C    |   |    |  Emblem: 310x310px
       |   |   |  PLAY  |   |    |  Zero clipping on any mask
       |   |   +--------+   |    |
       |    \              /     |
       |     '------------'      |
       +-------------------------+
```

---

## 4. Color Palette & CSS Token Architecture

```css
:root {
  /* CHILLER Core Brand Foundation */
  --chiller-dark: #09090C;             /* Deepest cinematic black */
  --chiller-surface: #0F172A;          /* Slate-900 surface canvas */
  --chiller-surface-elevated: #1E293B; /* Slate-800 interactive card */
  --chiller-border: rgba(255, 255, 255, 0.08);

  /* Signature Luminous Accents */
  --chiller-pink: #FF3B6B;             /* Primary brand energy */
  --chiller-magenta: #D946EF;          /* Mid-gradient illumination */
  --chiller-violet: #8A5CFF;           /* Secondary atmospheric glow */
  --chiller-cyan: #38BDF8;             /* Tertiary cool rim reflection */

  /* Content & Contrast */
  --chiller-text: #F8FAFC;             /* High-contrast pristine white */
  --chiller-muted: #94A3B8;            /* Secondary typography */
}
```

### Signature Gradient Language
- **Cinematic Light Direction:** Coral `#FF3B6B` (0%) → Magenta `#D946EF` (40%) → Violet `#8A5CFF` (70%) → Cyan `#38BDF8` (100%).
- **Rule:** Use subtle ambient blooms (`blur-3xl`, `opacity-15` to `opacity-25`). Never overwhelm video poster artwork or catalog content.

---

## 5. Logo Usage Rules & Guidelines

### Do:
1. **Desktop Header:** Pair the 32px master emblem with the isolated wordmark (`/branding/chiller-wordmark.webp`) and responsive `WATCH BEYOND` tagline.
2. **Mobile Header:** Use the emblem + wordmark with tagline collapsed to prevent clutter on small screens.
3. **Player Watermark:** Display `/branding/chiller-player-watermark.png` (35% opacity) at bottom-right or top-left without obstructing player controls.
4. **Dark Canvas:** Always present CHILLER on dark surfaces (`#09090C` or `#0F172A`).
5. **Clear Space:** Maintain minimum clear padding equal to 50% of the emblem's width around all lockups.

### Don't:
1. **NEVER** embed the wordmark or tagline inside the launcher icon or favicons.
2. **NEVER** stretch, distort, squish, or rotate the C-geometry or play triangle.
3. **NEVER** recolor the emblem to arbitrary colors (e.g. green, yellow, brown).
4. **NEVER** place the logo on light/white backgrounds without dark glass container isolation.
5. **NEVER** add drop-shadow filters heavier than `0 4px 20px rgba(255,59,107,0.4)`.

---

## 6. Progressive Web App (PWA) & Standalone Experience

- **Application Name:** `CHILLER`
- **Short Name:** `CHILLER`
- **Display Mode:** `standalone`
- **Theme Color:** `#09090C`
- **Background Color:** `#09090C`
- **Safe Area Insets:** Respected with `pt-safe` and `pb-safe` utilities.
- **Service Worker (`public/sw.js`):** Pre-caches essential brand assets, icons, fonts, and the standalone offline fallback shell (`/offline.html`).
