# Pocket World

A tiny, browser-only Three.js diorama. Explore the floating island, move through a full day, bring in rain, tune the breeze, and turn on the cottage lights. The scene is made from procedural geometry and small canvas textures; it uses no remote assets or services.

## Requirements

- Node.js 20 or newer
- npm
- A browser with WebGL enabled

## Install and run

```sh
npm install
npm run dev -- --host 0.0.0.0 --port 5113
```

Open the local URL printed by Vite. Port `5113` is reserved for this model folder in the workspace.
With the workspace Caddy router running, the same production app is available at `http://localhost:8080/gpt-6-luna-codex/`.

## Type check and production build

```sh
npm run typecheck
npm run build
```

To serve the generated production build locally:

```sh
npm run preview -- --host 0.0.0.0 --port 5113
```

## Controls

- Drag the scene to orbit and scroll or pinch to zoom.
- Adjust the time, weather, and breeze in the control card.
- Tap or click the cottage, or use the Cottage lights switch.
- Reset returns the view and all environment controls to their starting values.
