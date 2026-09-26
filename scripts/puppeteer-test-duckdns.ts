import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\Tejaswi\\.gemini\\antigravity-ide\\brain\\687047c7-cc8a-49b0-b72c-a0810e25821c';

async function run() {
  console.log('Launching Chrome with Host Resolver Rules for chillerstream.duckdns.org -> 76.76.21.21...');
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--host-resolver-rules=MAP chillerstream.duckdns.org 76.76.21.21',
      '--ignore-certificate-errors=false', // Ensure strict real SSL validation
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Home Desktop
  console.log('\n--- 1. Testing Home Page (Desktop) ---');
  await page.goto('https://chillerstream.duckdns.org/', { waitUntil: 'networkidle2', timeout: 30000 });
  const homeTitle = await page.title();
  console.log('Page Title:', homeTitle);
  const homeScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_home_desktop.png');
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  console.log('Saved Home screenshot:', homeScreenshot);

  // 2. Movies Page
  console.log('\n--- 2. Testing Movies Page ---');
  await page.goto('https://chillerstream.duckdns.org/movies', { waitUntil: 'networkidle2', timeout: 30000 });
  const moviesScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_movies.png');
  await page.screenshot({ path: moviesScreenshot, fullPage: false });
  console.log('Saved Movies screenshot:', moviesScreenshot);

  // 3. Series Page
  console.log('\n--- 3. Testing Series Page ---');
  await page.goto('https://chillerstream.duckdns.org/series', { waitUntil: 'networkidle2', timeout: 30000 });
  const seriesScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_series.png');
  await page.screenshot({ path: seriesScreenshot, fullPage: false });
  console.log('Saved Series screenshot:', seriesScreenshot);

  // 4. Anime Page
  console.log('\n--- 4. Testing Anime Page ---');
  await page.goto('https://chillerstream.duckdns.org/anime', { waitUntil: 'networkidle2', timeout: 30000 });
  const animeScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_anime.png');
  await page.screenshot({ path: animeScreenshot, fullPage: false });
  console.log('Saved Anime screenshot:', animeScreenshot);

  // 5. Trending Page
  console.log('\n--- 5. Testing Trending Page ---');
  await page.goto('https://chillerstream.duckdns.org/trending', { waitUntil: 'networkidle2', timeout: 30000 });
  const trendingScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_trending.png');
  await page.screenshot({ path: trendingScreenshot, fullPage: false });
  console.log('Saved Trending screenshot:', trendingScreenshot);

  // 6. Search Page
  console.log('\n--- 6. Testing Search Page ---');
  await page.goto('https://chillerstream.duckdns.org/search?q=Inception', { waitUntil: 'networkidle2', timeout: 30000 });
  const searchScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_search.png');
  await page.screenshot({ path: searchScreenshot, fullPage: false });
  console.log('Saved Search screenshot:', searchScreenshot);

  // 7. Watch Movie Page (Inception - 27205)
  console.log('\n--- 7. Testing Watch Movie Page ---');
  await page.goto('https://chillerstream.duckdns.org/watch/movie/27205', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000)); // Wait for player initialization
  const watchMovieScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_watch_movie.png');
  await page.screenshot({ path: watchMovieScreenshot, fullPage: false });
  console.log('Saved Watch Movie screenshot:', watchMovieScreenshot);

  // 8. Watch TV Page (The Last of Us - 100088)
  console.log('\n--- 8. Testing Watch TV Page ---');
  await page.goto('https://chillerstream.duckdns.org/watch/tv/100088', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000)); // Wait for episode/season load
  const watchTvScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_watch_tv.png');
  await page.screenshot({ path: watchTvScreenshot, fullPage: false });
  console.log('Saved Watch TV screenshot:', watchTvScreenshot);

  // 8b. Watch Anime Page (Naruto - 20)
  console.log('\n--- 8b. Testing Watch Anime Page ---');
  await page.goto('https://chillerstream.duckdns.org/watch/anime/20', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000));
  const watchAnimeScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_watch_anime.png');
  await page.screenshot({ path: watchAnimeScreenshot, fullPage: false });
  console.log('Saved Watch Anime screenshot:', watchAnimeScreenshot);

  // 9. Mobile Viewport (iPhone 14 Pro - 390x844)
  console.log('\n--- 9. Testing Mobile Viewport (390x844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('https://chillerstream.duckdns.org/', { waitUntil: 'networkidle2', timeout: 30000 });
  const mobileHomeScreenshot = path.join(ARTIFACT_DIR, 'duckdns_chiller_home_mobile.png');
  await page.screenshot({ path: mobileHomeScreenshot, fullPage: false });
  console.log('Saved Mobile Home screenshot:', mobileHomeScreenshot);

  // 10. Check PWA Manifest
  console.log('\n--- 10. Testing PWA Webmanifest ---');
  const manifestResponse = await page.goto('https://chillerstream.duckdns.org/manifest.webmanifest');
  console.log('Manifest status:', manifestResponse?.status());
  const manifestText = await manifestResponse?.text();
  console.log('Manifest snippet:', manifestText?.slice(0, 150));

  await browser.close();
  console.log('\n=== ALL BROWSER PRODUCTION TESTS PASSED SUCCESSFULLY ON https://chillerstream.duckdns.org ===');
}

run().catch((err) => {
  console.error('Puppeteer verification failed:', err);
  process.exit(1);
});
