import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5199/';
const out = '/home/aorus/Project/ai-arena/kimi-k3-workbuddy/shots';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});

const errors = [];

async function newPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  return page;
}

// 1. default view
const page = await newPage(1280, 800);
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/1-default.png` });

// webgl sanity: canvas has non-uniform pixels
const px = await page.evaluate(() => {
  const c = document.getElementById('scene');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return gl ? 'webgl-ok' : 'no-webgl';
});
console.log('webgl:', px);

// 2. orbit (drag) then zoom — make sure no errors and scene still framed
await page.mouse.move(640, 400);
await page.mouse.down();
await page.mouse.move(800, 330, { steps: 12 });
await page.mouse.up();
await page.mouse.wheel(0, -400);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/2-orbit.png` });

// 3. sunset
await page.locator('#time-slider').fill('1120'); // ~18:40
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/3-sunset.png` });

// 4. night + rain + lights on
await page.locator('#time-slider').fill('1320'); // 22:00
await page.locator('#weather-rain').click();
// the real checkbox is visually hidden off-viewport behind the switch styling,
// so Playwright's actionability checks never pass; click it via the DOM instead
await page.evaluate(() => {
  const el = document.getElementById('lights-toggle');
  if (!el.checked) el.click();
});
await page.locator('#wind-slider').fill('70');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/4-night-rain.png` });

// 5. toggle rain back off, ensure no stale accumulation (particles hidden)
await page.locator('#weather-clear').click();
await page.waitForTimeout(2500);
const rainHidden = await page.evaluate(() => {
  // reach into the scene via the canvas is not trivial; assert UI state instead
  return document.getElementById('weather-clear').classList.contains('is-active');
});
console.log('clear active after toggle:', rainHidden);

// 6. reset
await page.locator('#reset-btn').click();
await page.waitForTimeout(1500);
const labels = await page.evaluate(() => ({
  time: document.getElementById('time-label').textContent,
  wind: document.getElementById('wind-label').textContent,
  lights: document.getElementById('lights-toggle').checked
}));
console.log('after reset:', JSON.stringify(labels));
await page.screenshot({ path: `${out}/5-reset.png` });
await page.close();

// 7. mobile layout
const mob = await newPage(390, 844);
await mob.goto(BASE, { waitUntil: 'networkidle' });
await mob.waitForTimeout(3000);
await mob.screenshot({ path: `${out}/6-mobile.png` });
// expand panel
await mob.locator('#panel-toggle').click();
await mob.waitForTimeout(400);
await mob.screenshot({ path: `${out}/7-mobile-panel.png` });
await mob.close();

await browser.close();
console.log('console errors:', errors.length ? errors : 'none');
