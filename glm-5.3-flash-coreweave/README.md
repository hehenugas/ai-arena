# Pocket World

A tiny, hand-crafted floating-island diorama built with **Three.js + TypeScript + Vite**.
Everything in the scene is generated in code — no 3D model downloads, no image assets,
no backend, no runtime network calls. It runs fully offline in the browser.

## Commands

```bash
npm install        # install dependencies (three, vite, typescript)
npm run dev        # dev server → http://127.0.0.1:5210/
npm run build      # type-check (tsc --noEmit) + production build → dist/
npm run preview    # serve the production build (add: -- --port 5290 --host 127.0.0.1)
```

## Controls

| Control | Effect |
| --- | --- |
| Drag / swipe | Orbit the camera (damped, pan locked, distance + angle limited) |
| Scroll / pinch | Zoom |
| Tap / click the house | Toggle the house lights (same state as the panel toggle) |
| Time of day slider | Full 24 h cycle — sun/moon direction, sky, fog, light color + night stars |
| Morning / Noon / Golden / Night chips | Time shortcuts |
| Clear / Rain | Cross-fades rain particles, storm cloud, darker sky, pond ripples |
| Wind slider | One shared wind state drives windmill speed, tree sway, cloud drift, rain slant |
| Reset world | Camera home, 16:00, clear, 30 % wind, lights off |
| `▾` / panel header | Collapse the panel (auto-collapsed on small screens) |

Keyboard: sliders and buttons are native elements with visible focus states.
`prefers-reduced-motion` slows decorative motion (tree sway, cloud drift, island bob,
smoke) while keeping every functional control.

## Project layout

```
src/
  main.ts               boot, render loop, delta clamp, resize, WebGL fallback
  state.ts              single store (time / weather / wind / lights) + smoothed values
  palette.ts            24 h keyframes (sky, sun, fog, ambient…) + weather blending
  materials.ts          shared materials + procedural canvas grass texture
  util.ts               seeded RNG, blob shapes, rock sculpting helpers
  world/                island, house (+smoke), windmill, trees, pond (+ripples),
                        props (path, fence, flowers, rocks), clouds
  env/                  sky dome shader + sun/moon/stars, lighting, rain (instanced pool)
  interaction/          OrbitControls rig + reset tween, house pick (click vs drag)
  ui/panel.ts           DOM panel wired to the store (two-way sync)
scripts/                headless-browser smoke tests (dev-only, uses puppeteer-core)
```

Rain, ripples and smoke are fixed-size recycled pools — nothing is allocated per frame.
Time, weather and wind are eased toward their targets every frame, so rapid control
changes blend smoothly and never fight each other.

## Headless checks

```bash
node scripts/smoke.mjs     # interactions: needs `npm run dev` running first
node scripts/prodcheck.mjs # production build: needs `npm run preview -- --port 5290` first
```

## Known limitations

- Rendering uses WebGL 2; on unsupported hardware a readable fallback card is shown.
- The rain/ripple model is a stylized approximation, not a fluid simulation.
- The dev-only `window.__pw` debug hook is stripped from production builds.
