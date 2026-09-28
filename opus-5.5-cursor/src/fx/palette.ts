import * as THREE from 'three';
import { smoothstep } from '../utils/math';

interface Key {
  t: number;
  skyTop: number;
  horizon: number;
  bottom: number;
  key: number;
  keyI: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  night: number;
  glow: number;
  glowColor: number;
}

const NIGHT: Omit<Key, 't'> = {
  skyTop: 0x0c1633,
  horizon: 0x24345f,
  bottom: 0x101a36,
  key: 0xa3b6ff,
  keyI: 0.75,
  hemiSky: 0x7084c4,
  hemiGround: 0x484e68,
  hemiI: 0.95,
  night: 1,
  glow: 0,
  glowColor: 0x8899cc,
};

/** Hand-tuned lighting keyframes across a day. */
const KEYS: Key[] = [
  { t: 0, ...NIGHT },
  { t: 4.8, ...NIGHT, skyTop: 0x111c40, horizon: 0x2c3a68, keyI: 0.55 },
  {
    t: 5.7, skyTop: 0x2e3f74, horizon: 0xd4917c, bottom: 0x514a70, key: 0xffb48c, keyI: 0,
    hemiSky: 0xa0a0d0, hemiGround: 0x4a4046, hemiI: 0.9, night: 0.55, glow: 0.6, glowColor: 0xff9a6a,
  },
  {
    t: 6.6, skyTop: 0x7196cb, horizon: 0xf5c095, bottom: 0xa39bb0, key: 0xffc896, keyI: 1.7,
    hemiSky: 0xcad5ef, hemiGround: 0x6e604f, hemiI: 0.85, night: 0.08, glow: 0.55, glowColor: 0xffb37a,
  },
  {
    t: 8.5, skyTop: 0x69a5de, horizon: 0xd3e6f1, bottom: 0xa8c5da, key: 0xfff1dc, keyI: 2.7,
    hemiSky: 0xd9e9ff, hemiGround: 0x857a58, hemiI: 1.0, night: 0, glow: 0.15, glowColor: 0xfff0d0,
  },
  {
    t: 12, skyTop: 0x5a9ee2, horizon: 0xd2e8f6, bottom: 0xb5d2e6, key: 0xfff9f0, keyI: 3.0,
    hemiSky: 0xdcebff, hemiGround: 0x8a8660, hemiI: 1.05, night: 0, glow: 0.1, glowColor: 0xfff6e0,
  },
  {
    t: 16, skyTop: 0x5f9bd8, horizon: 0xeee3cf, bottom: 0xb3c3d2, key: 0xffe4bf, keyI: 2.9,
    hemiSky: 0xdbe5f3, hemiGround: 0x8f7c5c, hemiI: 1.0, night: 0, glow: 0.25, glowColor: 0xffd9a0,
  },
  {
    t: 17.6, skyTop: 0x6b85c2, horizon: 0xf8c28c, bottom: 0xb49cb0, key: 0xffb877, keyI: 2.4,
    hemiSky: 0xe0cfdf, hemiGround: 0x8a6650, hemiI: 1.05, night: 0, glow: 0.75, glowColor: 0xffa060,
  },
  {
    t: 18.3, skyTop: 0x485a9c, horizon: 0xf08e6c, bottom: 0x86688a, key: 0xff8a5c, keyI: 0,
    hemiSky: 0xc8a6c8, hemiGround: 0x6a4c52, hemiI: 1.1, night: 0.3, glow: 0.95, glowColor: 0xff7a50,
  },
  {
    t: 19.2, skyTop: 0x1f2b60, horizon: 0x6c5280, bottom: 0x2b284c, key: 0xa8b8ff, keyI: 0.45,
    hemiSky: 0x7a80c0, hemiGround: 0x34304a, hemiI: 0.9, night: 0.75, glow: 0.3, glowColor: 0xc07080,
  },
  { t: 20.5, ...NIGHT, skyTop: 0x0e1838, horizon: 0x26386b },
  { t: 24, ...NIGHT },
];

/** Hours at which the key light hands over between sun and moon (both at zero intensity). */
export const SUNRISE = 5.7;
export const SUNSET = 18.3;

export interface PaletteSample {
  skyTop: THREE.Color;
  horizon: THREE.Color;
  bottom: THREE.Color;
  key: THREE.Color;
  keyI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  night: number;
  glow: number;
  glowColor: THREE.Color;
}

export function createSample(): PaletteSample {
  return {
    skyTop: new THREE.Color(),
    horizon: new THREE.Color(),
    bottom: new THREE.Color(),
    key: new THREE.Color(),
    keyI: 0,
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiI: 0,
    night: 0,
    glow: 0,
    glowColor: new THREE.Color(),
  };
}

const ca = new THREE.Color();
const cb = new THREE.Color();
const mix = (out: THREE.Color, a: number, b: number, t: number) =>
  out.copy(ca.setHex(a)).lerp(cb.setHex(b), t);

export function samplePalette(hour: number, out: PaletteSample): PaletteSample {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smoothstep(0, 1, (h - a.t) / (b.t - a.t));
  mix(out.skyTop, a.skyTop, b.skyTop, t);
  mix(out.horizon, a.horizon, b.horizon, t);
  mix(out.bottom, a.bottom, b.bottom, t);
  mix(out.key, a.key, b.key, t);
  mix(out.hemiSky, a.hemiSky, b.hemiSky, t);
  mix(out.hemiGround, a.hemiGround, b.hemiGround, t);
  mix(out.glowColor, a.glowColor, b.glowColor, t);
  out.keyI = a.keyI + (b.keyI - a.keyI) * t;
  out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * t;
  out.night = a.night + (b.night - a.night) * t;
  out.glow = a.glow + (b.glow - a.glow) * t;
  return out;
}

/** Direction toward the sun (by day) or moon (by night). */
export function keyLightDirection(hour: number, out: THREE.Vector3): { isSun: boolean } {
  const h = ((hour % 24) + 24) % 24;
  const isSun = h >= SUNRISE && h < SUNSET;
  if (isSun) {
    const a = ((h - 6) / 12) * Math.PI;
    out.set(Math.cos(a), Math.max(Math.sin(a), 0) * 1.1 + 0.12, 0.8);
  } else {
    const since = (h - SUNSET + 24) % 24;
    const a = (since / (24 - (SUNSET - SUNRISE))) * Math.PI;
    out.set(Math.cos(a) * 0.8, Math.max(Math.sin(a), 0.2), 0.75);
  }
  out.normalize();
  return { isSun };
}

/** Where the sun actually is, even below the horizon — drives the sky glow. */
export function sunDirection(hour: number, out: THREE.Vector3): THREE.Vector3 {
  const a = ((hour - 6) / 12) * Math.PI;
  return out.set(Math.cos(a), Math.sin(a), 0.7).normalize();
}
