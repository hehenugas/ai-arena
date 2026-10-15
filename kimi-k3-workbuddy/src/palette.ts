import * as THREE from 'three';

/**
 * Keyframed environment palette across a 24h day.
 * Times in hours. Values are linearly interpolated between keyframes.
 */
export interface EnvSample {
  skyTop: THREE.Color;
  skyBottom: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  /** 0 = full day, 1 = full night */
  nightness: number;
  /** warm sunset band strength 0..1 */
  sunsetGlow: number;
  fogDensity: number;
}

interface Key {
  h: number;
  skyTop: number;
  skyBottom: number;
  sun: number;
  sunI: number;
  amb: number;
  ambI: number;
  night: number;
  glow: number;
  fog: number;
}

const KEYS: Key[] = [
  { h: 0.0,  skyTop: 0x0b1526, skyBottom: 0x1a2a42, sun: 0xbfd0ff, sunI: 0.12, amb: 0x3a4a66, ambI: 0.5,  night: 1.0,  glow: 0.0, fog: 0.020 },
  { h: 4.5,  skyTop: 0x0e1a2e, skyBottom: 0x233450, sun: 0xbfd0ff, sunI: 0.12, amb: 0x3a4a66, ambI: 0.5,  night: 1.0,  glow: 0.0, fog: 0.020 },
  { h: 5.5,  skyTop: 0x2a3a5e, skyBottom: 0xd98a5e, sun: 0xffb37a, sunI: 0.5,  amb: 0x6a6a80, ambI: 0.55, night: 0.45, glow: 1.0, fog: 0.018 },
  { h: 7.0,  skyTop: 0x6fa8d8, skyBottom: 0xcfe4ee, sun: 0xfff2dd, sunI: 1.5,  amb: 0xa9c4d4, ambI: 0.7,  night: 0.0,  glow: 0.2, fog: 0.012 },
  { h: 12.0, skyTop: 0x7cc3e8, skyBottom: 0xe4f2f4, sun: 0xfff6e8, sunI: 2.2,  amb: 0xbcd8e0, ambI: 0.8,  night: 0.0,  glow: 0.0, fog: 0.010 },
  { h: 16.5, skyTop: 0x74b4de, skyBottom: 0xf0e2c4, sun: 0xffe9c4, sunI: 1.9,  amb: 0xb4cbd2, ambI: 0.75, night: 0.0,  glow: 0.25, fog: 0.011 },
  { h: 18.5, skyTop: 0x3c4a7a, skyBottom: 0xf0955c, sun: 0xff9e56, sunI: 0.9,  amb: 0x7a7a96, ambI: 0.6,  night: 0.3,  glow: 1.0, fog: 0.016 },
  { h: 20.0, skyTop: 0x18233e, skyBottom: 0x4a3a5e, sun: 0xcfa8ff, sunI: 0.25, amb: 0x4a5470, ambI: 0.55, night: 0.8,  glow: 0.3, fog: 0.019 },
  { h: 21.5, skyTop: 0x0b1526, skyBottom: 0x1a2a42, sun: 0xbfd0ff, sunI: 0.12, amb: 0x3a4a66, ambI: 0.5,  night: 1.0,  glow: 0.0, fog: 0.020 },
  { h: 24.0, skyTop: 0x0b1526, skyBottom: 0x1a2a42, sun: 0xbfd0ff, sunI: 0.12, amb: 0x3a4a66, ambI: 0.5,  night: 1.0,  glow: 0.0, fog: 0.020 }
];

const ca = new THREE.Color();
const cb = new THREE.Color();

function lerpColor(a: number, b: number, t: number, out: THREE.Color): THREE.Color {
  ca.setHex(a);
  cb.setHex(b);
  out.copy(ca).lerp(cb, t);
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sample the environment palette at a given time (minutes). */
export function sampleEnv(minutes: number, out: EnvSample): EnvSample {
  const h = (minutes / 60) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const k0 = KEYS[i];
  const k1 = KEYS[i + 1];
  const t = THREE.MathUtils.clamp((h - k0.h) / (k1.h - k0.h || 1), 0, 1);
  const s = t * t * (3 - 2 * t); // smoothstep for buttery transitions

  lerpColor(k0.skyTop, k1.skyTop, s, out.skyTop);
  lerpColor(k0.skyBottom, k1.skyBottom, s, out.skyBottom);
  lerpColor(k0.sun, k1.sun, s, out.sunColor);
  lerpColor(k0.amb, k1.amb, s, out.ambientColor);
  out.sunIntensity = lerp(k0.sunI, k1.sunI, s);
  out.ambientIntensity = lerp(k0.ambI, k1.ambI, s);
  out.nightness = lerp(k0.night, k1.night, s);
  out.sunsetGlow = lerp(k0.glow, k1.glow, s);
  out.fogDensity = lerp(k0.fog, k1.fog, s);
  return out;
}

export function createEnvSample(): EnvSample {
  return {
    skyTop: new THREE.Color(),
    skyBottom: new THREE.Color(),
    sunColor: new THREE.Color(),
    sunIntensity: 1,
    ambientColor: new THREE.Color(),
    ambientIntensity: 1,
    nightness: 0,
    sunsetGlow: 0,
    fogDensity: 0.012
  };
}

/** Sun azimuth/elevation for a given hour. Rises ~6h, sets ~18.5h. */
export function sunDirection(hours: number, out: THREE.Vector3): THREE.Vector3 {
  // angle around the sky: -PI at midnight, 0 at noon-ish overhead pass
  const dayT = THREE.MathUtils.clamp((hours - 6) / 12.5, 0, 1);
  const elev = Math.sin(dayT * Math.PI) * THREE.MathUtils.degToRad(62) + THREE.MathUtils.degToRad(4);
  const azim = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-70), THREE.MathUtils.degToRad(250), dayT);
  out.set(
    Math.cos(elev) * Math.cos(azim),
    Math.sin(elev),
    Math.cos(elev) * Math.sin(azim)
  );
  return out.normalize();
}
