# Pocket World

An interactive 3D diorama of a tiny floating island, built with **Three.js + TypeScript + Vite**.
Everything you see is generated in code: no downloaded models, no image textures, no HDR maps,
no external services. The only dependency is `three`.

```
        _.-'-._
     .-'  ~ ~ .-''-.        grass plateau, cottage, windmill, pond,
   .'   ~ pond ~     `.     trees, trail, fence, flowers, clouds, rain
  :  ^ house     mill  :
   `-._  \______/  _.-'
       `--.______.--'
```

## Requirements

- Node.js 18+ (developed on Node 24)
- Any modern browser with WebGL2

## Install and run

```bash
npm install
npm run dev            # dev server, http://localhost:5104
```

This folder maps to port **5104** in `PORT_RULES.md`, and `vite.config.ts` already defaults to it,
so the aggregator can start the app as-is:

```bash
npm run dev -- --port 5104 --host
```

For a throwaway local check on another port, just override it (``--port 5300``) so the reserved
port stays free.

Production build and preview:

```bash
npm run build          # tsc --noEmit + vite build -> dist/
npm run preview        # serves dist/ on http://localhost:5104
```

Type check only:

```bash
npm run typecheck
```

## Controls

| Input | Effect |
| --- | --- |
| Drag / one finger | Orbit the camera (damped, no panning) |
| Scroll / pinch | Zoom, clamped between 10.5 and 42 units |
| Time of day | Full 24h slider; label shows `16:00 · Afternoon` |
| Weather | `Clear` / `Rain`, transitions are smoothed over ~1s |
| Wind | 0–100%, drives windmill speed, tree sway, cloud drift and rain slant |
| House lights | Click/tap the cottage **or** use the switch; both share one state |
| Reset world | Camera view, 16:00, clear weather, 30% wind, lights off |

Keyboard: every control is a native focusable element (ranges, buttons, `role="switch"`), with
visible focus rings. The panel can be collapsed with the “Controls” button.

## How the scene is built

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Bootstrap, WebGL capability check, render loop, clamped delta time |
| `src/state.ts` | `Store` (single source of truth) and the per-frame `FrameContext` |
| `src/palette.ts` | Time-of-day palette sampled from the sun's elevation, plus the storm mix |
| `src/sky.ts` | Gradient sky dome, sun/moon glow sprites, star field |
| `src/terrain.ts` | Island math (height field, silhouette, shoreline), terrain + rock + pond geometry |
| `src/water.ts` | Pond water shader (analytic waves, fresnel, rain dimples) and the ripple pool |
| `src/house.ts` | Cottage: walls, gable roof, chimney, door, windows, porch, point light |
| `src/windmill.ts` | Windmill with wind-driven sails |
| `src/vegetation.ts` | Procedural trees with wind sway |
| `src/clouds.ts` | Drifting cloud groups that darken with rain |
| `src/props.ts` | Boulders, underside bumps, fence, instanced flowers, lily pads, floating stones |
| `src/weather.ts` | 3D rain streaks that recycle on the island surface |
| `src/world.ts` | Composition root: builds everything, owns lights/fog, derives each frame |
| `src/controls.ts` | Orbit controls, tap-vs-drag detection, aspect-aware framing, reset tween |
| `src/ui.ts` | Panel wiring kept in sync with the store |
| `src/materials.ts` | Shared material library |

### Design notes

- **One state, derived effects.** `time`, `weather`, `wind` and `houseLights` live in the store.
  Every frame the world samples a palette from the sun's elevation, mixes in the smoothed rain
  amount, and hands one `FrameContext` to each module. Nothing reads the DOM or keeps its own copy.
- **One shared wind.** The windmill's rotation speed, tree sway amplitude, cloud drift speed and
  the rain's slant all come from the same `0..1` value, so the effects always feel connected.
- **Interruptible transitions.** Rain amount, house-light glow, windmill speed and every other
  smoothed value use exponential damping (`damp(current, target, lambda, dt)`), so rapidly moving
  the sliders blends smoothly instead of queueing competing animations.
- **Time-based animation.** All motion is `dt`-driven and `dt` is clamped to 50 ms, so returning
  from a background tab cannot make the island jump.
- **Reuse.** Rain drops, ripple rings, cloud blobs, tree parts, boulders and fence pieces all reuse
  shared geometries; rain and ripples are pooled and recycled rather than re-created per frame.
- **Night stays readable.** Below the horizon the same shadow-casting light becomes cool moonlight
  from the opposite side, hemisphere/ambient floors keep the island visible, and the palette nudges
  the tone-mapping exposure up slightly.
- **Budget.** Rain drops (1100 desktop / 520 on smaller devices), shadow maps (2048 / 1024),
  antialiasing and pixel ratio (≤2 / ≤1.5) all step down on low-power or touch devices.

## Verification performed

- `npm run build` (which runs `tsc --noEmit` first) and `npm run typecheck` both pass.
- The running app was inspected in the browser: default afternoon view, sunset, night + rain with
  the house lights on, and a narrow (mobile) layout; interaction paths (orbit, sliders, weather
  buttons, house click, reset) were exercised and the console was checked for errors.

## Debug hook

Opening the app with `?debug` (or running the dev server) exposes the live scene on
`window.__pocketWorld` — renderer, scene, camera, controls, store and world — which is handy for
poking at state from the console:

```js
__pocketWorld.store.set({ time: 21, weather: 'rain', wind: 0.8 });
__pocketWorld.renderer.info.render.calls;
```

## Known limitations

- The pond is a shader on a single irregular fan, not a fluid simulation: reflections are
  approximate (fresnel + analytic waves), so there is no true refraction or depth tinting.
- Rain drops are single-pixel line streaks; they are culled by the terrain height field, houses and
  trees are not per-object colliders, so a drop can visually end just above a roof ridge.
- The island silhouette, trail and landmark placement are hand-authored constants rather than
  generated from a seed the UI can change.
- No post-processing pass: the look relies on tone mapping, fog and the palette.
