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
await page.goto('http://127.0.0.1:5210/', { waitUntil: 'networkidle0' });
for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.__pw).catch(() => false)); i++) {
  await new Promise((r) => setTimeout(r, 250));
}
await new Promise((r) => setTimeout(r, 800));

// midnight
await page.evaluate(() => window.__pw.store.set({ timeOfDay: 0 }));
await new Promise((r) => setTimeout(r, 1600));
await page.screenshot({ path: path.join(OUT, '08-midnight.png') });

// golden hour ~18:30
await page.evaluate(() => window.__pw.store.set({ timeOfDay: 1110 }));
await new Promise((r) => setTimeout(r, 1600));
await page.screenshot({ path: path.join(OUT, '09-golden.png') });

// rain on/off 4x, then confirm no stale rain or ripples
for (let i = 0; i < 4; i++) {
  await page.evaluate(() => window.__pw.store.set({ weather: 'rain' }));
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => window.__pw.store.set({ weather: 'clear' }));
  await new Promise((r) => setTimeout(r, 400));
}
await new Promise((r) => setTimeout(r, 2500)); // let blend settle
const stale = await page.evaluate(() => {
  let rainCount = -1;
  let rippleVisible = 0;
  window.__pw.scene.traverse((o) => {
    if (o.isInstancedMesh) rainCount = o.count;
    if (o.type === 'Mesh' && o.material && o.material.transparent && o.geometry?.type === 'RingGeometry' && o.visible) {
      rippleVisible++;
    }
  });
  const w = { v: null };
  // smooth.weatherT approximated from store + time; read directly instead
  return { rainCount, rippleVisible };
});
console.log('stale check (rainCount should be 0):', JSON.stringify(stale));
await page.screenshot({ path: path.join(OUT, '10-after-rain-cycles.png') });

// keyboard: focus wind slider, press ArrowUp a few times
await page.focus('#wind-slider');
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');
await new Promise((r) => setTimeout(r, 200));
const kb = await page.evaluate(() => ({
  label: document.getElementById('wind-label').textContent,
  state: window.__pw.store.get().wind,
}));
console.log('keyboard wind:', JSON.stringify(kb), '(expect 32%)');

// time chip
await page.click('[data-time="780"]'); // Noon
await new Promise((r) => setTimeout(r, 300));
console.log(
  'noon chip →',
  await page.evaluate(() => document.getElementById('time-label').textContent),
);

console.log('errors:', errors.length ? errors.join('\n') : '(none)');
await browser.close();
