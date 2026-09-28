/* Automated smoke test for Pocket World (runs against the dev server). */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const SHELL =
  '/tmp/opencode/browsers/chrome-headless-shell/linux-154.0.8037.57/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5210/';
const OUT = path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) });

const browser = await puppeteer.launch({
  executablePath: SHELL,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--window-size=1280,800'],
  defaultViewport: { width: 1280, height: 800 },
});

const page = await browser.newPage();
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[console.${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000)); // let the first frames render

const ready = await page.evaluate(() => !!window.__pw && !document.getElementById('loading'));
console.log('ready:', ready);
if (!ready) {
  console.log('FATAL: app did not boot. errors:', errors);
  await shot(page, '00-fatal.png');
  process.exit(1);
}

// ---- 1. default view ----------------------------------------------------------
await shot(page, '01-default.png');
const defaults = await page.evaluate(() => {
  const s = window.__pw.store.get();
  return {
    time: s.timeOfDay,
    weather: s.weather,
    wind: s.wind,
    lights: s.lightsOn,
    label: document.getElementById('time-label').textContent,
    calls: performance.getEntriesByType('resource').length,
  };
});
console.log('defaults:', JSON.stringify(defaults));

// measure FPS briefly
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
        else res(n / 1.5);
      };
      requestAnimationFrame(tick);
    }),
);
console.log('fps≈', fps.toFixed(1));

// ---- 2. orbit drag + drag-vs-tap ----------------------------------------------
await page.mouse.move(640, 400);
await page.mouse.down();
for (let i = 0; i < 20; i++) {
  await page.mouse.move(640 + i * 8, 400 + i * 2);
  await new Promise((r) => setTimeout(r, 16));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 400));
await shot(page, '02-after-orbit.png');
console.log('after drag, lights (must stay false):', (await page.evaluate(() => window.__pw.store.get().lightsOn)));

// camera actually moved?
const moved = await page.evaluate(() => {
  const c = window.__pw.camera.position;
  return { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2) };
});
console.log('camera after drag:', JSON.stringify(moved));

// ---- 3. tap the house (toggle on), tap again (toggle off) ----------------------
// project the house anchor through the live camera, then tap that screen point
const tapXY = await page.evaluate(() => {
  const { camera, scene } = window.__pw;
  // find the house group: it sits at (-2.7, 0, -1.5)
  let house = null;
  scene.traverse((o) => {
    if (!house && o.isGroup && Math.abs(o.position.x + 2.7) < 0.01 && Math.abs(o.position.z + 1.5) < 0.01) house = o;
  });
  if (!house) return null;
  const world = new (house.position.constructor)(0.2, 1.1, 1.1); // near the front wall / door
  house.localToWorld(world);
  const ndc = world.clone().project(camera);
  return {
    x: ((ndc.x + 1) / 2) * innerWidth,
    y: ((1 - ndc.y) / 2) * innerHeight,
  };
});
console.log('house tap point:', JSON.stringify(tapXY));
await page.mouse.click(tapXY.x, tapXY.y);
await new Promise((r) => setTimeout(r, 300));
const lightsOn = await page.evaluate(() => ({
  state: window.__pw.store.get().lightsOn,
  btn: document.getElementById('lights-toggle').getAttribute('aria-pressed'),
}));
console.log('after house tap:', JSON.stringify(lightsOn));
await shot(page, '03-house-tap-nightlights.png');

// ---- 4. rainy night, lights on, wind 80 ----------------------------------------
await page.evaluate(() => {
  const store = window.__pw.store;
  store.set({ timeOfDay: 1380, weather: 'rain', wind: 0.8, lightsOn: true });
});
await new Promise((r) => setTimeout(r, 2500)); // let the weather blend finish
await shot(page, '04-rainy-night-lights.png');
console.log('rainy night state:', JSON.stringify(await page.evaluate(() => window.__pw.store.get())));

// ---- 5. rapid control churn (interruptibility) ----------------------------------
for (let i = 0; i < 14; i++) {
  await page.evaluate((i) => {
    const s = window.__pw.store;
    s.set({ timeOfDay: (i * 173) % 1440, weather: i % 2 ? 'rain' : 'clear', wind: (i % 11) / 10, lightsOn: i % 3 === 0 });
  }, i);
  await new Promise((r) => setTimeout(r, 60));
}
await new Promise((r) => setTimeout(r, 1200));
console.log('after churn, errors so far:', errors.length);

// ---- 6. reset -------------------------------------------------------------------
await page.click('#reset');
await new Promise((r) => setTimeout(r, 1300));
const afterReset = await page.evaluate(() => {
  const s = window.__pw.store.get();
  return {
    time: s.timeOfDay,
    weather: s.weather,
    wind: s.wind,
    lights: s.lightsOn,
    label: document.getElementById('time-label').textContent,
    windLabel: document.getElementById('wind-label').textContent,
    clearActive: document.querySelector('[data-weather="clear"]').classList.contains('is-active'),
  };
});
console.log('after reset:', JSON.stringify(afterReset));
await shot(page, '05-after-reset.png');

// ---- 7. mobile layout -----------------------------------------------------------
await page.setViewport({ width: 390, height: 720, hasTouch: true, isMobile: true });
await new Promise((r) => setTimeout(r, 600));
await shot(page, '06-mobile.png');
const mobile = await page.evaluate(() => ({
  collapsed: document.getElementById('panel').classList.contains('collapsed'),
  panelBottom: getComputedStyle(document.getElementById('panel')).bottom,
}));
console.log('mobile:', JSON.stringify(mobile));

// expand panel on mobile
await page.click('#panel-collapse');
await new Promise((r) => setTimeout(r, 300));
await shot(page, '07-mobile-expanded.png');

// ---- 8. wind effect on windmill (0 vs 100) ---------------------------------------
await page.setViewport({ width: 1280, height: 800 });
await page.evaluate(() => window.__pw.store.set({ wind: 0 }));
await new Promise((r) => setTimeout(r, 1500));
const spin0 = await page.evaluate(
  () =>
    new Promise((res) => {
      // sample windmill blade group rotation via scene traversal
      const { scene } = window.__pw;
      let blades = null;
      scene.traverse((o) => {
        if (!blades && o.isGroup && o.children.length === 4 && o.children.every((c) => c.isGroup)) blades = o;
      });
      const a0 = blades.rotation.z;
      setTimeout(() => res(Math.abs(blades.rotation.z - a0)), 1000);
    }),
);
await page.evaluate(() => window.__pw.store.set({ wind: 1 }));
await new Promise((r) => setTimeout(r, 2000));
const spin1 = await page.evaluate(
  () =>
    new Promise((res) => {
      const { scene } = window.__pw;
      let blades = null;
      scene.traverse((o) => {
        if (!blades && o.isGroup && o.children.length === 4 && o.children.every((c) => c.isGroup)) blades = o;
      });
      const a0 = blades.rotation.z;
      setTimeout(() => res(Math.abs(blades.rotation.z - a0)), 1000);
    }),
);
console.log('windmill spin rad/s  wind0:', spin0.toFixed(4), ' wind100:', spin1.toFixed(4));

console.log('\n=== console/page errors ===');
console.log(errors.length ? errors.join('\n') : '(none)');

await browser.close();
