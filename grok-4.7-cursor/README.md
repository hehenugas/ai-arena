# Pocket World

A small interactive 3D diorama of a floating island. It runs entirely in the browser with Vite, TypeScript, and Three.js. There is no backend and no downloaded models or textures.

## Requirements

- Node.js 20 or newer
- A browser with WebGL

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the URL Vite prints, usually `http://127.0.0.1:5173`.

## Typecheck

```bash
npm run typecheck
```

## Production build

```bash
npm run build
```

The built site is written to `dist/`.

## Preview the production build

```bash
npm run preview
```

## Controls

- Drag to orbit, and scroll or pinch to zoom. The camera stays aimed at the island.
- Time runs through a full day and changes the light, sky, and windows.
- Clear and Rain change the clouds, sunlight, rainfall, and pond ripples.
- Wind drives the windmill, trees, clouds, and the sideways drift of the rain.
- Click the house, or use House lights, to toggle the lamps.
- Reset returns the camera, 16:00, clear weather, 30% wind, and lights off.
