import puppeteer from 'puppeteer-core';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  console.log('Testing incognito browser verification on production...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--incognito'
    ]
  });

  try {
    const page = await browser.newPage();
    const targetUrl = 'https://chillerstream.duckdns.org/googleb07fec170ef4d920.html';
    
    console.log(`Navigating to ${targetUrl} in Incognito Chrome...`);
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });

    const status = response?.status();
    const headers = response?.headers() || {};
    const text = (await page.evaluate(() => document.body.innerText)).trim();

    console.log('Target URL:', targetUrl);
    console.log('HTTP Status:', status);
    console.log('Content-Type:', headers['content-type']);
    console.log('Body Text:', JSON.stringify(text));

    const expected = 'google-site-verification: googleb07fec170ef4d920.html';
    if (status === 200 && text === expected) {
      console.log('✅ INCOGNITO VERIFICATION: PASS');
    } else {
      console.error('❌ INCOGNITO VERIFICATION: FAIL');
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
