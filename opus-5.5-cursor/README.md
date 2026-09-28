# Pocket World

A small interactive 3D diorama of a floating island: a cottage, a windmill, a pond with a
jetty, a fenced vegetable patch, trees, and drifting clouds. You control the time of day,
the weather, the wind, and the house lights.

Built with Three.js, Vite and TypeScript. Everything in the scene is generated in code:
no model files, image textures, HDRs or remote assets. The only textures are small glow
sprites drawn on a canvas.

## Requirements

- Node.js 20 or newer (tested with Node 24) and npm
- A browser with WebGL 2 (current Chrome, Firefox, Safari or Edge)

## Commands

```bash
npm install        # install dependencies
npm run dev        # start the dev server (prints a local URL, usually http://localhost:5173)
npm run typecheck  # TypeScript type check only
npm run build      # type check + production build into dist/
npm run preview    # serve the production build locally
```

`dist/` is a static site, so you can host it on any static file server.

## Interactions

| Control | Effect |
| --- | --- |
| Drag / one-finger drag | Orbit the island (damped, with limits on angle and distance, and no panning) |
| Scroll / pinch | Zoom |
| Click or tap the house | Toggle the house lights (dragging across it does not) |
| Time of day slider | Moves the sun or moon and changes sky colour, light and brightness |
| Clear / Rain | Rain particles, darker clouds, softer sun, and ripples on the pond |
| Wind slider | Changes windmill speed, tree sway, cloud drift, rain slant and chimney smoke together |
| House lights switch | The same state as clicking the house |
| Reset world | Camera view, 16:00, clear weather, 30% wind, lights off |

All controls work from the keyboard (Tab, arrow keys, Space and Enter). On narrow screens the
panel turns into a collapsible bottom sheet, and the camera re-frames the island in the
space the panel leaves free.

## Code layout

```
src/
  main.ts              boot, WebGL 2 check, error screens
  state.ts             the single app state (time, weather, wind, lights) + formatting helpers
  frame.ts             per-frame smoothed environment shared by every animated system
  world.ts             renderer, scene assembly, render loop, state smoothing
  world/               scene construction: terrain, house, windmill, trees, clouds, props
  fx/                  environment effects: palette, sky, lighting, rain, ripples, smoke, fireflies
  interaction/         orbit camera rig (framing, limits, reset) and house tap detection
  ui/panel.ts          control panel
  utils/               math/noise helpers and the procedural glow texture
```

Implementation notes:

- The UI and house clicks only write to `Store`. Each frame the scene moves its smoothed values
  (hour, wind, rain, lights) toward that state with frame-rate-independent exponential damping.
  Changes can therefore interrupt each other freely: there are no queued tweens to fight.
- Frame deltas are capped at 50 ms, so returning from a background tab doesn't cause a jump.
- Rain uses one fixed buffer of line segments. Drops that hit the ground, roof, canopies or pond
  (checked against a precomputed height grid), or that fall past the island, are respawned above it.
  Pond hits reuse a fixed pool of ripple meshes. Smoke puffs are pooled the same way.
- Geometries and materials are shared wherever possible. Flowers and grass tufts use instancing.
- Rendering cost scales down on small, touch or low-core devices: lower pixel-ratio cap,
  a 1024 px shadow map instead of 2048, and about half the raindrops.
- With `prefers-reduced-motion`, decorative motion is reduced (bobbing, smoke, fireflies, house
  bounce, camera easing). The wind still drives the windmill, trees and rain.
