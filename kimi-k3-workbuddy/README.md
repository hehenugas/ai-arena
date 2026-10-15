# Pocket World

A tiny floating island diorama built with Three.js, Vite and TypeScript. Everything in the scene is generated from code — no external models, textures, or services.

## Features

- Floating island with grassy top, sculpted rocky underside, pond with shoreline, house, windmill, trees, clouds, path, fence and flowers.
- **Time of day** slider (full 24 h) driving sun position, sky gradient, lighting color, stars, and window glow.
- **Weather** toggle (Clear / Rain) with pooled rain particles, darkened clouds, softened light and pond ripples.
- **Wind** slider linked to windmill blades, tree sway, cloud drift and rain slant.
- **House lights** toggled by clicking the house or the UI switch (both share one state; drag gestures never trigger a toggle).
- **Reset** restores camera, time (16:00), clear weather, 30 % wind and lights off.
- Responsive control panel (collapsible on mobile), keyboard-accessible controls, `prefers-reduced-motion` support, WebGL fallback message.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start dev server (Vite)
npm run build    # type-check (tsc) + production build to dist/
npm run preview  # serve the production build
```
