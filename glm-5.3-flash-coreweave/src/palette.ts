import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './util';

/**
 * Keyframes across a 24h day. Times are in hours; the last entry wraps back to
 * midnight so interpolation is continuous over the whole circle.
 */
interface Key {
  h: number;
  top: THREE.Color;
  horizon: THREE.Color;
  down: THREE.Color;
  sun: THREE.Color;
  sunI: number;
  amb: THREE.Color;
  ambI: number;
  hemiI: number;
  glow: number;
}

const C = (hex: string) => new THREE.Color(hex);
const K = (
  h: number,
  top: string,
  horizon: string,
  down: string,
  sun: string,
  sunI: number,
  amb: string,
  ambI: number,
  hemiI: number,
  glow: number,
): Key => ({ h, top: C(top), horizon: C(horizon), down: C(down), sun: C(sun), sunI, amb: C(amb), ambI, hemiI, glow });

const KEYS: Key[] = [
  K(0.0, '#0b1128', '#17203c', '#0a0f1e', '#ff9a5e', 0.0, '#2c3a55', 0.3, 0.18, 0.0),
  K(4.5, '#101632', '#232c4e', '#0c1120', '#ff9a5e', 0.0, '#31405c', 0.32, 0.2, 0.0),
  K(5.6, '#1d2a52', '#5d4668', '#141a30', '#ff9a6e', 0.25, '#4a4a66', 0.38, 0.26, 0.35),
  K(6.4, '#3a5c96', '#ff9e5e', '#2a2438', '#ffb877', 1.3, '#7a7290', 0.45, 0.34, 0.85),
  K(8.0, '#6ea6da', '#d6e9f2', '#55627a', '#fff0d4', 2.5, '#b9c6d8', 0.5, 0.5, 0.25),
  K(12.0, '#7cb5e4', '#dcedf6', '#5a6d86', '#fff7e8', 3.0, '#c2d2e2', 0.55, 0.55, 0.12),
  K(15.5, '#6da4d8', '#d3e6ee', '#57667e', '#ffeecd', 2.7, '#bcc8da', 0.52, 0.52, 0.18),
  K(17.0, '#5b86c4', '#f2bd7a', '#4c4658', '#ffd9a2', 2.1, '#a89a9a', 0.46, 0.45, 0.55),
  K(18.3, '#3c528e', '#ef8a58', '#33283c', '#ff8f5e', 1.1, '#8a6f86', 0.4, 0.36, 0.8),
  K(19.3, '#232c5a', '#9e5a74', '#1c1830', '#c26a80', 0.25, '#55486a', 0.34, 0.26, 0.4),
  K(20.4, '#101734', '#1f2848', '#0b0f1f', '#c26a80', 0.0, '#303e5a', 0.3, 0.2, 0.0),
  // wraps back to midnight
  K(24.0, '#0b1128', '#17203c', '#0a0f1e', '#ff9a5e', 0.0, '#2c3a55', 0.3, 0.18, 0.0),
];

export interface DayCycle {
  t01: number;
  sunDir: THREE.Vector3;
  sunElev: number;
  moonDir: THREE.Vector3;
  moonElev: number;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  skyDown: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  hemiIntensity: number;
  glow: number;
  night: number;
  moonColor: THREE.Color;
  moonIntensity: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  /** 0..1 brightness hint for clouds. */
  cloudLight: number;
}

export function createDayCycle(): DayCycle {
  return {
    t01: 0,
    sunDir: new THREE.Vector3(0, 1, 0),
    sunElev: 0,
    moonDir: new THREE.Vector3(0, -1, 0),
    moonElev: 0,
    skyTop: new THREE.Color(),
    skyHorizon: new THREE.Color(),
    skyDown: new THREE.Color(),
    sunColor: new THREE.Color(),
    sunIntensity: 0,
    ambientColor: new THREE.Color(),
    ambientIntensity: 0,
    hemiIntensity: 0,
    glow: 0,
    night: 0,
    moonColor: new THREE.Color(),
    moonIntensity: 0,
    fogColor: new THREE.Color(),
    fogNear: 30,
    fogFar: 95,
    cloudLight: 1,
  };
}

const RAIN_TOP_DAY = C('#4d5a66');
const RAIN_TOP_NIGHT = C('#10141d');
const RAIN_HOR_DAY = C('#8b97a1');
const RAIN_HOR_NIGHT = C('#1c222c');
const RAIN_SUN = C('#9fb0c0');
const MOON_COLOR = C('#aac4ee');
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

/**
 * Samples the day cycle at `hours` (0–24) and blends weather on top.
 * `out` is filled in place — no allocations per frame.
 */
export function sampleCycle(hours: number, weatherT: number, out: DayCycle): DayCycle {
  const h = ((hours % 24) + 24) % 24;

  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const f = clamp((h - a.h) / (b.h - a.h), 0, 1);

  out.skyTop.copy(a.top).lerp(b.top, f);
  out.skyHorizon.copy(a.horizon).lerp(b.horizon, f);
  out.skyDown.copy(a.down).lerp(b.down, f);
  out.sunColor.copy(a.sun).lerp(b.sun, f);
  out.ambientColor.copy(a.amb).lerp(b.amb, f);
  out.sunIntensity = lerp(a.sunI, b.sunI, f);
  out.ambientIntensity = lerp(a.ambI, b.ambI, f);
  out.hemiIntensity = lerp(a.hemiI, b.hemiI, f);
  out.glow = lerp(a.glow, b.glow, f);

  const th = ((h - 6) / 12) * Math.PI;
  out.sunDir.set(Math.cos(th) * 0.92, Math.sin(th), -0.38).normalize();
  out.sunElev = out.sunDir.y;
  out.moonDir.set(-Math.cos(th) * 0.92, -Math.sin(th), 0.3).normalize();
  out.moonElev = out.moonDir.y;

  const night = 1 - smoothstep(-0.14, 0.1, out.sunElev);
  out.night = night;

  // Weather blending: gray-blue overcast, dimmer sun, denser fog.
  tmpA.copy(RAIN_TOP_DAY).lerp(RAIN_TOP_NIGHT, night);
  tmpB.copy(RAIN_HOR_DAY).lerp(RAIN_HOR_NIGHT, night);
  out.skyTop.lerp(tmpA, weatherT);
  out.skyHorizon.lerp(tmpB, weatherT);
  out.skyDown.lerp(tmpA, weatherT * 0.8);
  out.sunColor.lerp(RAIN_SUN, weatherT * 0.7);
  out.sunIntensity *= 1 - 0.62 * weatherT;
  // Fade the key light to zero at horizon crossings so the sun→moon swap is invisible.
  out.sunIntensity *= smoothstep(-0.02, 0.12, out.sunElev);
  out.ambientIntensity += 0.16 * weatherT;
  out.glow *= 1 - weatherT;

  out.moonColor.copy(MOON_COLOR);
  out.moonIntensity =
    0.5 * smoothstep(-0.04, 0.22, out.moonElev) * (1 - 0.45 * weatherT) * (0.35 + 0.65 * night);

  out.cloudLight = (0.22 + 0.78 * (1 - night)) * (1 - 0.35 * weatherT);
  out.fogColor.copy(out.skyHorizon);
  out.fogNear = lerp(30, 20, weatherT);
  out.fogFar = lerp(95, 68, weatherT);
  out.t01 = h / 24;
  return out;
}
