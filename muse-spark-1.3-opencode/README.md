# Pocket World

A polished, interactive 3D diorama of a tiny floating island — built with Three.js + Vite + TypeScript. No backend, no downloaded models, no remote assets: every mesh is procedural code.

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # type-check + production build → dist/
npm run preview  # serve the production build locally
```

## What you get

- Floating island with grassy top, sculpted rocky underside, pond, house, windmill, trees, clouds, path, fence, flowers, lantern, chimney smoke
- Orbit + zoom (mouse & touch), damped, with sensible limits; panning disabled so you can't lose the island
- 24h time slider with real sun/sky/night transitions, stars, moon, glowing windows at night
- Clear / Rain weather: 3D rain streaks, darkening clouds, dimmed sun, pond ripples
- Wind slider driving windmill speed, tree sway, cloud drift, and rain slant from one shared state
- Click the house (or the UI switch) to toggle its lights — drag-vs-click disambiguated, both stay in sync
- Reset button restores camera, 16:00, clear, 30% wind, lights off
- Responsive panel (bottom sheet on mobile), keyboard-focusable controls, `prefers-reduced-motion` support
