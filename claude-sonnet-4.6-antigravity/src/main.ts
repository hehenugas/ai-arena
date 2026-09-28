// Application entry point
import { store, DEFAULT_STATE } from './state/store';
import { buildScene, DEFAULT_CAM_POS, DEFAULT_TARGET } from './scene/sceneBuilder';
import { buildUI } from './ui/panel';
import { setupHouseInteraction } from './ui/interaction';

// Check WebGL support
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function main(): void {
  if (!hasWebGL()) {
    document.getElementById('no-webgl')?.classList.add('visible');
    return;
  }

  const container = document.getElementById('app')!;

  // Build scene
  const { renderer, camera, controls, house, updateScene, getHouseMeshes } =
    buildScene(container);

  // House light toggle handler
  function applyHouseLights(on: boolean): void {
    house.setLightsOn(on);
  }

  // Reset handler
  function handleReset(): void {
    camera.position.copy(DEFAULT_CAM_POS);
    controls.target.copy(DEFAULT_TARGET);
    controls.update();
    applyHouseLights(false);
  }

  // Build UI
  buildUI(applyHouseLights, handleReset);

  // Setup house click interaction
  setupHouseInteraction(
    renderer,
    camera,
    controls,
    getHouseMeshes(),
    applyHouseLights
  );

  // Apply initial state
  applyHouseLights(DEFAULT_STATE.houseLightsOn);

  // Animation loop
  let lastTime = performance.now();

  function animate(): void {
    requestAnimationFrame(animate);
    const now = performance.now();
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    // Clamp dt — prevents jumps when returning from background tab
    const dt = Math.min(rawDt, 0.1);

    const state = store.get();
    updateScene(state, dt);
  }

  animate();
}

main();
