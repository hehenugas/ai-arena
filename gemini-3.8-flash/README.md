# Pocket World 🏝️✨

> **Pocket World** is a stylized, interactive 3D diorama of a tiny floating island designed like a beautifully crafted digital toy. Built with Three.js, TypeScript, and Vite with zero external asset dependencies.

---

## 🎨 Creative Highlights & Architecture

- **Handmade Miniature Aesthetic**: Warm wood tones, soft mossy greens, cream plaster walls, terracotta roofs, and clear turquoise pond water with sandy shores.
- **Sculpted Floating Island**: Irregular faceted grassy plateau, terraced soil cliff ledge, and a rocky underside tapering downward with geological strata and hanging stalactites.
- **Cozy Cottage**: Half-timbered cottage walls, pitched terracotta roof, stone foundation, rustic wooden door with brass handle, flower planter boxes, chimney with procedural smoke puffs, and a porch lantern.
- **Interactive House Lights**: Click or tap the 3D house to toggle its lights (with drag-vs-orbit gesture disambiguation) or use the synchronized UI button. Illuminated windows glow with warm amber emissive light and cast a gentle point light onto the walls and porch.
- **Spinning Windmill**: Octagonal stone base, tapered timber body, rotating cap, weather vane, and 4 latticed sailcloth blades rotating dynamically with the wind speed.
- **Stylized Lake & Concentric Ripples**: Translucent turquoise pond nestled in the terrain, water lilies with blossoms, and animated concentric ripples that spawn during rainfall.
- **Dynamic Foliage**: Multiple varieties of trees (deciduous puff trees, layered evergreen pines, autumn accent tree, flowering shrubs, and meadow flower patches) that sway naturally with the shared wind strength.
- **24-Hour Day/Night Celestial Orbit**: Procedural sky dome shader with smooth transitions through Sunrise, Morning, Midday, Golden Hour, Sunset, Twilight, and Night with a starry sky and soft moonlight.
- **Recycled 3D Weather System**: 3D rain particles slanting with wind and terminating upon reaching the island surface rather than falling infinitely through solid ground.
- **Toy-Like Glassmorphic UI**: Sleek frosted glass panel with accessible semantic controls, camera angle presets (Default 3/4, Top-Down, Cottage), and responsive mobile drawer.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
npm install
```

### Development Server
Start the local development server with Hot Module Replacement:
```bash
npm run dev
```
Open `http://localhost:5174/` (or port specified in terminal).

### Production Build & Preview
To run typechecks and build optimized production assets:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 🎮 Controls & Interactions

| Control | Action | Description |
| :--- | :--- | :--- |
| **Orbit** | Left Click + Drag / Single Touch Drag | Smooth damped rotation around the island. Angle and distance are restricted so the island is never lost. |
| **Zoom** | Scroll Wheel / Pinch Gesture | Zoom in and out within calibrated limits (6.5 to 21 units). |
| **House Lights** | Click / Tap Cottage | Toggles interior and exterior lantern lights. Differentiates short clicks from camera orbit drags (>6px threshold). |
| **Time of Day** | Slider (00:00 – 24:00) | Orbits the sun/moon and transitions sky colors, ambient bounce, directional sunlight, and stars. |
| **Weather** | Clear / Rain Toggle | Introduces slanting 3D rain particles, pond ripples, and overcast lighting. |
| **Wind Strength** | Slider (0% – 100%) | Simultaneously drives windmill rotation speed, tree sway amplitude, cloud drift speed, and rain slant angle. |
| **Camera Presets** | View Buttons | Smoothly animates camera to Default 3/4, Top-Down, or Cozy Cottage angles. |
| **Reset** | Reset Button | Restores default camera, Time: 16:00, Clear weather, 30% Wind, and House lights: Off. |

---

## 📁 Project Structure

```
gemini-3.8-flash/
├── index.html               # Main entry HTML and viewport setup
├── package.json             # Minimal dependencies (three, @types/three, typescript, vite)
├── tsconfig.json            # Strict TypeScript configuration
├── vite.config.ts           # Vite build & preview config
├── src/
│   ├── main.ts              # Entry point, WebGL capability check & bootstrap
│   ├── types.ts             # Application state contracts
│   ├── state.ts             # Unified reactive state store
│   ├── utils/
│   │   └── math.ts          # Math interpolation, time formatting, and phase helpers
│   ├── scene/
│   │   ├── World.ts         # Scene loop, camera framing, renderer & component orchestration
│   │   ├── Island.ts        # Procedural floating terrain, rocky cone underside, paths, fences, rocks
│   │   ├── House.ts         # Half-timbered cottage, windows, flower boxes, chimney smoke & lights
│   │   ├── Windmill.ts      # Octagonal windmill, roof cap, weather vane & rotating sail blades
│   │   ├── Water.ts         # Translucent pond, lily pads, shoreline, and rain ripple generator
│   │   ├── Foliage.ts       # Low-poly puff trees, pines, bushes, flowers & wind-sway physics
│   │   ├── Environment.ts   # Celestial sun/moon orbits, procedural sky dome shader & drifting clouds
│   │   └── WeatherSystem.ts # Recycled 3D rain particle system with height culling & wind slant
│   ├── interaction/
│   │   └── InteractionManager.ts # Pointer down/up tracking with drag-vs-click disambiguation
│   └── ui/
│       ├── UIManager.ts     # Reactive control panel with bidirectional sync & camera view presets
│       └── styles.css       # Tactile glassmorphic UI, responsive layout & mobile sheet styling
```
