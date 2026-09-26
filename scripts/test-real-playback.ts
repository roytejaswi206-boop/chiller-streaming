import puppeteer from 'puppeteer-core';

async function testPlayback() {
  console.log('--- Launching Chrome to test real movie playback ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const titles = [
    { name: 'Inception', id: 27205, type: 'movie' },
    { name: 'Fight Club', id: 550, type: 'movie' },
    { name: 'Interstellar', id: 157336, type: 'movie' },
  ];

  for (const item of titles) {
    console.log(`\n==============================================`);
    console.log(`Testing Title: ${item.name} (${item.id})`);
    console.log(`==============================================`);

    const url = `https://chillerstream.duckdns.org/watch/${item.type}/${item.id}`;
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));

    // Check if iframe or video exists
    const iframeHandle = await page.$('iframe');
    const videoHandle = await page.$('video');
    console.log('iframe present:', !!iframeHandle, '| video present:', !!videoHandle);

    if (iframeHandle) {
      const src = await page.evaluate(el => el?.getAttribute('src'), iframeHandle);
      console.log('iframe src:', src);
    }

    // Check player state from DOM or React state
    const playerState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasPlayerUI: !!document.querySelector('.player-container, [data-player="true"], iframe'),
        bodySnippet: text.slice(0, 200).replace(/\n/g, ' ')
      };
    });
    console.log('Player UI Status:', playerState);

    // Let it run for 5 seconds to observe any progress
    await new Promise(r => setTimeout(r, 5000));
  }

  await browser.close();
  console.log('\n--- Playback tests completed ---');
}

testPlayback().catch(console.error);
