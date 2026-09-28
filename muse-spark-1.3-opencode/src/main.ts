import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { DEFAULTS, formatTime, damp, type AppState } from './state';
import { buildWorld } from './world';
import { createEnvironment, updateEnvironment } from './environment';
import { Effects } from './effects';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const fallback = document.getElementById('fallback') as HTMLElement;

const state: AppState = {
  ...DEFAULTS,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  console.error(err);
  canvas.hidden = true;
  fallback.hidden = false;
  throw err;
}
if (!renderer.getContext()) {
  canvas.hidden = true;
  fallback.hidden = false;
  throw new Error('WebGL unavailable');
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Smaller screens / weak GPUs: cheaper shadows + pixels
if (Math.min(window.innerWidth, window.innerHeight) < 700) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ecae6);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
const INIT_POS = new THREE.Vector3(15.5, 10.5, 18.5);
const INIT_TARGET = new THREE.Vector3(0, -0.7, 0);
camera.position.copy(INIT_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(INIT_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 11;
controls.maxDistance = 44;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = 1.62;
controls.enablePan = false;
controls.update();

const world = buildWorld(scene);
const env = createEnvironment(scene);
const effects = new Effects(scene, world);

// ---------------- UI ----------------
const timeInput = document.getElementById('time') as HTMLInputElement;
const timeLabel = document.getElementById('time-label') as HTMLElement;
const windInput = document.getElementById('wind') as HTMLInputElement;
const windLabel = document.getElementById('wind-label') as HTMLElement;
const wClear = document.getElementById('w-clear') as HTMLButtonElement;
const wRain = document.getElementById('w-rain') as HTMLButtonElement;
const lightsBtn = document.getElementById('lights') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;
const panel = document.getElementById('panel') as HTMLElement;
const collapseBtn = document.getElementById('collapse') as HTMLButtonElement;
const expandBtn = document.getElementById('expand') as HTMLButtonElement;

function setLights(on: boolean) {
  state.lightsOn = on;
  lightsBtn.setAttribute('aria-checked', String(on));
}

function setWeather(w: 'clear' | 'rain') {
  state.weather = w;
  const clear = w === 'clear';
  wClear.classList.toggle('is-active', clear);
  wRain.classList.toggle('is-active', !clear);
  wClear.setAttribute('aria-pressed', String(clear));
  wRain.setAttribute('aria-pressed', String(!clear));
}

function syncUIFromState() {
  timeInput.value = String(state.timeHours);
  timeLabel.textContent = formatTime(state.timeHours);
  windInput.value = String(Math.round(state.wind * 100));
  windLabel.textContent = `${Math.round(state.wind * 100)}%`;
  setWeather(state.weather);
  setLights(state.lightsOn);
}

timeInput.addEventListener('input', () => {
  state.timeHours = Number(timeInput.value);
  timeLabel.textContent = formatTime(state.timeHours);
});
windInput.addEventListener('input', () => {
  state.wind = Number(windInput.value) / 100;
  windLabel.textContent = `${windInput.value}%`;
});
wClear.addEventListener('click', () => setWeather('clear'));
wRain.addEventListener('click', () => setWeather('rain'));
lightsBtn.addEventListener('click', () => setLights(!state.lightsOn));
resetBtn.addEventListener('click', () => {
  state.timeHours = DEFAULTS.timeHours;
  state.weather = DEFAULTS.weather;
  state.wind = DEFAULTS.wind;
  state.lightsOn = DEFAULTS.lightsOn;
  camera.position.copy(INIT_POS);
  controls.target.copy(INIT_TARGET);
  controls.update();
  syncUIFromState();
});

collapseBtn.addEventListener('click', () => {
  const collapsed = panel.classList.toggle('collapsed');
  collapseBtn.setAttribute('aria-expanded', String(!collapsed));
  collapseBtn.textContent = collapsed ? '+' : '–';
  expandBtn.hidden = !collapsed;
});
expandBtn.addEventListener('click', () => {
  panel.classList.remove('collapsed');
  collapseBtn.setAttribute('aria-expanded', 'true');
  collapseBtn.textContent = '–';
  expandBtn.hidden = true;
});
syncUIFromState();

// ---------------- House picking (click, not drag) ----------------
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downX = 0, downY = 0, downT = 0;

function castAt(clientX: number, clientY: number) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  return ray.intersectObject(world.house, true);
}

canvas.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY; downT = performance.now();
});
canvas.addEventListener('pointerup', (e) => {
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved > 7 || performance.now() - downT > 500) return; // it was a drag
  if (castAt(e.clientX, e.clientY).length > 0) setLights(!state.lightsOn);
});
// pointer cursor affordance (cheap: only on fine pointers, throttled by rAF flag)
let hoverCheck: { x: number; y: number } | null = null;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  hoverCheck = { x: e.clientX, y: e.clientY };
});

// ---------------- Resize ----------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- Loop ----------------
const clock = new THREE.Clock();
let elapsed = 0;
const motionScale = state.reducedMotion ? 0.25 : 1;

function nightFactor(): number {
  const theta = ((state.timeHours - 6) / 12) * Math.PI;
  const elev = Math.sin(theta);
  const t = Math.min(1, Math.max(0, (elev + 0.08) / 0.38));
  const day = t * t * (3 - 2 * t);
  return 1 - day;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // interruptible weather blend
  const target = state.weather === 'rain' ? 1 : 0;
  state.weatherBlend = damp(state.weatherBlend, target, 2.4, dt);
  if (Math.abs(state.weatherBlend - target) < 0.001) state.weatherBlend = target;

  // island bob + orbiting shards
  const bob = state.reducedMotion ? 0.06 : 0.28;
  world.island.position.y = Math.sin(elapsed * 0.6) * bob;
  for (const child of world.island.children) {
    const o = (child.userData as { orbit?: { r: number; speed: number; a: number; y: number } }).orbit;
    if (!o) continue;
    o.a += dt * o.speed * motionScale;
    child.position.set(Math.cos(o.a) * o.r, o.y + Math.sin(elapsed * 0.8 + o.r) * 0.4 * motionScale, Math.sin(o.a) * o.r);
  }

  // windmill (stops at zero wind)
  world.blades.rotation.z += dt * state.wind * 8 * (state.reducedMotion ? 0.4 : 1);

  // trees sway — one shared wind state
  const swayAmp = (0.012 + state.wind * 0.075) * (state.reducedMotion ? 0.3 : 1);
  const swayFreq = 1.1 + state.wind * 2.2;
  for (const t of world.trees) {
    t.crowns.forEach((c, i) => {
      c.rotation.z = Math.sin(elapsed * swayFreq + t.phase + i * 0.9) * swayAmp;
      c.rotation.x = Math.cos(elapsed * swayFreq * 0.8 + t.phase + i) * swayAmp * 0.7;
    });
  }

  // clouds drift with the same wind
  for (let i = 0; i < world.clouds.length; i++) {
    const c = world.clouds[i];
    c.position.x += dt * (0.25 + state.wind * 2.4) * motionScale * (0.7 + (i % 3) * 0.25);
    c.position.y += Math.sin(elapsed * 0.5 + i * 2) * dt * 0.12 * motionScale;
    if (c.position.x > 24) c.position.x = -24;
  }

  // house lights (brighter when dark)
  const night = nightFactor();
  const glow = state.lightsOn ? 1.2 + night * 1.8 : 0.06;
  for (const m of world.houseWindows) m.emissiveIntensity = damp(m.emissiveIntensity, glow, 8, dt);
  world.porchLight.intensity = damp(world.porchLight.intensity, state.lightsOn ? 5 + night * 26 : 0, 8, dt);
  world.lanternLight.intensity = damp(world.lanternLight.intensity, state.lightsOn ? 3 + night * 14 : 0, 8, dt);
  world.porchBulb.emissiveIntensity = damp(world.porchBulb.emissiveIntensity, state.lightsOn ? 2.6 : 0.1, 8, dt);
  world.lanternBulb.emissiveIntensity = damp(world.lanternBulb.emissiveIntensity, state.lightsOn ? 2.6 : 0.1, 8, dt);

  updateEnvironment(scene, env, renderer, state, world.cloudMat, world.waterMat, dt);
  effects.update(dt, state, elapsed);

  if (hoverCheck) {
    canvas.style.cursor = castAt(hoverCheck.x, hoverCheck.y).length > 0 ? 'pointer' : 'grab';
    hoverCheck = null;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
