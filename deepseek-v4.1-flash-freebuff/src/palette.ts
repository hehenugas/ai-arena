import { Color } from 'three';
import { clamp01, lerp, smoothstep } from './utils';

/**
 * The whole look of the diorama is driven by one object: the palette that is
 * sampled from the sun's elevation. Lighting, sky, fog, water and clouds all
 * read from the same values, which keeps the scene visually coherent as the
 * time of day changes.
 */
export interface SkyPalette {
  skyTop: Color;
  horizon: Color;
  glow: Color;
  glowStrength: number;
  keyColor: Color;
  keyIntensity: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiIntensity: number;
  ambient: number;
  fog: Color;
  fogDensity: number;
  starOpacity: number;
  exposure: number;
  cloud: Color;
  cloudStorm: Color;
  sunDisc: Color;
}

type ColorKey =
  | 'skyTop'
  | 'horizon'
  | 'glow'
  | 'keyColor'
  | 'hemiSky'
  | 'hemiGround'
  | 'fog'
  | 'cloud'
  | 'cloudStorm'
  | 'sunDisc';

type NumberKey =
  | 'glowStrength'
  | 'keyIntensity'
  | 'hemiIntensity'
  | 'ambient'
  | 'fogDensity'
  | 'starOpacity'
  | 'exposure';

interface Stop {
  elev: number;
  colors: Record<ColorKey, string>;
  numbers: Record<NumberKey, number>;
}

const COLOR_KEYS: ColorKey[] = [
  'skyTop',
  'horizon',
  'glow',
  'keyColor',
  'hemiSky',
  'hemiGround',
  'fog',
  'cloud',
  'cloudStorm',
  'sunDisc',
];

const NUMBER_KEYS: NumberKey[] = [
  'glowStrength',
  'keyIntensity',
  'hemiIntensity',
  'ambient',
  'fogDensity',
  'starOpacity',
  'exposure',
];

/**
 * Stops are indexed by the sine of the sun's elevation, so both dawn and dusk
 * pass through the same warm band and the whole transition stays symmetrical.
 */
const STOPS: Stop[] = [
  {
    elev: -1,
    colors: {
      skyTop: '#050a16',
      horizon: '#0d1c2f',
      glow: '#3d5680',
      keyColor: '#a8bce6',
      hemiSky: '#2b405e',
      hemiGround: '#181f28',
      fog: '#0b1725',
      cloud: '#4a5668',
      cloudStorm: '#2c3441',
      sunDisc: '#dfe8ff',
    },
    numbers: {
      glowStrength: 0.25,
      keyIntensity: 0.62,
      hemiIntensity: 0.55,
      ambient: 0.32,
      fogDensity: 0.0125,
      starOpacity: 1,
      exposure: 1.16,
    },
  },
  {
    elev: -0.24,
    colors: {
      skyTop: '#0a1430',
      horizon: '#1d3253',
      glow: '#6f6f9c',
      keyColor: '#c2cdec',
      hemiSky: '#324767',
      hemiGround: '#1c222c',
      fog: '#16273a',
      cloud: '#5a6478',
      cloudStorm: '#333c4b',
      sunDisc: '#e8ecff',
    },
    numbers: {
      glowStrength: 0.5,
      keyIntensity: 0.72,
      hemiIntensity: 0.6,
      ambient: 0.34,
      fogDensity: 0.013,
      starOpacity: 0.9,
      exposure: 1.14,
    },
  },
  {
    elev: -0.07,
    colors: {
      skyTop: '#26355f',
      horizon: '#f0a165',
      glow: '#ff9d5c',
      keyColor: '#ff9f5e',
      hemiSky: '#4d577a',
      hemiGround: '#3a2f27',
      fog: '#d59573',
      cloud: '#8a7b86',
      cloudStorm: '#4b4a55',
      sunDisc: '#ffd9a8',
    },
    numbers: {
      glowStrength: 1.25,
      keyIntensity: 1.2,
      hemiIntensity: 0.58,
      ambient: 0.3,
      fogDensity: 0.0125,
      starOpacity: 0.32,
      exposure: 1.06,
    },
  },
  {
    elev: 0.045,
    colors: {
      skyTop: '#325f9e',
      horizon: '#f2c098',
      glow: '#ffc98f',
      keyColor: '#ffc07d',
      hemiSky: '#8096bd',
      hemiGround: '#6b6350',
      fog: '#c8b6a2',
      cloud: '#dcccd0',
      cloudStorm: '#5c616e',
      sunDisc: '#ffe9c4',
    },
    numbers: {
      glowStrength: 0.95,
      keyIntensity: 1.6,
      hemiIntensity: 0.66,
      ambient: 0.27,
      fogDensity: 0.0115,
      starOpacity: 0.1,
      exposure: 1.01,
    },
  },
  {
    elev: 0.3,
    colors: {
      skyTop: '#1c5eb9',
      horizon: '#93c0e8',
      glow: '#ffdcae',
      keyColor: '#fff1d8',
      hemiSky: '#a6c9ef',
      hemiGround: '#8b9070',
      fog: '#a9cae6',
      cloud: '#f6f4ef',
      cloudStorm: '#697381',
      sunDisc: '#fff4de',
    },
    numbers: {
      glowStrength: 0.55,
      keyIntensity: 1.9,
      hemiIntensity: 0.74,
      ambient: 0.3,
      fogDensity: 0.0105,
      starOpacity: 0,
      exposure: 0.97,
    },
  },
  {
    elev: 1,
    colors: {
      skyTop: '#1a5bb8',
      horizon: '#9cc5ea',
      glow: '#ffedc5',
      keyColor: '#fff7e8',
      hemiSky: '#bcdcf7',
      hemiGround: '#939a72',
      fog: '#adcdea',
      cloud: '#fbfaf7',
      cloudStorm: '#6f7987',
      sunDisc: '#fffaf0',
    },
    numbers: {
      glowStrength: 0.4,
      keyIntensity: 1.88,
      hemiIntensity: 0.76,
      ambient: 0.32,
      fogDensity: 0.01,
      starOpacity: 0,
      exposure: 0.96,
    },
  },
];

const STORM = {
  skyTop: '#49535f',
  horizon: '#6f7a86',
  fog: '#77828e',
  glow: '#8b8f96',
};

function createPalette(): SkyPalette {
  return {
    skyTop: new Color(),
    horizon: new Color(),
    glow: new Color(),
    glowStrength: 0,
    keyColor: new Color(),
    keyIntensity: 0,
    hemiSky: new Color(),
    hemiGround: new Color(),
    hemiIntensity: 0,
    ambient: 0,
    fog: new Color(),
    fogDensity: 0.012,
    starOpacity: 0,
    exposure: 1,
    cloud: new Color(),
    cloudStorm: new Color(),
    sunDisc: new Color(),
  };
}

const output = createPalette();
const scratch = new Color();

/**
 * Samples the palette for a sun elevation and mutates the shared output object
 * (no per-frame allocation).
 */
export function samplePalette(elevation: number): SkyPalette {
  const e = clamp01((elevation + 1) / 2) * 2 - 1;
  let index = STOPS.length - 2;
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (e <= STOPS[i + 1].elev) {
      index = i;
      break;
    }
  }
  const a = STOPS[index];
  const b = STOPS[index + 1];
  const t = smoothstep(a.elev, b.elev, e);

  for (const key of COLOR_KEYS) {
    output[key].set(a.colors[key]).lerp(scratch.set(b.colors[key]), t);
  }
  for (const key of NUMBER_KEYS) {
    output[key] = lerp(a.numbers[key], b.numbers[key], t);
  }
  return output;
}

/**
 * Applies the storm look on top of the sampled palette.
 *
 * The grey storm tint only applies while there is daylight to dull down; at
 * night rain has to make the sky darker instead of lifting it to a bright grey.
 */
export function applyRain(palette: SkyPalette, rain: number, night = 0): SkyPalette {
  if (rain > 0.001) {
    const daylight = 1 - clamp01(night);
    const storm = rain * (0.3 + 0.7 * daylight);

    palette.keyIntensity *= 1 - 0.52 * rain;
    palette.hemiIntensity *= 1 - 0.16 * rain;
    palette.ambient += 0.08 * rain * (0.4 + 0.6 * daylight);
    palette.glowStrength *= 1 - 0.85 * rain;
    palette.starOpacity *= 1 - 0.9 * rain;

    palette.skyTop.lerp(scratch.set(STORM.skyTop), storm * 0.62);
    palette.horizon.lerp(scratch.set(STORM.horizon), storm * 0.55);
    palette.fog.lerp(scratch.set(STORM.fog), storm * 0.72);
    palette.fogDensity = lerp(palette.fogDensity, palette.fogDensity * 1.5 + 0.005, rain);
    palette.cloud.lerp(palette.cloudStorm, rain);
    palette.sunDisc.lerp(scratch.set(STORM.glow), storm * 0.5);

    const nightDim = 1 - 0.4 * rain * clamp01(night);
    palette.skyTop.multiplyScalar(nightDim);
    palette.horizon.multiplyScalar(nightDim);
    palette.fog.multiplyScalar(nightDim);
  }
  return palette;
}

/** 1 at deep night, 0 once the sun is comfortably up. */
export function nightFactor(elevation: number): number {
  return smoothstep(0.17, -0.07, elevation);
}
