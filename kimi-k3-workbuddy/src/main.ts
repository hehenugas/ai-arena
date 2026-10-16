import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Store } from './state';
import { sampleEnv, createEnvSample, sunDirection } from './palette';
import { buildIsland, groundY } from './world/island';
import { buildHouse } from './world/house';
import { buildTree, buildFlowers, buildPath, buildFence, type Tree } from './world/vegetation';
import { buildWindmill } from './world/windmill';
import { buildPond, buildShore, buildRipples, POND_CENTER, POND_RADIUS } from './world/water';
import { buildClouds } from './world/clouds';
import { buildSky, applyEnvToSky } from './effects/sky';
import { buildRain } from './effects/rain';
import { setupHousePicking } from './interaction';
import { setupUI } from './ui';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const fallback = document.getElementById('fallback')!;

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  if (!renderer.getContext()) throw new Error('no context');
} catch {
  fallback.hidden = false;
  canvas.remove();
  throw new Error('WebGL unavailable');
}

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x7cc3e8, 0.012);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
const INITIAL_CAM_POS = new THREE.Vector3(9.5, 6.2, 11.5);
const INITIAL_TARGET = new THREE.Vector3(0, 0.4, 0);
camera.position.copy(INITIAL_CAM_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(INITIAL_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 26;
controls.maxPolarAngle = THREE.MathUtils.degToRad(112); // allow peeking at the underside
controls.minPolarAngle = THREE.MathUtils.degToRad(18);

// ---------- Lights ----------
const sun = new THREE.DirectionalLight(0xfff6e8, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const ambient = new THREE.HemisphereLight(0xbcd8e0, 0x8a6a4e, 0.7);
scene.add(ambient);

// ---------- World ----------
const store = new Store();

const sky = buildSky();
scene.add(sky.mesh);

const island = buildIsland();
scene.add(island);

const pond = buildPond();
scene.add(pond.mesh, buildShore());
const ripples = buildRipples(pond);
scene.add(ripples.group);

const house = buildHouse();
house.group.position.set(-1.6, 0.32, -1.4);
house.group.rotation.y = 0.55;
scene.add(house.group);

const windmill = buildWindmill();
windmill.group.position.set(2.4, 0.28, -2.2);
windmill.group.rotation.y = -0.5;
scene.add(windmill.group);

const trees: Tree[] = [];
const treeDefs: [0 | 1 | 2, number, number, number][] = [
  [0, -3.2, -0.4, 1.1],
  [1, -2.2, -2.9, 1.2],
  [2, 0.2, -3.4, 1.0],
  [1, 3.9, -0.6, 0.9],
  [0, 3.4, 2.9, 0.85],
  [2, -0.9, 3.3, 0.95],
  [1, -3.9, 1.6, 0.8]
];
treeDefs.forEach(([kind, x, z, s]) => {
  const t = buildTree(kind, s);
  t.group.position.set(x, 0.3, z);
  t.group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(t.group);
  trees.push(t);
});

scene.add(buildFlowers(), buildPath(), buildFence());

// a couple of ground rocks
const rockGeo = new THREE.IcosahedronGeometry(0.22, 0);
[[-1.2, 2.2, 1.0], [2.9, 0.4, 0.7], [0.4, -2.2, 0.85]].forEach(([x, z, s], i) => {
  const r = new THREE.Mesh(rockGeo, i % 2 ? new THREE.MeshStandardMaterial({ color: 0x9a9284, roughness: 1, flatShading: true }) : new THREE.MeshStandardMaterial({ color: 0x7d766a, roughness: 1, flatShading: true }));
  r.position.set(x, groundY(x, z) + 0.06, z);
  r.scale.setScalar(s);
  r.castShadow = r.receiveShadow = true;
  scene.add(r);
});

const { clouds, material: cloudMat } = buildClouds();
clouds.forEach((c) => scene.add(c.group));

const rain = buildRain();
scene.add(rain.points);

// ---------- Interaction & UI ----------
setupHousePicking(canvas, camera, house.hitbox, () => {
  store.set({ houseLights: !store.get().houseLights });
});

setupUI(store, () => {
  camera.position.copy(INITIAL_CAM_POS);
  controls.target.copy(INITIAL_TARGET);
  controls.update();
});

// ---------- Responsive renderer ----------
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const small = Math.min(w, h) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Eased runtime values (smooth, interruptible transitions) ----------
let rainMix = 0;          // 0 clear .. 1 rain
let windSmooth = store.get().wind;
let timeSmooth = store.get().timeOfDay;
let lightsMix = 0;        // 0 off .. 1 on
let bladeAngle = 0;
let rainSpawnAcc = 0;

const env = createEnvSample();
const sunDir = new THREE.Vector3();
const tmpColor = new THREE.Color();
const cloudBase = new THREE.Color(0xffffff);
const cloudDark = new THREE.Color(0x8a94a4);

const clock = new THREE.Clock();
let elapsed = 0;

function shortestMinuteDelta(a: number, b: number): number {
  let d = (b - a) % 1440;
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  return d;
}

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05); // clamp background-tab jumps
  elapsed += dt;
  const s = store.get();

  // --- ease toward targets (frame-rate independent smoothing) ---
  const k = 1 - Math.exp(-dt * 3.5);
  rainMix += ((s.weather === 'rain' ? 1 : 0) - rainMix) * k;
  windSmooth += (s.wind - windSmooth) * k;
  lightsMix += ((s.houseLights ? 1 : 0) - lightsMix) * (1 - Math.exp(-dt * 8));
  timeSmooth = (timeSmooth + shortestMinuteDelta(timeSmooth, s.timeOfDay) * k + 1440) % 1440;

  // --- environment from time + weather ---
  sampleEnv(timeSmooth, env);
  const rainDim = 1 - rainMix * 0.55;
  sunDirection(timeSmooth / 60, sunDir);
  // at night, keep a soft "moon" direction so shadows/forms stay readable
  const lightDir = env.nightness > 0.6
    ? tmpVec.set(0.4, 0.8, 0.35).normalize()
    : sunDir;
  sun.position.copy(lightDir).multiplyScalar(18);
  sun.color.copy(env.sunColor);
  sun.intensity = env.sunIntensity * rainDim + env.nightness * 0.25;
  ambient.color.copy(env.ambientColor);
  ambient.intensity = env.ambientIntensity * rainDim + env.nightness * 0.4;
  (scene.fog as THREE.FogExp2).color.copy(env.skyBottom);
  (scene.fog as THREE.FogExp2).density = env.fogDensity + rainMix * 0.012;
  applyEnvToSky(sky.uniforms, env, sunDir);

  // clouds drift with wind, darken with rain
  tmpColor.copy(cloudBase).lerp(cloudDark, rainMix * 0.85).multiplyScalar(1 - env.nightness * 0.55);
  cloudMat.color.copy(tmpColor);
  cloudMat.opacity = 0.92 - env.nightness * 0.15;
  clouds.forEach((c) => {
    c.angle += dt * c.speed * (0.15 + windSmooth * 1.4);
    c.group.position.set(Math.cos(c.angle) * c.radius, c.y, Math.sin(c.angle) * c.radius);
  });

  // --- windmill ---
  const bladeSpeed = windSmooth * 6.5;
  bladeAngle += bladeSpeed * dt;
  windmill.blades.rotation.z = bladeAngle;

  // --- trees sway (shared wind, per-tree phase) ---
  const swayAmp = reducedMotion ? windSmooth * 0.008 : windSmooth * 0.05;
  trees.forEach((t) => {
    t.crown.rotation.z = Math.sin(elapsed * (1.4 + windSmooth * 2.2) + t.phase) * swayAmp * t.flex;
    t.crown.rotation.x = Math.cos(elapsed * (1.1 + windSmooth * 1.8) + t.phase * 1.3) * swayAmp * 0.6 * t.flex;
  });

  // --- floating rocks bob (decorative; reduced with reduced-motion) ---
  const bobAmp = reducedMotion ? 0.01 : 0.06;
  const floaters = island.userData.floaters as { mesh: THREE.Mesh; phase: number; baseY: number }[];
  floaters.forEach((f) => {
    f.mesh.position.y = f.baseY + Math.sin(elapsed * 0.8 + f.phase) * bobAmp;
    f.mesh.rotation.y += dt * 0.05;
  });

  // island itself breathes very gently
  island.position.y = Math.sin(elapsed * 0.5) * (reducedMotion ? 0.01 : 0.07);

  // --- house lights ---
  house.windows.forEach((w) => {
    const m = w.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = lightsMix * (1.4 + env.nightness * 1.6);
  });
  house.pointLight.intensity = lightsMix * 3.2;
  house.chimneySmoke.visible = lightsMix > 0.4;
  if (house.chimneySmoke.visible && !reducedMotion) {
    house.chimneySmoke.children.forEach((p, i) => {
      const ph = elapsed * 1.2 + i * 1.4;
      p.position.y = 1.95 + i * 0.22 + (ph % 1) * 0.25;
      p.position.x = 0.5 + Math.sin(ph * 2) * 0.05 + windSmooth * ((ph % 1) * 0.4);
      ((p as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - (ph % 1)) * lightsMix;
    });
  }

  // --- rain & pond ripples ---
  rain.update(dt, windSmooth, rainMix);
  ripples.setActive(rainMix > 0.15);
  ripples.update(dt);
  if (rainMix > 0.15) {
    rainSpawnAcc += dt * rainMix * 26;
    while (rainSpawnAcc >= 1) {
      rainSpawnAcc -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * POND_RADIUS * 0.85;
      ripples.spawn(POND_CENTER.x + Math.cos(a) * r, POND_CENTER.z + Math.sin(a) * r);
    }
  }
  // pond water: calmer/clearer by day, choppier tint in rain
  pond.material.color.setHex(0x5f8fb4).lerp(tmpColor.setHex(0x46607a), rainMix * 0.7 + env.nightness * 0.3);
  pond.material.roughness = 0.25 + rainMix * 0.15;

  controls.update();
  renderer.render(scene, camera);
}

const tmpVec = new THREE.Vector3();
animate();
