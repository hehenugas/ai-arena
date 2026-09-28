import { clamp01, lerp } from './state';
import { QUALITY } from './state';

export interface DayColors {
  zenith: number;
  horizon: number;
  sunColor: number;
  sunIntensity: number;
  ambient: number;
  ambientIntensity: number;
  hemisphere: number;
  hemiIntensity: number;
  fog: number;
  /** 0 by day, ramps up at dusk and night. */
  duskiness: number;
}

interface Key {
  t: number; // minutes
  zenith: number;
  horizon: number;
  sunColor: number;
  sun: number;
  ambient: number;
  ambientI: number;
  hemi: number;
  hemiI: number;
  fog: number;
  dusk: number;
}

const KEYS: Key[] = [
  //  deep night
  { t: 0,    zenith: 0x0e1730, horizon: 0x223454, sunColor: 0x3a4d78, sun: 0.0,  ambient: 0x556392, ambientI: 0.92, hemi: 0x5e6ea0, hemiI: 0.78, fog: 0x16203a, dusk: 1.0 },
  //  pre-dawn
  { t: 300,  zenith: 0x1b2a4a, horizon: 0x524262, sunColor: 0x7a5a78, sun: 0.0,  ambient: 0x556398, ambientI: 0.85, hemi: 0x5e6ea4, hemiI: 0.74, fog: 0x2a3556, dusk: 0.9 },
  //  sunrise
  { t: 375,  zenith: 0x4a6a9e, horizon: 0xf2a45c, sunColor: 0xffb36b, sun: 1.5,  ambient: 0x6a6480, ambientI: 0.42, hemi: 0x8a7d90, hemiI: 0.45, fog: 0x8f7f92, dusk: 0.75 },
  //  morning
  { t: 510,  zenith: 0x5e9ed9, horizon: 0xcfe4f2, sunColor: 0xffe7bd, sun: 2.6,  ambient: 0x8a95a8, ambientI: 0.50, hemi: 0xbcd2e8, hemiI: 0.60, fog: 0xbcd2e0, dusk: 0.15 },
  //  midday
  { t: 780,  zenith: 0x4f92dd, horizon: 0xc4dcf0, sunColor: 0xfff2d8, sun: 3.0,  ambient: 0x94a0b4, ambientI: 0.55, hemi: 0xc4d9ec, hemiI: 0.65, fog: 0xc2d5e6, dusk: 0.0 },
  //  afternoon (default 16:00)
  { t: 960,  zenith: 0x4a8dd8, horizon: 0xbfd9ec, sunColor: 0xffe2b0, sun: 2.8,  ambient: 0x8d97ac, ambientI: 0.52, hemi: 0xc0d4e8, hemiI: 0.62, fog: 0xbccfe0, dusk: 0.05 },
  //  golden hour
  { t: 1170, zenith: 0x5a7ab8, horizon: 0xf7b26a, sunColor: 0xffa04e, sun: 2.1,  ambient: 0x7d7488, ambientI: 0.45, hemi: 0xa08ba0, hemiI: 0.5,  fog: 0xc4a184, dusk: 0.55 },
  //  sunset
  { t: 1245, zenith: 0x31416e, horizon: 0xe87a52, sunColor: 0xff7a3c, sun: 1.2,  ambient: 0x5c5470, ambientI: 0.40, hemi: 0x746a8c, hemiI: 0.42, fog: 0x8a6a70, dusk: 0.85 },
  //  dusk → night
  { t: 1335, zenith: 0x182440, horizon: 0x4a3c5e, sunColor: 0x55406a, sun: 0.1,  ambient: 0x525e90, ambientI: 0.85, hemi: 0x5a6698, hemiI: 0.72, fog: 0x232e4c, dusk: 1.0 },
  //  midnight
  { t: 1440, zenith: 0x0e1730, horizon: 0x223454, sunColor: 0x3a4d78, sun: 0.0,  ambient: 0x556392, ambientI: 0.92, hemi: 0x5e6ea0, hemiI: 0.78, fog: 0x16203a, dusk: 1.0 },
];

//  Lazily resolve THREE.Color through a registry set by main, so this module
//  stays import-light. Temp instances are created on first use.
type ColorLike = {
  setHex(h: number): ColorLike;
  lerpColors(a: ColorLike, b: ColorLike, t: number): ColorLike;
  getHex(): number;
};
let ColorClass: (new () => ColorLike) | null = null;
let cA: ColorLike | null = null;
let cB: ColorLike | null = null;

export function registerColor(c: new () => ColorLike): void {
  if (!ColorClass) {
    ColorClass = c;
    cA = new c();
    cB = new c();
  }
}

function colors(): [ColorLike, ColorLike] {
  if (!ColorClass || !cA || !cB) throw new Error('palette: call registerColor(THREE.Color) first');
  return [cA, cB];
}

const out: DayColors = {
  zenith: 0,
  horizon: 0,
  sunColor: 0,
  sunIntensity: 0,
  ambient: 0,
  ambientIntensity: 0,
  hemisphere: 0,
  hemiIntensity: 0,
  fog: 0,
  duskiness: 0,
};

/** Sample the day gradient at `minutes` (0..1440). Returns shared object. */
export function sampleDay(minutes: number): DayColors {
  const t = clamp01(minutes / 1440) * 1440;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const f = clamp01((t - a.t) / (b.t - a.t));

  out.zenith = mixHex(a.zenith, b.zenith, f);
  out.horizon = mixHex(a.horizon, b.horizon, f);
  out.sunColor = mixHex(a.sunColor, b.sunColor, f);
  out.sunIntensity = lerp(a.sun, b.sun, f);
  out.ambient = mixHex(a.ambient, b.ambient, f);
  out.ambientIntensity = lerp(a.ambientI, b.ambientI, f);
  out.hemisphere = mixHex(a.hemi, b.hemi, f);
  out.hemiIntensity = lerp(a.hemiI, b.hemiI, f);
  out.fog = mixHex(a.fog, b.fog, f);
  out.duskiness = lerp(a.dusk, b.dusk, f);
  return out;
}

/** Linear interpolation between two hex colors via a temp THREE.Color. */
export function mixHex(h1: number, h2: number, t: number): number {
  const [a, b] = colors();
  a.setHex(h1);
  b.setHex(h2);
  a.lerpColors(a, b, t);
  return a.getHex();
}

/** Landscape material tints: [day, night] — night value is used with duskiness. */
export const TINTS = {
  grassTop: [0x7dca6f, 0x4e6a86] as const,
  grassSide: [0x64b25e, 0x46617e] as const,
  dirt: [0x8a6a4f, 0x5c5a76] as const,
  rock: [0x8d9099, 0x5a6480] as const,
  rockDark: [0x6d7078, 0x4a5470] as const,
  trunk: [0x8a5a3b, 0x5e5570] as const,
  foliage: [0x5fae58, 0x466284] as const,
  foliageDark: [0x4c9a4c, 0x3f5a7c] as const,
  water: [0x5aa7d9, 0x46648e] as const,
  path: [0xd9c39a, 0x6e6884] as const,
  wall: [0xf3e6cf, 0x7a7690] as const,
  wood: [0xa8713f, 0x665a7c] as const,
  woodDark: [0x7c4f2c, 0x5a5070] as const,
  roof: [0xc75b45, 0x645578] as const,
  roofCap: [0xb04e3b, 0x5c5070] as const,
  leaf: [0xe8845c, 0x7c6a88] as const,
  leafCore: [0xd06a48, 0x715f7e] as const,
  fence: [0xb98c5c, 0x656080] as const,
  flower: [0xffffff, 0x9a9abc] as const,
  cloud: [0xffffff, 0x6a7690] as const,
  cloudShade: [0xdce8f2, 0x525e78] as const,
} as const;

export type TintKey = keyof typeof TINTS;

/**
 * Compute a material color: day color lerped toward its night twin by
 * `duskiness`. `rainDim` (0..1) further darkens toward a grey-blue storm tone.
 */
export function tint(key: TintKey, duskiness: number, rainDim: number): number {
  const [day, night] = TINTS[key];
  let c = mixHex(day, night, clamp01(duskiness));
  if (rainDim > 0) {
    c = mixHex(c, mixHex(day, 0x46506a, 0.55), clamp01(rainDim) * 0.55);
  }
  return c;
}

/** Global pixel-ratio cap, gentler on low-end devices. */
export function pixelRatioCap(): number {
  return QUALITY === 'high' ? 2 : 1.5;
}
