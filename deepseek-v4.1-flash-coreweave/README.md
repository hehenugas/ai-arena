# Pocket World

An interactive 3D diorama of a tiny floating island, built with **Three.js** and **Vite + TypeScript**.
Everything in the scene is generated procedurally in code — no downloaded models, no image textures, no
external services or API keys.

Orbit the island, scrub through a full 24-hour day, switch the weather, blow the wind, and click the
house to turn its lights on and off.

---

## Requirements

- Node.js 18+ (developed on Node 24)
- A browser with WebGL 2 and ES modules

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite prints a local URL (default `http://localhost:5173`). Open it in a browser.

## Production build

```bash
npm run build      # type-checks with tsc, then bundles into dist/
npm run preview    # serves the built dist/ locally
```

The build uses a relative base, so `dist/` can be served from any sub-path. Deploying is just serving
the static `dist/` folder.

## Type check only

```bash
npm run typecheck
```

---

## Controls

| Control | What it does |
| --- | --- |
| Drag / one-finger drag | Orbit the camera (damped, with angle and distance limits) |
| Scroll / pinch | Zoom |
| **Time of day** slider | 0:00–24:00. Drives sun angle, light colour, brightness, sky gradient, stars and window glow |
| **Weather** Clear / Rain | Rain fades in/out with darker clouds, softened sun, wet look and pond ripples |
| **Wind** slider | One shared value for windmill speed, tree sway, cloud drift and rain slant |
| **House lights** button | Toggles the lit windows (also toggle by clicking/tapping the house) |
| **Reset view & world** | Restores the camera, time 16:00, Clear weather, 30% wind, lights off |

Keyboard: the sliders and buttons are native controls and fully keyboard-operable. Clicking vs.
orbiting is disambiguated — a press only toggles the lights if the pointer barely moved.

---

## Project layout

```
index.html          markup: canvas mount, control panel, WebGL fallback card
src/
  main.ts           bootstrap: renderer, camera, controls, resize, animation loop, failure handling
  state.ts          the single store for time / weather / wind / lights, with subscribe + reset
  world.ts          procedural scene construction: island, house, windmill, trees, pond, path,
                    fence, rocks, flowers, clouds, smoke — plus per-frame world animation
  environment.ts    time-of-day + weather: light rig, sky palette blending, fog, window glow
  sky.ts            gradient sky dome shader (sun/moon glow, night stars, rain desaturation)
  rain.ts           pooled LineSegments rain that recycles on the terrain
  ripples.ts        pooled expanding rings on the pond surface
  interaction.ts    click-vs-drag raycasting for the house light toggle
  ui.ts             DOM controls bound to the store
  math.ts           small math helpers (damping, smoothstep, seeded RNG)
  palette.ts        shared colour palette
  style.css         control panel and layout styling
```

### Implementation notes

- **One state, many effects.** `state.ts` is the single source of truth. The scene never reads DOM
  values directly; the DOM never mutates the scene directly. `environment.ts` derives every lighting,
  sky and window value from smoothed copies of that state, so the UI and the 3D interaction stay in
  sync and transitions are interruptible.
- **Time-based, delta-clamped animation.** All animation uses `dt` from `requestAnimationFrame`,
  clamped to 50 ms so returning from a background tab does not jump. Smoothing uses exponential
  damping (`1 - e^(-λ·dt)`) which is frame-rate independent.
- **Pooled particles.** Rain is a single `LineSegments` object with a fixed drop pool; ripples are a
  fixed pool of ring meshes. Rain drops recycle when they reach the island surface (or below the
  island when they fall past its silhouette), so rain never streams through the terrain.
- **Performance.** Shared geometries and materials, instanced-free but low object counts, one
  shadow-casting light at a time, pixel ratio capped at 2 (1.5 on coarse pointers / small screens),
  and reduced shadow-map size plus lower particle counts on low-power devices.
- **Failure handling.** If WebGL 2 is unavailable or initialisation throws, a readable fallback card
  is shown instead of a blank page. WebGL context loss is also handled.
- **Reduced motion.** `prefers-reduced-motion` reduces decorative motion (island bob, sway, cloud
  drift, smoke rise) while keeping functional controls fully working.

## Verified

Checked with a headless-driven browser session: initial framing, orbit/zoom inputs, click-vs-drag on
the house, UI/3D light sync, day/sunset/night differences, rain on/off (including rapid flapping and
particle-pool stability), wind coupling across windmill/trees/clouds/rain, zero-wind standstill, full
reset, mobile layout, and window resize. No console or page errors were observed.
