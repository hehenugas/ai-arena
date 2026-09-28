# Pocket World 🏝️

A tiny floating-island diorama in your browser — built with **Three.js + TypeScript + Vite**.
Everything (terrain, house, windmill, trees, clouds, rain) is generated procedurally in code:
no 3D models, no image assets, no backend.

## Run it

```bash
npm install
npm run dev        # → http://127.0.0.1:5199
```

Production build & preview:

```bash
npm run build      # typecheck + bundle into dist/
npm run preview    # serve the production build
```

## Things to try

| Control | What it does |
| --- | --- |
| Drag / scroll / pinch | Orbit & zoom the island (damped, with sensible limits) |
| **Time of day** slider | Full 24 h cycle — sun/moon arc, sky gradient, stars, window glow |
| **Weather** Clear / Rain | Smoothly fades pooled rain streaks, pond ripples, storm clouds |
| **Wind** slider | One shared wind state drives windmill, tree sway, cloud drift and rain slant |
| Click the house (or the 💡 button) | Toggle amber window light — click vs. drag is distinguished |
| **↺ Reset world** | Camera, 16:00, clear, 30 % wind, lights off |

## Project layout

```
src/
  main.ts         entry, state wiring, clamped animation loop
  scene.ts        renderer, camera, lights, sun/moon arcs, env transitions
  sky.ts          sky dome, sun/moon discs, stars, wind-driven clouds
  weather.ts      pooled rain particles + pond ripples
  world.ts        island, house, windmill, pond, trees, path, fence, flowers
  palette.ts      day/night color keyframes + material tints
  state.ts        shared app state, quality/reduced-motion detection
  ui.ts           control panel bindings
  geometry.ts     seeded noise/RNG + dispose helpers
  skyTextures.ts  procedural canvas textures (glow sprites)
```

## Notes

- Respects `prefers-reduced-motion` (windmill slows, sway/cloud bob stops; controls still work).
- Lowers pixel ratio / particle counts on mobile & low-core devices.
- Shows a readable message instead of a blank page when WebGL is unavailable.
