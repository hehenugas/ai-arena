import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './utils';

interface MoodStop {
  /** Sun elevation in [-1,1]; 0 is the horizon. */
  elevation: number;
  skyTop: number;
  skyHorizon: number;
  skyLow: number;
  light: number;
  lightIntensity: number;
  fill: number;
  fillIntensity: number;
  fog: number;
  exposure: number;
  starAmount: number;
}

/**
 * Six hand-picked moods instead of a naive day/night lerp, so dusk keeps its
 * orange band low on the sky and midnight keeps a readable blue floor.
 */
const STOPS: MoodStop[] = [
  {
    elevation: -1.0,
    skyTop: 0x05070f,
    skyHorizon: 0x101a30,
    skyLow: 0x080c16,
    light: 0x8fa9dd,
    lightIntensity: 0.35,
    fill: 0x2b3c63,
    fillIntensity: 0.5,
    fog: 0x0b1120,
    exposure: 1.18,
    starAmount: 1,
  },
  {
    elevation: -0.16,
    skyTop: 0x0d1730,
    skyHorizon: 0x2a2f4e,
    skyLow: 0x131627,
    light: 0x9db3e0,
    lightIntensity: 0.42,
    fill: 0x33456b,
    fillIntensity: 0.6,
    fog: 0x141c30,
    exposure: 1.14,
    starAmount: 0.85,
  },
  {
    elevation: -0.02,
    skyTop: 0x2f3f6d,
    skyHorizon: 0xc9704f,
    skyLow: 0x27283c,
    light: 0xff9a5e,
    lightIntensity: 0.62,
    fill: 0x5b6389,
    fillIntensity: 0.78,
    fog: 0x4a4058,
    exposure: 1.06,
    starAmount: 0.22,
  },
  {
    elevation: 0.16,
    skyTop: 0x4a7ec2,
    skyHorizon: 0xf0a663,
    skyLow: 0x6d5f6b,
    light: 0xffb877,
    lightIntensity: 1.45,
    fill: 0x8fa5c4,
    fillIntensity: 0.85,
    fog: 0xd0a888,
    exposure: 1.0,
    starAmount: 0,
  },
  {
    elevation: 0.45,
    skyTop: 0x3f86d4,
    skyHorizon: 0xd9e7ef,
    skyLow: 0x6d8fae,
    light: 0xfff1d6,
    lightIntensity: 2.15,
    fill: 0xa8c6e0,
    fillIntensity: 0.9,
    fog: 0xc9dbe6,
    exposure: 0.95,
    starAmount: 0,
  },
  {
    elevation: 1.0,
    skyTop: 0x2f7ed6,
    skyHorizon: 0xeaf4fa,
    skyLow: 0x7fa3c2,
    light: 0xfffaf0,
    lightIntensity: 2.35,
    fill: 0xb2cfe6,
    fillIntensity: 0.95,
    fog: 0xd6e6ef,
    exposure: 0.92,
    starAmount: 0,
  },
];

export interface Mood {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  skyLow: THREE.Color;
  light: THREE.Color;
  lightIntensity: number;
  fill: THREE.Color;
  fillIntensity: number;
  fog: THREE.Color;
  exposure: number;
  /** 0 in full daylight, 1 in deep night. */
  night: number;
}

export const createMood = (): Mood => ({
  skyTop: new THREE.Color(),
  skyHorizon: new THREE.Color(),
  skyLow: new THREE.Color(),
  light: new THREE.Color(),
  lightIntensity: 0,
  fill: new THREE.Color(),
  fillIntensity: 0,
  fog: new THREE.Color(),
  exposure: 1,
  night: 0,
});

const RAIN_DESATURATE = new THREE.Color(0x9aa6ad);
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

function stopAt(elevation: number): { a: MoodStop; b: MoodStop; t: number } {
  if (elevation <= STOPS[0].elevation) return { a: STOPS[0], b: STOPS[0], t: 0 };
  const last = STOPS[STOPS.length - 1];
  if (elevation >= last.elevation) return { a: last, b: last, t: 0 };
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (elevation >= a.elevation && elevation <= b.elevation) {
      return { a, b, t: (elevation - a.elevation) / (b.elevation - a.elevation) };
    }
  }
  return { a: last, b: last, t: 0 };
}

/** Blend the two moods that bracket the current sun elevation. */
export function sampleMood(elevation: number, rain: number, out: Mood): Mood {
  const { a, b, t } = stopAt(clamp(elevation, -1, 1));
  out.skyTop.setHex(a.skyTop).lerp(tmpA.setHex(b.skyTop), t);
  out.skyHorizon.setHex(a.skyHorizon).lerp(tmpA.setHex(b.skyHorizon), t);
  out.skyLow.setHex(a.skyLow).lerp(tmpA.setHex(b.skyLow), t);
  out.light.setHex(a.light).lerp(tmpA.setHex(b.light), t);
  out.lightIntensity = lerp(a.lightIntensity, b.lightIntensity, t);
  out.fill.setHex(a.fill).lerp(tmpA.setHex(b.fill), t);
  out.fillIntensity = lerp(a.fillIntensity, b.fillIntensity, t);
  out.fog.setHex(a.fog).lerp(tmpA.setHex(b.fog), t);
  out.exposure = lerp(a.exposure, b.exposure, t);
  out.night = 1 - smoothstep(-0.1, 0.2, elevation);

  // Rain pulls every colour toward slate and flattens the contrast.
  if (rain > 0.001) {
    const r = rain * 0.72;
    out.skyTop.lerp(tmpB.copy(RAIN_DESATURATE).multiplyScalar(0.42), r);
    out.skyHorizon.lerp(tmpB.copy(RAIN_DESATURATE).multiplyScalar(0.78), r);
    out.skyLow.lerp(tmpB.copy(RAIN_DESATURATE).multiplyScalar(0.3), r);
    out.fog.lerp(tmpB.copy(RAIN_DESATURATE).multiplyScalar(0.5), r);
    out.light.lerp(tmpB.setHex(0xc8cfd6), r * 0.6);
    out.lightIntensity *= lerp(1, 0.34, rain);
    out.exposure *= lerp(1, 0.94, rain);
  }
  return out;
}

/** How strongly lit windows should read, 0 by day, 1 at midnight. */
export const windowProminence = (elevation: number): number =>
  smoothstep(0.22, -0.08, elevation);

/** Shared diorama palette so every module speaks the same colour language. */
export const PALETTE = {
  grass: 0x74a851,
  grassDry: 0x9cb45c,
  grassDeep: 0x4e7c42,
  dirt: 0x8d6a48,
  rock: 0x77716b,
  rockDark: 0x5a5450,
  sand: 0xcdb68c,
  water: 0x4b7f96,
  waterDeep: 0x2f5b73,
  plaster: 0xefe4d0,
  plasterShade: 0xd8c8ad,
  timber: 0x6b4a35,
  timberDark: 0x4a3325,
  roof: 0xa85b4a,
  roofDark: 0x82443a,
  door: 0x4e7a55,
  leafA: 0x5d9450,
  leafB: 0x3f7a46,
  leafC: 0x76a94f,
  conifer: 0x35684a,
  cloud: 0xf6f2ea,
  cloudStorm: 0x8b939c,
  lamp: 0xffc46b,
  flowerA: 0xf2e2a0,
  flowerB: 0xe39bb0,
  flowerC: 0xf6f1e4,
} as const;
