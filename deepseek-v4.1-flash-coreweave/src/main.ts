import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { store } from './state';
import { createSky } from './sky';
import { buildWorld } from './world';
import { Environment } from './environment';
import { RainSystem } from './rain';
import { RippleSystem } from './ripples';
import { setupInteraction } from './interaction';
import { setupUI } from './ui';
import { clamp } from './math';

const CAMERA_TARGET = new THREE.Vector3(0, -0.9, 0);
const CAMERA_POSITION = new THREE.Vector3(6.3, 3.0, 7.5);
const BASE_FOV = 42;

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function showFallback(title: string, message: string): void {
  const scene = document.getElementById('scene');
  if (scene) scene.style.display = 'none';
  const panel = document.getElementById('panel');
  if (panel) panel.hidden = true;
  const fallback = document.getElementById('fallback');
  if (!fallback) return;
  fallback.hidden = false;
  const titleNode = fallback.querySelector('[data-title]');
  const bodyNode = fallback.querySelector('[data-message]');
  if (titleNode) titleNode.textContent = title;
  if (bodyNode) bodyNode.textContent = message;
}

function init(): void {
  const mount = document.getElementById('scene');
  if (!mount) return;

  if (!webglAvailable()) {
    showFallback(
      'WebGL 2 is unavailable',
      'Pocket World needs a browser with WebGL 2 enabled. Try updating your browser or enabling hardware acceleration.',
    );
    return;
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const lowPower = coarse || Math.min(window.innerWidth, window.innerHeight) < 620;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener('change', (event) => {
    reducedMotion = event.matches;
  });

  const renderer = new THREE.WebGLRenderer({
    antialias: !lowPower,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 200);
  camera.position.copy(CAMERA_POSITION);

  const sky = createSky();
  scene.add(sky.mesh);

  const world = buildWorld({ lowPower });
  scene.add(world.root);

  const environment = new Environment(scene, world, sky.uniforms, lowPower ? 1024 : 2048);
  const rain = new RainSystem(scene, world, lowPower ? 450 : 1100);
  const ripples = new RippleSystem(scene, world, lowPower ? 10 : 16);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 6.5;
  controls.maxDistance = 20;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 2.4;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;
  controls.update();

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = aspect;

    // Keep the island framed on portrait screens by widening the vertical FOV
    // instead of stretching the scene.
    let fov = BASE_FOV;
    if (aspect < 1) {
      fov = THREE.MathUtils.radToDeg(
        2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) / aspect),
      );
      fov = clamp(fov, BASE_FOV, 72);
    }
    camera.fov = fov;
    camera.updateProjectionMatrix();

    const baseDistance = CAMERA_POSITION.distanceTo(CAMERA_TARGET);
    const fitDistance = aspect < 0.42 ? baseDistance * (0.42 / aspect) : 0;
    controls.minDistance = Math.max(6.5, fitDistance);
    if (camera.position.distanceTo(controls.target) < controls.minDistance) {
      const direction = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(direction, controls.minDistance);
      controls.update();
    }
  };

  window.addEventListener('resize', resize);
  resize();

  setupUI({
    onReset: () => {
      camera.position.copy(CAMERA_POSITION);
      controls.target.copy(CAMERA_TARGET);
      controls.update();
    },
  });
  setupInteraction({
    domElement: renderer.domElement,
    camera,
    targets: world.houseHitTargets,
    onActivate: () => store.patch({ lightsOn: !store.state.lightsOn }),
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallback(
      'Graphics context lost',
      'The browser stopped the WebGL context. Reload the page to restart Pocket World.',
    );
  });

  let last = performance.now();
  let elapsed = 0;

  renderer.setAnimationLoop((now: number) => {
    // Clamp large deltas so returning from a background tab does not jump.
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    environment.update(dt);
    world.update(dt, elapsed, {
      wind: environment.wind,
      rain: environment.rain,
      night: environment.night,
      reducedMotion,
    });
    rain.update(dt, environment.wind, environment.rain);
    ripples.update(dt, environment.rain);

    sky.mesh.position.copy(camera.position);
    controls.update();
    renderer.render(scene, camera);
  });

  requestAnimationFrame(() => mount.classList.add('is-ready'));

  // Small debug surface; harmless in production and handy for automation.
  (window as unknown as Record<string, unknown>).pocketWorld = {
    store,
    camera,
    controls,
    renderer,
    world,
    environment,
    rain,
    ripples,
  };
}

try {
  init();
} catch (error) {
  showFallback(
    'Could not start Pocket World',
    error instanceof Error ? error.message : 'An unexpected error occurred while setting up the scene.',
  );
}
