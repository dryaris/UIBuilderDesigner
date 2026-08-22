import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
  ],
  ignoreDefaultArgs: ['--enable-automation'],
});

const page = await browser.newPage();

const errors = [];
const consoleMessages = [];

page.on('console', msg => {
  consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', err => {
  errors.push(`PAGE ERROR: ${err.message}\n${err.stack}`);
});

page.on('requestfailed', req => {
  errors.push(`REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`);
});

try {
  console.log('Navigating...');
  const response = await page.goto('http://localhost:5173/', {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
  console.log('Status:', response?.status());

  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      childCount: root ? root.childElementCount : -1,
      innerHTML: root ? root.innerHTML.substring(0, 2000) : 'NO ROOT',
      hasEditor: !!document.querySelector('.editor'),
      title: document.title,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
    };
  });

  console.log('\n=== RENDER STATUS ===');
  console.log('Root children:', result.childCount);
  console.log('Has .editor:', result.hasEditor);
  console.log('Body bg:', result.bodyBg);
  console.log('Title:', result.title);
  console.log('HTML preview:', result.innerHTML.substring(0, 500));

  if (consoleMessages.length > 0) {
    console.log('\n=== CONSOLE ===');
    consoleMessages.forEach(m => console.log(m));
  }

  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\n=== NO ERRORS ===');
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}
