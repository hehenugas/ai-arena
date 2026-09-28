import { Color, Vector3 } from 'three';
import { ColorStops, clamp, lerp, smoothstep } from '../utils';
import { TAU } from '../utils';

// ---- time-of-day colour scripts (minutes -> colour) -------------------------

const TOP_STOPS = new ColorStops([
  [0, '#0b1230'],
  [270, '#141c3d'],
  [360, '#3d4a7a'],
  [420, '#6b93c9'],
  [510, '#63a3dd'],
  [720, '#5aa8e6'],
  [960, '#63a4dd'],
  [1038, '#7d92cf'],
  [1098, '#6a63ae'],
  [1152, '#3b3a72'],
  [1230, '#161d43'],
  [1440, '#0b1230'],
]);

const HORIZON_STOPS = new ColorStops([
  [0, '#1a2445'],
  [270, '#2a3255'],
  [360, '#e8a179'],
  [420, '#f3c79a'],
  [510, '#cfe3ee'],
  [720, '#d8ecf5'],
  [960, '#d3e6ee'],
  [1038, '#f6c48c'],
  [1098, '#ff9d6e'],
  [1152, '#8d5f82'],
  [1230, '#2b3358'],
  [1440, '#1a2445'],
]);

const SUN_STOPS = new ColorStops([
  [0, '#8fa8d8'],
  [330, '#a07a9a'],
  [360, '#ff9a5e'],
  [420, '#ffc48f'],
  [510, '#ffe9c9'],
  [720, '#fff6e6'],
  [960, '#ffeed6'],
  [1038, '#ffd39a'],
  [1098, '#ff9462'],
  [1150, '#c9758a'],
  [1230, '#8fa8d8'],
  [1440, '#8fa8d8'],
]);

const WATER_STOPS = new ColorStops([
  [0, '#1c3552'],
  [300, '#2a4a68'],
  [420, '#4d7fa0'],
  [720, '#5497bc'],
  [960, '#4e8fb5'],
  [1060, '#4a6f92'],
  [1140, '#31506e'],
  [1230, '#1c3552'],
  [1440, '#1c3552'],
]);

// ---- weather overrides ------------------------------------------------------

const RAIN_TOP = new Color('#59636f');
const RAIN_HORIZON = new Color('#8b949d');
const RAIN_SUN = new Color('#9aa4ae');
const RAIN_WATER = new Color('#3a5f7a');
const MOON = new Color('#9fbcff');
const MOON_RAIN = new Color('#7f93b8');
const HEMI_GROUND_DAY = new Color('#6f6152');
const HEMI_GROUND_NIGHT = new Color('#26304a');
const AMBIENT_DAY = new Color('#bfd4e4');
const AMBIENT_NIGHT = new Color('#31405e');

export interface Env {
  sunDir: Vector3;
  moonDir: Vector3;
  lightPos: Vector3;
  elev: number;
  dayFactor: number;
  nightFactor: number;
  skyTop: Color;
  skyHorizon: Color;
  skyBottom: Color;
  sunColor: Color;
  sunGlow: number;
  fogColor: Color;
  fogNear: number;
  fogFar: number;
  lightColor: Color;
  lightIntensity: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiIntensity: number;
  ambientColor: Color;
  ambientIntensity: number;
  starAlpha: number;
  exposure: number;
  waterColor: Color;
  waterRoughness: number;
  waterOpacity: number;
}

/** Derives every environment value from (time, weather) — one pure compute step. */
export class Environment {
  readonly env: Env = {
    sunDir: new Vector3(),
    moonDir: new Vector3(),
    lightPos: new Vector3(),
    elev: 0,
    dayFactor: 1,
    nightFactor: 0,
    skyTop: new Color(),
    skyHorizon: new Color(),
    skyBottom: new Color(),
    sunColor: new Color(),
    sunGlow: 1,
    fogColor: new Color(),
    fogNear: 46,
    fogFar: 165,
    lightColor: new Color(),
    lightIntensity: 3,
    hemiSky: new Color(),
    hemiGround: new Color(),
    hemiIntensity: 0.9,
    ambientColor: new Color(),
    ambientIntensity: 0.12,
    starAlpha: 0,
    exposure: 1,
    waterColor: new Color(),
    waterRoughness: 0.12,
    waterOpacity: 0.86,
  };

  private tmp = new Color();

  compute(minutes: number, rain: number): Env {
    const e = this.env;
    const t = clamp(rain, 0, 1);

    // Sun geometry: rises ~06:00 (east), peaks 12:00, sets ~18:00 (west).
    const theta = (minutes / 1440) * TAU - Math.PI / 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    e.sunDir.set(cosT, sinT, 0.32).normalize();
    e.moonDir.set(-cosT, -sinT, 0.32).normalize();
    e.elev = e.sunDir.y;
    e.dayFactor = smoothstep(-0.05, 0.24, e.elev);
    e.nightFactor = smoothstep(0.06, -0.16, e.elev);

    // Sky — the rain greys are tuned for daytime; scale them down after dusk so
    // a rainy night still reads as night instead of a bright overcast afternoon.
    const rainNight = 1 - 0.66 * e.nightFactor;
    TOP_STOPS.sample(minutes, e.skyTop).lerp(
      this.tmp.copy(RAIN_TOP).multiplyScalar(rainNight),
      t * 0.62,
    );
    HORIZON_STOPS.sample(minutes, e.skyHorizon).lerp(
      this.tmp.copy(RAIN_HORIZON).multiplyScalar(rainNight),
      t * 0.6,
    );
    e.skyBottom.copy(e.skyHorizon).multiplyScalar(0.76).lerp(e.skyTop, 0.18);

    // Sun disc / halo glow
    SUN_STOPS.sample(minutes, e.sunColor).lerp(RAIN_SUN, t * 0.8);
    e.sunGlow =
      lerp(0.2, 1, 1 - smoothstep(-0.02, 0.3, e.elev)) *
      (1 - t * 0.92) *
      (1 - smoothstep(-0.08, -0.3, e.elev));

    // Fog follows the horizon
    e.fogColor.copy(e.skyHorizon).lerp(this.tmp.copy(RAIN_HORIZON).multiplyScalar(rainNight), t * 0.35);
    e.fogNear = lerp(20, 14, t);
    e.fogFar = lerp(130, 72, t);

    // Key light: sun by day, moon by night, blended smoothly through twilight.
    const nightBlend = smoothstep(0.12, -0.12, e.elev);
    e.lightPos.copy(e.sunDir).lerp(e.moonDir, nightBlend);
    if (e.lightPos.y < 0.14) e.lightPos.y = 0.14;
    e.lightPos.normalize();

    const dayI = 3.1 * smoothstep(-0.01, 0.26, e.elev) * (1 - 0.7 * t);
    const nightI = 0.9 * (1 - 0.35 * t);
    e.lightIntensity = lerp(dayI, nightI, nightBlend);
    e.lightColor.copy(e.sunColor).lerp(this.tmp.copy(MOON).lerp(MOON_RAIN, t), nightBlend);

    // Fill light
    e.hemiSky.copy(e.skyHorizon).lerp(e.skyTop, 0.45).lerp(
      this.tmp.copy(RAIN_HORIZON).multiplyScalar(rainNight),
      t * 0.35,
    );
    e.hemiGround
      .copy(HEMI_GROUND_NIGHT)
      .lerp(HEMI_GROUND_DAY, e.dayFactor)
      .lerp(this.tmp.copy(RAIN_HORIZON).multiplyScalar(rainNight), t * 0.3);
    e.hemiIntensity = lerp(0.34, 0.9, e.dayFactor) * (1 + 0.3 * t);

    e.ambientColor.copy(AMBIENT_NIGHT).lerp(AMBIENT_DAY, e.dayFactor);
    e.ambientIntensity = lerp(0.24, 0.1, e.dayFactor) + 0.06 * t;

    e.starAlpha = e.nightFactor * (1 - 0.97 * t) * 0.9;
    e.exposure = lerp(1.22, 1.0, e.dayFactor) - 0.06 * t;

    // Water
    WATER_STOPS.sample(minutes, e.waterColor).lerp(RAIN_WATER, t * 0.65);
    e.waterRoughness = 0.1 + 0.28 * t;
    e.waterOpacity = 0.85 + 0.11 * t;

    return e;
  }
}
