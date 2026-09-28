# Pocket World

A small floating island you can orbit, relight, and rain on. Everything in the
scene is generated in code — geometry, textures, sky and weather — there are no
models, image files, HDRIs or runtime services involved.

![stack](https://img.shields.io/badge/three.js-0.180-1f6feb) ![stack](https://img.shields.io/badge/TypeScript-strict-3178c6) ![stack](https://img.shields.io/badge/Vite-6-646cff)

## Run it

```bash
npm install          # three + typescript + vite
npm run dev          # http://localhost:5117
npm run typecheck    # tsc --noEmit
npm run build        # typecheck, then production build into dist/
npm run preview      # serve the production build on :5117
```

`npm run dev` and `npm run preview` both bind to `0.0.0.0:5117`. The production
build uses relative asset paths (`base: './'`), so `dist/` also works when served
from a sub-path behind a reverse proxy.

## What you can do

| Control | Effect |
| --- | --- |
| Drag / one-finger drag | Orbit the island, with damping and angle limits |
| Scroll / pinch | Zoom between 6.5 and 22 units, panning is disabled on purpose |
| Click the cottage | Toggles its lights; dragging never counts as a click |
| Time of day (0–24 h) | Sun arc, light colour and intensity, sky gradient, stars, window glow |
| Weather | Eased rain: streaks, darker clouds, denser fog, ripples on the pond |
| Wind | Windmill sails, tree and bush sway, cloud drift, rain slant |
| House lights | Porch lamp, glowing windows, a warm pool of light on the grass |
| Reset world | Restores time, weather, wind, lights **and** flies the camera home |
| `R` / `L` / `C` | Keyboard shortcuts for reset, lights and clear/rain |

The panel collapses into a bottom sheet under 720 px wide, and the scene drops
its pixel ratio, shadow-map size, rain count and antialiasing on small or
low-core devices. `prefers-reduced-motion` keeps every control working while
slowing decorative motion to a crawl.

## How it is put together

```
src/
  core/     state (single source of truth + easing), theme (day moods, palette),
            camera rig (orbit limits + interruptible reset flight), math helpers
  scene/    terrain field, island mesh, house, windmill, vegetation, pond,
            props, clouds, rain, sky shader, lighting, and the world assembler
  ui/       panel wiring and keyboard shortcuts
  interaction/ click-vs-drag picking
```

Two ideas do most of the work:

- **One state object.** The UI, the keyboard and the 3D click handler all write
  to the same `WorldState`; the scene only ever reads its eased `live` values, so
  the switch and the cottage can never disagree, and every change is
  interruptible because easing is exponential toward the current target.
- **One key light.** A single shadow-casting light plays sun by day and moon by
  night, cross-fading through twilight, with a dim shadowless bounce light so the
  underside of the island never goes to pure black.

Weather particles (rain streaks, pond ripples, smoke) are fixed-size pools that
are recycled every frame, so toggling rain on and off never allocates.
