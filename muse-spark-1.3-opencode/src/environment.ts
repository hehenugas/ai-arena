import * as THREE from 'three';
import type { AppState } from './state';
import { damp } from './state';

export interface EnvRefs {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  amb: THREE.AmbientLight;
  sunDisc: THREE.Mesh;
  moonDisc: THREE.Mesh;
  stars: THREE.Points;
  starMat: THREE.PointsMaterial;
}

interface SkyStop { t: number; c: THREE.Color; }

const STOPS: SkyStop[] = [
  { t: 0, c: new THREE.Color(0x0b1026) },
  { t: 4.5, c: new THREE.Color(0x161d3a) },
  { t: 6, c: new THREE.Color(0xe89b6a) },
  { t: 7.5, c: new THREE.Color(0xa8d0e6) },
  { t: 12, c: new THREE.Color(0x87c5e8) },
  { t: 16, c: new THREE.Color(0x8ecae6) },
  { t: 17.5, c: new THREE.Color(0xf2c078) },
  { t: 18.5, c: new THREE.Color(0xdd6f4e) },
  { t: 19.5, c: new THREE.Color(0x3d4470) },
  { t: 21, c: new THREE.Color(0x0e1430) },
  { t: 24, c: new THREE.Color(0x0b1026) },
];

const RAIN_GRAY = new THREE.Color(0x6b7686);
const WATER_BASE = new THREE.Color(0x5fa8c9);
const SUN_WARM = new THREE.Color(0xff9a5c);
const SUN_NOON = new THREE.Color(0xfff3e0);
const MOON_COL = new THREE.Color(0x9db4ff);
const CLOUD_DAY = new THREE.Color(0xffffff);
const CLOUD_NIGHT = new THREE.Color(0x39415e);
const DUSK_GLOW = new THREE.Color(0xff7a3c);

function skyAt(t: number, out: THREE.Color): THREE.Color {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / Math.max(1e-5, b.t - a.t);
      return out.copy(a.c).lerp(b.c, f);
    }
  }
  return out.copy(STOPS[0].c);
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createEnvironment(scene: THREE.Scene): EnvRefs {
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
  sun.position.set(-18, 20, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xbfe3f5, 0x6f8f5a, 0.8);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(amb);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8, fog: false, transparent: true, opacity: 0.95 }),
  );
  scene.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false, transparent: true, opacity: 0 }),
  );
  scene.add(moonDisc);

  // Stars on a dome
  const N = 420;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.48 + 0.03;
    const r = 120;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xdfe8ff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const stars = new THREE.Points(g, starMat);
  scene.add(stars);

  scene.fog = new THREE.Fog(0x8ecae6, 55, 150);
  return { sun, hemi, amb, sunDisc, moonDisc, stars, starMat };
}

const _sky = new THREE.Color();
const _cloud = new THREE.Color();

export function updateEnvironment(
  scene: THREE.Scene,
  env: EnvRefs,
  renderer: THREE.WebGLRenderer,
  s: AppState,
  cloudMat: THREE.MeshStandardMaterial,
  waterMat: THREE.MeshStandardMaterial,
  dt: number,
) {
  const theta = ((s.timeHours - 6) / 12) * Math.PI;
  const elev = Math.sin(theta);
  const dayF = smooth(-0.08, 0.3, elev);
  const nightF = 1 - dayF;
  const duskF = Math.exp(-((elev / 0.28) ** 2));

  // Sky + fog
  skyAt(s.timeHours, _sky);
  _sky.lerp(RAIN_GRAY, s.weatherBlend * 0.45);
  const bg = scene.background as THREE.Color | null;
  if (bg) {
    bg.r = damp(bg.r, _sky.r, 6, dt);
    bg.g = damp(bg.g, _sky.g, 6, dt);
    bg.b = damp(bg.b, _sky.b, 6, dt);
  } else {
    scene.background = _sky.clone();
  }
  const fog = scene.fog as THREE.Fog | null;
  if (fog) {
    fog.color.copy(scene.background as THREE.Color);
    fog.near = 55 - s.weatherBlend * 12;
    fog.far = 150 - s.weatherBlend * 45;
  }

  // Sun / moon sharing one directional light
  if (elev > -0.06) {
    const x = -Math.cos(theta) * 30;
    const y = Math.max(2.5, elev * 26 + 3);
    env.sun.position.set(x, y, 13);
    env.sun.color.copy(SUN_WARM).lerp(SUN_NOON, smooth(0, 0.55, elev));
    env.sun.intensity = (0.35 + dayF * 2.4) * (1 - s.weatherBlend * 0.55);
    const sd = env.sunDisc;
    sd.visible = true;
    sd.position.set(x * 3.1, Math.max(4, y * 3.1), 40);
    (sd.material as THREE.MeshBasicMaterial).opacity = 0.35 + duskF * 0.6;
    (sd.material as THREE.MeshBasicMaterial).color.copy(SUN_WARM).lerp(SUN_NOON, smooth(0, 0.5, elev));
    const sc = 1 + duskF * 0.7;
    sd.scale.setScalar(sc);
    env.moonDisc.visible = false;
  } else {
    const mTheta = theta - Math.PI;
    const mx = -Math.cos(mTheta) * 26;
    const my = Math.max(4, Math.sin(mTheta) * 22 + 6);
    env.sun.position.set(mx, my, 10);
    env.sun.color.copy(MOON_COL);
    env.sun.intensity = 0.5 * (1 - s.weatherBlend * 0.3);
    env.moonDisc.visible = true;
    env.moonDisc.position.set(mx * 3.2, my * 3.2, 40);
    (env.moonDisc.material as THREE.MeshBasicMaterial).opacity = 0.9;
    env.sunDisc.visible = false;
  }

  env.hemi.intensity = (0.28 + dayF * 0.62) * (1 - s.weatherBlend * 0.25);
  env.hemi.color.set(0xbfe3f5).lerp(new THREE.Color(0x2a3350), nightF * 0.8);
  env.amb.intensity = 0.14 + dayF * 0.14;

  // Stars
  env.starMat.opacity = damp(env.starMat.opacity, nightF * (1 - s.weatherBlend * 0.75), 4, dt);

  // Clouds darken at night / rain
  _cloud.copy(CLOUD_NIGHT).lerp(CLOUD_DAY, dayF);
  _cloud.lerp(RAIN_GRAY, s.weatherBlend * 0.55);
  cloudMat.color.lerp(_cloud, 1 - Math.exp(-4 * dt));

  // Water: darker at night, warm kiss at dusk
  const bright = 0.32 + dayF * 0.68;
  waterMat.color.copy(WATER_BASE).multiplyScalar(bright * (1 - s.weatherBlend * 0.15));
  waterMat.emissive.copy(DUSK_GLOW).multiplyScalar(duskF * 0.22 * (1 - s.weatherBlend * 0.5));

  renderer.toneMappingExposure = 0.75 + dayF * 0.35 - s.weatherBlend * 0.06;
}
