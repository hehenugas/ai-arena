# Pocket World

A polished, interactive 3D diorama of a tiny floating island built with Three.js, Vite, and TypeScript.

## Features

- Floating island with grassy top and sculpted rocky underside
- House with roof, chimney, arched door, cross-paned windows, and toggleable amber lights
- Pine and oak trees with wind-driven sway
- Windmill with rotating blades driven by wind slider
- Pond with shoreline rocks, lily pads, and rain ripples
- Clouds, fence, stone path, and scattered flowers
- Full 24-hour time-of-day cycle with interpolated sky, lighting, and stars
- Clear / Rain weather toggle with 3D rain particles and pond ripples
- Wind slider affecting windmill speed, tree sway, cloud drift, and rain direction
- Click-on-house or UI button to toggle house lights
- Smooth transitions between all states
- Mobile-responsive panel

## Installation

```bash
npm install
```

## Development

```bash
npm run dev -- --port 5111 --host
```

Open [http://localhost:5111](http://localhost:5111)

## Production Build

```bash
npm run build
npm run preview -- --port 5111 --host
```

## Type Check

```bash
npm run typecheck
```

## Project Structure

```
src/
  main.ts              # Entry point, animation loop
  state/
    store.ts           # Reactive state store
    environment.ts     # Time-of-day → env config interpolation
  scene/
    sceneBuilder.ts    # Assembles all 3D elements, exposes updateScene()
    island.ts          # Floating island geometry
    house.ts           # House with windows, door, lights
    trees.ts           # Pine + oak procedural trees
    windmill.ts        # Windmill with rotating blades
    pond.ts            # Water, shoreline, pooled ripple system
    environment.ts     # Clouds, rocks, fence, path, flowers
    rain.ts            # Pooled rain particle system
    sky.ts             # Gradient sky sphere + star field
  ui/
    panel.ts           # Control panel with inline styles
    interaction.ts     # House raycasting with drag detection
```

## Port

Dev server: **5111** (per project port convention)
