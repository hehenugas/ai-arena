# Pocket World (glm-5.3-flash-zcode)

A polished, interactive 3D diorama of a tiny floating island, built with Three.js.
Everything on screen is generated in code: no 3D models, no image textures, no external
assets, no backend.

## Run it

Requires Node 18+.

```bash
npm install        # install dependencies (three, vite, typescript)
npm run dev        # dev server at http://localhost:5120
npm run build      # typecheck (tsc --noEmit) + production build into dist/
npm run serve      # serve dist/ at http://localhost:5120 (npx serve)
npm run preview    # vite preview of dist/ at http://localhost:5120
```

The production build is a static site: deploy `dist/` anywhere, including a subpath
(the build uses relative `base: './'`).

Port 5120 is the next free slot in this arena's port table (`PORT_RULES.md`); it is not
yet registered in `aggregator/models.json`, `Caddyfile`, `docker/Caddyfile` or the
`Dockerfile` build stages.

## Controls

- **Orbit / zoom**: drag to orbit, scroll or pinch to zoom (damped, with sane limits).
- **Time of day**: 24h slider; sun, sky, fog, stars and window glow follow the clock.
- **Weather**: Clear / Rain. Rain fades in with streaks, ripples on the pond, darker
  clouds and softened light, and fades out without residue.
- **Wind**: one shared wind state drives windmill speed, tree sway, cloud drift, rain
  slant and chimney-smoke drift. At 0% the windmill stops.
- **House lights**: click or tap the house in 3D, or use the panel button; both flip the
  same state. Dragging across the house never toggles it.
- **Reset**: restores the initial camera, 16:00, clear weather, 30% wind, lights off.

The panel collapses on small screens (bottom sheet) and follows breakpoint changes.
`prefers-reduced-motion` tones down sway, clouds and smoke while keeping controls
functional. If WebGL cannot start after a few retries, a readable message replaces the
scene.

## Code map

```
src/
  main.ts                 bootstrap, render loop, delta clamp, quality tiers
  state.ts                single source of truth (time, weather, wind, lights)
  palette.ts              24h color ramps + sun/moon paths
  world/                  island, house, windmill, vegetation, pond, clouds, sky, rain
  systems/                lighting, interaction (orbit + click-vs-drag), UI wiring
```

All scene objects are procedural primitives with vertex colors and canvas-free
materials; geometry and materials are shared, rain and ripples are pooled, animation is
time-based with clamped deltas, and transitions are eased so rapid control changes stay
interruptible.
