# Pocket World 🏝️

**Pocket World** is a polished, interactive 3D miniature diorama of a tiny floating island built with **Three.js**, **Vite**, and **TypeScript**.

Resembling a handcrafted digital toy, it features an organic floating island with a faceted rocky underside, a cozy cottage with timber detailing and smoke puffs, a windmill with wind-responsive rotating sails, a tranquil pond with shoreline stones and ripples, varied swaying trees and flowers, a 24-hour dynamic day/night lighting cycle, reactive rain weather, and synchronized house lighting controls.

## 🛠️ Tech Stack

- **Three.js** (v0.186+) for real-time 3D rendering and shading.
- **OrbitControls** with smooth damping and restrained camera boundaries.
- **Vite** for fast modern bundling and hot-reloading.
- **TypeScript** with strict type checking.
- **Procedural Geometries & Shaders** (no external 3D models or downloaded image textures).

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Development Server

Start the local development server at `http://localhost:5173`:

```bash
npm run dev
```

### 3. Type Check & Production Build

Check TypeScript types and compile optimized production assets into `dist/`:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## ✨ Features & Interactions

- **Camera Controls**:
  - Left click / single finger drag to orbit.
  - Scroll wheel / pinch to zoom.
  - Constrained polar angles and distance to maintain perfect diorama framing.
  - Unrestricted panning is disabled to keep the floating island centered.
- **24-Hour Time of Day**:
  - Live slider cycling through dawn, morning, noon, golden hour (16:00 default), sunset, twilight, and star-lit night.
  - Physically grounded orbital sun/moon movement and color grading with soft shadow map.
- **Weather System**:
  - Toggle between **Clear** and **Rain**.
  - Dynamic 3D rain particles with wind slanting, cloud darkening, softened lighting, and concentric pond ripples.
  - Rain particles recycle at the island surface rather than falling endlessly through it.
- **Wind System**:
  - Slider (0% to 100%) driving windmill rotation speed, tree/foliage sway, cloud drift, and raindrop trajectory.
  - At 0% wind, rotation and sway naturally halt.
- **Cottage Lights**:
  - Click/tap directly on the cottage in 3D (drag-threshold protected to avoid triggering during camera orbit).
  - Synchronized toggle switch in the UI panel.
  - Emissive amber window glow and warm porch illumination.
- **Reset**:
  - Smoothly animates camera back to the initial 3/4 hero view.
  - Resets Time to 16:00, Weather to Clear, Wind to 30%, and House Lights to Off.
- **Accessibility & Responsiveness**:
  - Glassmorphic, keyboard-accessible panel with visible focus outlines.
  - Collapsible on mobile screens to preserve unobstructed touch interaction.
  - Automatic detection and support for `prefers-reduced-motion`.
  - Graceful WebGL capability check with helpful fallback screen.
