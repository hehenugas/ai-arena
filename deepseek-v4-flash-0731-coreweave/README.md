# Pocket World

A polished interactive 3D diorama of a tiny floating island — built with
Three.js, Vite and TypeScript. Everything is procedural: no external assets,
no backend — just a browser.

## Getting started

```bash
npm install       # install dependencies
npm run dev       # start the dev server（http://localhost:5173）
npm run build      # type-check and bundle into dist/
npm run preview     # serve the production build
npm run typecheck   # TypeScript-only check
```

## Controls

- **Drag** — orbit the camera around the island
- **Scroll / pinch** — zoom in and out
- **Click the house** — toggle its warm window/lamp lights
- **Time slider** — drive the sun, moon, stars and sky colours
- **Wind slider** — sway the trees, spin the windmill, push the rain and clouds
- **Weather buttons** — switch between clear skies and rain
- **Lights button / Reset** — toggle the house lights or reset everything

## Architecture

- `src/state.ts` — central app state（time, weather, wind, lights）with subscribe
- `src/scene/` — island, pond, house, trees, windmill, rocks, boat, butterflies, clouds
- `src/environment.ts` — sky dome, sun/moon, stars, hemispheric and directional lighting
- `src/weather.ts` — pooled rain particles and pond ripples
- `src/controls.ts` — orbit camera plus raycast click-to-toggle on the house
- `src/ui.ts` — wires the existing `index.html` panel to the state store
- `src/tx/` — ready procedural canvas textures

One light — the directional sun — casts shadows（PCFSoft, 1024px map）;
everything else uses pooled or static geometry for smooth performance.