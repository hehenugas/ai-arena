# Pocket World

A tiny floating island diorama built entirely with Three.js procedural geometry. No external 3D models, textures, or assets.

## Run

```bash
npm install
npm run dev -- --port 5111 --host
```

Open `http://localhost:5111/`

## Build

```bash
npm run build
npm run preview -- --port 5111 --host
```

## Controls

- **Orbit**: drag to rotate, scroll to zoom
- **Time slider**: 24-hour day cycle with dawn, day, sunset, night
- **Weather**: Clear / Rain with particle rain and pond ripples
- **Wind slider**: affects windmill, tree sway, clouds, rain direction
- **House lights**: click the house or use the UI toggle
- **Reset**: restores default camera, time (16:00), clear weather, wind (30%), lights off

## Architecture

| File | Purpose |
|---|---|
| `main.ts` | Renderer, camera, orbit controls, animation loop, state wiring |
| `state.ts` | Reactive state store for time, weather, wind, lights |
| `environment.ts` | Time-of-day sky color ramp and sun direction |
| `island.ts` | Island geometry, house, pond, trees, windmill, decorative details |
| `clouds.ts` | Cloud clusters and dark rain clouds with wind drift |
| `rain.ts` | Pooled rain particles and pond ripple system |
| `interaction.ts` | House click detection with drag filtering |
| `ui.ts` | Control panel DOM construction and state binding |
| `style.css` | Panel styling, responsive layout, reduced-motion support |
