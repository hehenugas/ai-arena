import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world';
import { createEnvironment } from './environment';
import { enableHousePicking } from './interaction';
import { createUI } from './ui';
import { createInitialState } from './state';
import type { WorldState } from './state';
import './style.css';

const sceneHost = document.getElementById('scene') as HTMLDivElement;
const fatalMessage = document.getElementById('fatal') as HTMLDivElement;
const app = document.getElementById('app') as HTMLElement;
const state: WorldState = createInitialState();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startApplication() {
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: window.innerWidth > 650, alpha: true, powerPreference: 'high-performance' });
} catch {
  fatalMessage.hidden = false;
  sceneHost.hidden = true;
  app.classList.add('has-fatal');
  return;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 650 ? 1.25 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = 'world-canvas';
renderer.domElement.setAttribute('aria-label', 'Three dimensional floating island. Drag to orbit and scroll to zoom.');
sceneHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog('#e8d8bd', 15, 30);
const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minDistance = 8.4;
controls.maxDistance = 15.5;
controls.minPolarAngle = 0.64;
controls.maxPolarAngle = 1.32;
controls.rotateSpeed = 0.62;
controls.zoomSpeed = 0.76;
controls.target.set(-1.38, 0.05, 0);
camera.position.set(5.62, 5.5, 8.3);
controls.update();

const world = buildWorld(scene);
const environment = createEnvironment(scene, world.pond, world.house);
const homeCamera = { position: camera.position.clone(), target: controls.target.clone() };
let userMovedCamera = false;
controls.addEventListener('start', () => { userMovedCamera = true; });

function updateState(patch: Partial<WorldState>) {
  Object.assign(state, patch);
  ui.sync(state);
}

const ui = createUI({
  setHour: (hour) => updateState({ hour }),
  setWeather: (weather) => updateState({ weather }),
  setWind: (wind) => updateState({ wind }),
  setLights: (lights) => updateState({ lights }),
  reset: () => {
    Object.assign(state, { hour: 16, weather: 'clear', wind: 0.3, lights: false });
    ui.sync(state);
    controls.target.copy(homeCamera.target);
    camera.position.copy(homeCamera.position);
    controls.update();
    userMovedCamera = false;
  },
});
ui.sync(state);
enableHousePicking(renderer.domElement, camera, world.house.hitTargets, () => ui.toggleLights());

const resize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  const compact = width <= 720;
  camera.fov = compact ? (width < height ? 44 : 38) : 36;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75));
  renderer.setSize(width, height);
  if (!userMovedCamera && compact) {
    controls.target.set(0, -0.22, 0);
    camera.position.set(5.65, 5.5, 7.7);
    controls.update();
    homeCamera.target.copy(controls.target);
    homeCamera.position.copy(camera.position);
  } else if (!userMovedCamera) {
    controls.target.set(-1.38, 0.05, 0);
    camera.position.set(5.62, 5.5, 8.3);
    controls.update();
    homeCamera.target.copy(controls.target);
    homeCamera.position.copy(camera.position);
  }
};
window.addEventListener('resize', resize, { passive: true });
resize();

let previous = performance.now();
let elapsed = 0;
let sceneHour = state.hour;
let sceneWind = state.wind;
function animate(now: number) {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  elapsed += delta;
  const hourDifference = ((state.hour - sceneHour + 36) % 24) - 12;
  sceneHour = (sceneHour + hourDifference * (1 - Math.exp(-delta * 3.8)) + 24) % 24;
  sceneWind = THREE.MathUtils.damp(sceneWind, state.wind, 3.8, delta);
  controls.update();
  world.windmill.update(delta, sceneWind);
  world.vegetation.update(elapsed, sceneWind, reducedMotion ? 0.18 : 1);
  environment.update(delta, elapsed, state, reducedMotion ? 0.12 : 1, sceneHour, sceneWind);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener('pagehide', () => {
  controls.dispose();
  renderer.dispose();
}, { once: true });
}

startApplication();
