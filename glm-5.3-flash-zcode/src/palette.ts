import { Color } from 'three';

export interface SkySample {
  skyTop: Color;
  skyHorizon: Color;
  skyDeep: Color;
  sunColor: Color;
  sunIntensity: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiIntensity: number;
  ambientIntensity: number;
  fogColor: Color;
  /** 0 by day, 1 on a clear midnight; drives stars and window glow. */
  night: number;
}

interface SkyKey {
  at: number;
  skyTop: number;
  skyHorizon: number;
  skyDeep: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambientIntensity: number;
  fogColor: number;
  night: number;
}

/**
 * Keyframes over the 24h clock. Times: midnight, pre-dawn, sunrise, morning,
 * noon, late afternoon (the default view), sunset, dusk, night.
 */
const KEYS: SkyKey[] = [
  { at: 0.0,  skyTop: 0x0c1530, skyHorizon: 0x182647, skyDeep: 0x0a1122, sunColor: 0x9db4e4, sunIntensity: 0.30, hemiSky: 0x25355c, hemiGround: 0x141a20, hemiIntensity: 0.30, ambientIntensity: 0.16, fogColor: 0x131c33, night: 1.0 },
  { at: 4.6,  skyTop: 0x142042, skyHorizon: 0x3b3f63, skyDeep: 0x121a30, sunColor: 0xa9b6e2, sunIntensity: 0.30, hemiSky: 0x2c3a63, hemiGround: 0x1a1d26, hemiIntensity: 0.34, ambientIntensity: 0.17, fogColor: 0x1b2340, night: 0.9 },
  { at: 6.2,  skyTop: 0x3d5e95, skyHorizon: 0xf2a75f, skyDeep: 0x4a4a66, sunColor: 0xffc98d, sunIntensity: 0.65, hemiSky: 0x8fa3c8, hemiGround: 0x5a4a3a, hemiIntensity: 0.5,  ambientIntensity: 0.22, fogColor: 0xd9a877, night: 0.45 },
  { at: 7.6,  skyTop: 0x6d9ed6, skyHorizon: 0xffe9c4, skyDeep: 0x7c88a6, sunColor: 0xffe2b0, sunIntensity: 1.10, hemiSky: 0xb9d3ee, hemiGround: 0x9c8a70, hemiIntensity: 0.56, ambientIntensity: 0.27, fogColor: 0xe9dcbf, night: 0.08 },
  { at: 12.0, skyTop: 0x77abe0, skyHorizon: 0xdff0f6, skyDeep: 0x93a4bd, sunColor: 0xfff3d8, sunIntensity: 1.35, hemiSky: 0xc2dcf4, hemiGround: 0xb0a08a, hemiIntensity: 0.62, ambientIntensity: 0.30, fogColor: 0xdcecf2, night: 0.0 },
  { at: 16.0, skyTop: 0x6f9fd4, skyHorizon: 0xf6e7c4, skyDeep: 0x8d9bb5, sunColor: 0xffe6b8, sunIntensity: 1.18, hemiSky: 0xbcd4ec, hemiGround: 0xa8977c, hemiIntensity: 0.58, ambientIntensity: 0.28, fogColor: 0xe7dcc2, night: 0.0 },
  { at: 18.2, skyTop: 0x50699f, skyHorizon: 0xf7b169, skyDeep: 0x5a5f7d, sunColor: 0xffab62, sunIntensity: 0.85, hemiSky: 0x9aa6c8, hemiGround: 0x7c5f47, hemiIntensity: 0.46, ambientIntensity: 0.24, fogColor: 0xdfa878, night: 0.22 },
  { at: 19.6, skyTop: 0x273357, skyHorizon: 0xa56a76, skyDeep: 0x2c3048, sunColor: 0xd9906c, sunIntensity: 0.28, hemiSky: 0x47516f, hemiGround: 0x2e2830, hemiIntensity: 0.36, ambientIntensity: 0.19, fogColor: 0x59455c, night: 0.6 },
  { at: 21.0, skyTop: 0x0e1731, skyHorizon: 0x1b2a4c, skyDeep: 0x0a1122, sunColor: 0x9db4e4, sunIntensity: 0.30, hemiSky: 0x25355c, hemiGround: 0x141a20, hemiIntensity: 0.30, ambientIntensity: 0.16, fogColor: 0x131c33, night: 1.0 },
  { at: 24.0, skyTop: 0x0c1530, skyHorizon: 0x182647, skyDeep: 0x0a1122, sunColor: 0x9db4e4, sunIntensity: 0.30, hemiSky: 0x25355c, hemiGround: 0x141a20, hemiIntensity: 0.30, ambientIntensity: 0.16, fogColor: 0x131c33, night: 1.0 },
];

const RAIN_TINTS = {
  dayTop: new Color(0x5c6b7d),
  dayHorizon: new Color(0x9aa7b1),
  dayFog: new Color(0x8f9aa4),
};

const scratchA = new Color();
const scratchB = new Color();

function lerpHex(a: number, b: number, t: number, out: Color): Color {
  scratchA.setHex(a);
  scratchB.setHex(b);
  return out.copy(scratchA).lerp(scratchB, t);
}

function lerpKey(a: SkyKey, b: SkyKey, t: number, out: SkySample): SkySample {
  lerpHex(a.skyTop, b.skyTop, t, out.skyTop);
  lerpHex(a.skyHorizon, b.skyHorizon, t, out.skyHorizon);
  lerpHex(a.skyDeep, b.skyDeep, t, out.skyDeep);
  lerpHex(a.sunColor, b.sunColor, t, out.sunColor);
  lerpHex(a.hemiSky, b.hemiSky, t, out.hemiSky);
  lerpHex(a.hemiGround, b.hemiGround, t, out.hemiGround);
  lerpHex(a.fogColor, b.fogColor, t, out.fogColor);
  const l = (x: number, y: number) => x + (y - x) * t;
  out.sunIntensity = l(a.sunIntensity, b.sunIntensity);
  out.hemiIntensity = l(a.hemiIntensity, b.hemiIntensity);
  out.ambientIntensity = l(a.ambientIntensity, b.ambientIntensity);
  out.night = l(a.night, b.night);
  return out;
}

export function createSkySampler() {
  const sample: SkySample = {
    skyTop: new Color(),
    skyHorizon: new Color(),
    skyDeep: new Color(),
    sunColor: new Color(),
    sunIntensity: 1,
    hemiSky: new Color(),
    hemiGround: new Color(),
    hemiIntensity: 1,
    ambientIntensity: 0.3,
    fogColor: new Color(),
    night: 0,
  };

  /** Sample the daylight ramp; rain greys the palette by `rainAmount`. */
  return (time: number, rainAmount: number): SkySample => {
    const t = ((time % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].at <= t) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const span = Math.max(b.at - a.at, 1e-5);
    const k = Math.min(Math.max((t - a.at) / span, 0), 1);
    lerpKey(a, b, k, sample);

    if (rainAmount > 0) {
      // Overcast: pull sky and fog toward muted grey, strongest at midday.
      const w = rainAmount * 0.8;
      sample.skyTop.lerp(RAIN_TINTS.dayTop, w * (1 - sample.night * 0.65));
      sample.skyHorizon.lerp(RAIN_TINTS.dayHorizon, w * (1 - sample.night * 0.55));
      sample.fogColor.lerp(RAIN_TINTS.dayFog, w * (1 - sample.night * 0.6));
      sample.sunIntensity *= 1 - 0.6 * rainAmount;
      sample.hemiIntensity *= 1 - 0.12 * rainAmount;
    }
    return sample;
  };
}

/** Sun path: rises at 6, peaks at noon, sets at 18. Slight z tilt for nicer shadows. */
export function sunDirection(time: number, out: { x: number; y: number; z: number }) {
  const angle = ((time - 6) / 12) * Math.PI;
  out.x = Math.cos(angle);
  out.y = Math.sin(angle);
  out.z = 0.38;
  return out;
}

/** Moon travels the opposite arc. */
export function moonDirection(time: number, out: { x: number; y: number; z: number }) {
  sunDirection(time, out);
  out.x *= -1;
  out.y *= -1;
  out.z = -0.3;
  return out;
}
