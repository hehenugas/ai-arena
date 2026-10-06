# Pocket World — DeepSeek v4 Flash 0731 (CoreWeave)

A polished interactive 3D diorama of a tiny floating island, built with
Three.js, Vite and TypeScript. Everything — geometry, materials, textures,
clouds, rain — is generated in code. No downloaded models, textures, HDRIs or
asset packs, and no backend.

## Getting started

```bash
npm install            # install dependencies
npm run dev            # dev server (http://127.0.0.1:5176)
npm run build          # type-check + production bundle into dist/
npm run preview        # serve the built dist/ locally
```

## Controls

- **Drag** — orbit the camera (pan is disabled so the island can't be lost)
- **Scroll / pinch** — zoom, with distance and angle limits
- **Click / tap the house** — toggle its warm window lights
- **Time of day slider** — drives the sun, moon, stars, sky gradient and
  light colour across a full 24 h cycle (initial: 16:00)
- **Weather buttons** — switch between Clear and Rain; rain is real 3D
  precipitation that splashes on the island and ripples the pond
- **Wind slider** — one shared wind state that spins the windmill sails, sways
  the trees and flowers, blows the clouds and tilts the rain
- **House lights button** — same state as clicking the house
- **Reset** — restores camera, 16:00, clear, wind 30% and lights off

## Architecture

- `src/state.ts` — the single app state (time, weather, wind, lights) with a
  tiny subscribe store; every scene effect derives from it
- `src/environment/` — `dayCycle` (sun/moon maths), `sky` (gradient shader
  dome + stars + sun/moon sprites), `lighting` (shadow sun, hemi, moonlight,
  house glow)
- `src/world/` — `island` (sculpted grass top + rocky underside + spires),
  `house`, `windmill`, `trees`, `pond`, `decorations` (clouds, path, fence,
  rocks, grass, flowers)
- `src/effects/` — pooled `rain` line segments and pond `ripples`
- `src/interaction/` — damped orbit/zoom `camera` rig and the
  click-vs-drag `houseClick` raycast (a drag never toggles the lights)
- `src/ui/panel.ts` — compact control panel; responsive (collapses on small
  screens) and respects `prefers-reduced-motion`
- `src/utils/` — noise helpers and canvas procedural textures

One directional light casts shadows (PCFSoft, 2048 px map); particles and
rings are pooled so nothing is allocated per frame and the scene stays smooth
on modest hardware. A WebGL failure shows a readable message instead of a
blank page.