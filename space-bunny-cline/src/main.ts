import './style.css';
import * as THREE from 'three';
import { createCameraRig } from './core/camera';
import { DEFAULTS, WorldState, sunHeight } from './core/state';
import { createMood, sampleMood } from './core/theme';
import { clamp } from './core/utils';
import { createPicker } from './interaction/picker';
import { createWorld } from './scene/world';
import { bindShortcuts, createUI } from './ui/ui';

const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
const loading = document.getElementById('loading');
const fallback = document.getElementById('fallback');
const fallbackReason = document.getElementById('fallback-reason');

function giveUp(reason: string): never {
  if (fallbackReason) fallbackReason.textContent = reason;
  if (fallback) fallback.hidden = false;
  loading?.classList.add('is-hidden');
  throw new Error(reason);
}

function start(): void {
  if (!canvas) giveUp('The scene canvas is missing from the page.');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  const lean = window.innerWidth < 700 || cores <= 4;
  const motion = reducedMotion ? 0.18 : 1;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !lean,
      powerPreference: 'high-performance',
    });
  } catch {
    giveUp('This browser could not create a WebGL context for the diorama.');
  }
  if (!renderer.getContext()) {
    giveUp('WebGL is unavailable, so the island cannot be drawn.');
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lean ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const world = createWorld(lean ? 'low' : 'high');
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 900);
  const rig = createCameraRig(camera, canvas!);

  const state = new WorldState(DEFAULTS);
  const mood = createMood();
  const ui = createUI(state, () => rig.flyHome());
  const unbindShortcuts = bindShortcuts(state, () => rig.flyHome());
  state.subscribe(ui.sync);

  const disposePicker = createPicker({
    dom: canvas!,
    camera,
    targets: [world.house.group],
    onSelect: () => state.toggleLights(),
    onGestureStart: () => {
      /* a real gesture always wins over an in-flight reset flight */
      rig.cancelFlight();
    },
  });

  canvas!.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    giveUp('The graphics context was lost. Reload the page to bring the island back.');
  });

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lean ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  let last = performance.now();
  let firstFrame = true;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;

    state.update(dt);
    sampleMood(sunHeight(state.live.time), state.live.rain, mood);
    renderer.toneMappingExposure = mood.exposure;

    world.update(dt, state.elapsed, state.live, mood, motion);
    rig.update(dt);
    world.sky.mesh.position.copy(camera.position);
    world.clouds.follow(camera.position.x, camera.position.z);
    renderer.render(world.scene, camera);

    if (firstFrame) {
      firstFrame = false;
      loading?.classList.add('is-hidden');
    }
  };
  requestAnimationFrame(frame);

  // Handy for manual poking in the console during development.
  Object.assign(window, { pocketWorld: { state, world, camera, rig, renderer } });

  window.addEventListener('pagehide', () => {
    disposePicker();
    unbindShortcuts();
    rig.dispose();
  });
}

start();
