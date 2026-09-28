# Pocket World

An interactive 3D floating-island diorama built with **Three.js + Vite + TypeScript**.
Everything — island, house, windmill, pond, trees, clouds, rain, textures — is generated
procedurally in code. No external assets, no backend, no API keys.

## Run it

Requires Node.js 18+ and npm.

```bash
npm install      # install dependencies
npm run dev      # start dev server → http://127.0.0.1:5173
```

Production build and preview:

```bash
npm run build    # type-check (tsc) + bundle (vite) → dist/
npm run preview  # serve the production build
```

## Controls

| Input | Action |
| --- | --- |
| Drag (left) | Orbit the camera |
| Scroll / pinch | Zoom (clamped so you can't lose the island) |
| Drag (right) | Pan (target clamped to a small box) |
| **Time of day** slider | 0:00–23:59 — drives sun/moon, sky, shadows, window glow |
| **Weather** Clear / Rain | World-space rain with pond ripples; eases in and out |
| **Wind** slider | One shared state: windmill speed, tree sway, cloud drift, rain slant |
| **House lights** toggle, or click/tap the house | Both share the same state (clicks are distinguished from drags) |
| **Reset** | Restores camera, 16:00, clear, wind 30 %, lights off |

Keyboard: all controls are focusable (visible focus states); arrow keys work on the
sliders, the weather group responds to arrow keys, `Home`/`End` jump to the extremes.

The compact panel collapses on narrow screens (3D stays dominant). `prefers-reduced-motion`
is respected, deltas are clamped, and all transitions are eased (smooth and interruptible).
If WebGL 2 is unavailable, a readable fallback message is shown instead.

## Project structure

```
src/
  main.ts, app.ts          bootstrap, scene assembly, render loop, resize, picking
  state.ts                 targets vs eased values (time / weather / wind / lights)
  utils.ts                 math helpers, color ramps, seeded RNG, easing
  ui.ts + index.html + styles.css   control panel, keyboard, responsive layout
  interaction.ts           OrbitControls rig, click-vs-drag, house picking, reset
  weather.ts               pooled rain streaks + pond-ripple pool + hit tests
  textureSet.ts, textures.ts        procedural canvas textures
  environment/             time-of-day + weather → sky, lighting, fog, water
  objects/                 layout (single source of truth), island, house, windmill,
                           pond, trees, details (path/fence/rocks/flowers), clouds
```

Placement is validated by geometry (terrain functions are shared between builders and
collision checks), so nothing intersects and everything sits inside the island rim.

## Tech notes

- Three.js (WebGL 2), OrbitControls from `three/examples` (compatible import path).
- One shadow-casting directional light (sun ↔ moon, smoothly blended), hemisphere + ambient fill.
- Rain is a pooled `LineSegments` buffer recycled at the island/pond surface; ripples come
  from a fixed pool — no per-frame allocation, no physics engine.
- Pixel ratio, shadow map size and particle counts are budgeted for smooth 60 fps.
