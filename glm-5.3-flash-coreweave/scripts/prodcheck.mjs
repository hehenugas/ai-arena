/* Production-build check: load dist via preview server, screenshot, count errors. */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const SHELL =
  '/tmp/opencode/browsers/chrome-headless-shell/linux-154.0.8037.57/chrome-headless-shell-linux64/chrome-headless-shell';
const OUT = path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await puppeteer.launch({
  executablePath: SHELL,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--window-size=1280,800'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto('http://127.0.0.1:5290/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3500));

const state = await page.evaluate(() => ({
  loading: !!document.getElementById('loading'),
  errorShown: (() => {
    const e = document.getElementById('webgl-error');
    return !!e && !e.hidden;
  })(),
  label: document.getElementById('time-label')?.textContent ?? null,
  canvas: !!document.getElementById('scene'),
}));
console.log('prod state:', JSON.stringify(state));
await page.screenshot({ path: path.join(OUT, '11-prod-default.png') });

// exercise the UI without scene internals: chips + reset + rain
await page.click('[data-weather="rain"]');
await page.click('[data-time="1380"]');
await page.click('#lights-toggle');
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: path.join(OUT, '12-prod-rainy-night.png') });
await page.click('#reset');
await new Promise((r) => setTimeout(r, 1500));
const afterReset = await page.evaluate(() => ({
  label: document.getElementById('time-label').textContent,
  wind: document.getElementById('wind-label').textContent,
  lights: document.getElementById('lights-toggle').getAttribute('aria-pressed'),
  clear: document.querySelector('[data-weather="clear"]').classList.contains('is-active'),
}));
console.log('prod reset:', JSON.stringify(afterReset));

console.log('errors:', errors.length ? errors.join('\n') : '(none)');
await browser.close();
