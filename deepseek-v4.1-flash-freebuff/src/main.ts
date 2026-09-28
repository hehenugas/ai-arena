import './style.css';
import { ACESFilmicToneMapping, PCFSoftShadowMap, Scene, WebGLRenderer } from 'three';
import { createCameraRig } from './controls';
import { Store } from './state';
import { hideLoader, initUi, showFatal } from './ui';
import { isLowPowerDevice } from './utils';
import { createWorld, type World } from './world';

const MAX_DELTA = 0.05;

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

function boot(): void {
  const canvas = document.getElementById('scene');
  if (!(canvas instanceof HTMLCanvasElement)) {
    showFatal('The 3D canvas is missing from the page, so Pocket World cannot start.');
    return;
  }
  if (!supportsWebGL()) {
    showFatal(
      'This browser could not start a WebGL context, so the 3D island cannot be displayed. ' +
        'Try a recent version of Chrome, Firefox, Safari or Edge with hardware acceleration enabled.',
    );
    return;
  }

  const quality = isLowPowerDevice() ? 'low' : 'high';
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: quality === 'high',
      powerPreference: 'high-performance',
    });
  } catch (error) {
    showFatal(
      `WebGL could not be initialised (${(error as Error).message}). ` +
        'Try updating your browser or enabling hardware acceleration.',
    );
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const store = new Store();

  let world: World;
  try {
    world = createWorld(scene, store, quality);
  } catch (error) {
    showFatal(`The island could not be built (${(error as Error).message}).`);
    return;
  }

  const rig = createCameraRig(canvas, world, () => store.toggleLights());

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));
    renderer.setSize(width, height, false);
    rig.setViewport(width, height);
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  initUi(store, {
    onReset() {
      store.reset();
      rig.reset();
    },
  });

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  world.setReducedMotion(motionQuery.matches);
  const onMotionChange = (event: MediaQueryListEvent): void => world.setReducedMotion(event.matches);
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', onMotionChange);
  }

  // Dev builds (or any build opened with ?debug) expose the scene handles so
  // the diorama can be inspected from the console.
  const debugRequested =
    import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
  if (debugRequested) {
    (window as unknown as Record<string, unknown>).__pocketWorld = {
      renderer,
      scene,
      camera: rig.camera,
      controls: rig.controls,
      rig,
      store,
      world,
    };
  }

  let lastTime = performance.now();
  let elapsed = 0;
  let firstFrame = true;

  const frame = (now: number): void => {
    requestAnimationFrame(frame);

    // Clamp so returning from a background tab never teleports the animation.
    const dt = Math.min(MAX_DELTA, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (document.hidden) return;
    if (dt <= 0) return;

    elapsed += dt;
    world.update(dt, elapsed);
    rig.update(dt);
    renderer.toneMappingExposure = world.exposure;
    renderer.render(scene, rig.camera);

    if (firstFrame) {
      firstFrame = false;
      hideLoader();
    }
  };

  requestAnimationFrame(frame);
}

try {
  boot();
} catch (error) {
  showFatal(`Pocket World failed to start (${(error as Error).message}).`);
}
