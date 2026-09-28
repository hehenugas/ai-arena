import './styles.css';
import * as THREE from 'three';
import { DEFAULT_STATE, cloneState, WorldState } from './state';
import { World } from './world/World';
import { UI } from './ui';
import { HouseClickHandler } from './interaction';

function hasWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function showFallback(): void {
  const fb = document.getElementById('fallback');
  if (fb) fb.hidden = false;
  const c = document.getElementById('scene') as HTMLCanvasElement | null;
  if (c) c.style.display = 'none';
}

function main(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  const app = document.getElementById('app');
  if (!canvas || !app) {
    showFallback();
    return;
  }
  if (!hasWebGL(canvas)) {
    showFallback();
    return;
  }

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let world: World;
  try {
    world = new World(canvas, reducedMotion);
  } catch (err) {
    console.error('Pocket World failed to initialise WebGL:', err);
    showFallback();
    return;
  }

  // Coherent state — the single source of truth for every effect.
  let state: WorldState = cloneState(DEFAULT_STATE);

  const ui = new UI(app, {
    onTime: (t) => {
      state.time = t;
    },
    onWeather: (w) => {
      state.weather = w;
      ui.setWeather(w);
    },
    onWind: (w) => {
      state.wind = w;
    },
    onLights: (on) => {
      state.lightsOn = on;
      ui.setLights(on);
    },
    onReset: () => {
      state = cloneState(DEFAULT_STATE);
      ui.sync(state);
      world.resetCamera();
    },
  });
  ui.sync(state);

  // On small screens, collapse the panel so the island stays fully visible.
  if (window.innerWidth <= 640) ui.collapse();

  // House click <-> UI toggle share the same state.
  const houseClick = new HouseClickHandler(
    canvas,
    world.camera,
    () => world.housePickTargets(),
    () => {
      state.lightsOn = !state.lightsOn;
      ui.setLights(state.lightsOn);
    },
  );

  // Keyboard shortcuts (functional controls stay available even with reduced motion).
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key.toLowerCase()) {
      case 'r':
        state = cloneState(DEFAULT_STATE);
        ui.sync(state);
        world.resetCamera();
        break;
      case 'l':
        state.lightsOn = !state.lightsOn;
        ui.setLights(state.lightsOn);
        break;
      case 'c':
        state.weather = 'clear';
        ui.setWeather('clear');
        break;
      case 'n':
        state.weather = 'rain';
        ui.setWeather('rain');
        break;
    }
  });

  // Resize keeps the scene composed and unstretched.
  window.addEventListener('resize', () => world.resize(), { passive: true });

  // Time-based animation loop with clamped deltas (safe on background tabs).
  const clock = new THREE.Clock();
  let raf = 0;
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    world.update(state, dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // Expose a teardown for completeness / hot-reload cleanliness.
  (window as unknown as { __pocketWorldDispose?: () => void }).__pocketWorldDispose = () => {
    cancelAnimationFrame(raf);
    houseClick.dispose();
    world.dispose();
  };
}

main();
