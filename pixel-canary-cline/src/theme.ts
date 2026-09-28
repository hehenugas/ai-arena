import * as THREE from 'three';
import { clamp } from './noise';

/** Everything the renderer needs for one moment of the day. */
export interface SkySample {
  zenith: THREE.Color;
  horizon: THREE.Color;
  sunColor: THREE.Color;
  sunlight: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ambient: number;
  fogColor: THREE.Color;
  fogDensity: number;
  /** 0 at noon, 1 at deep night: drives star opacity and window glow. */
  night: number;
  water: THREE.Color;
  exposure: number;
}

interface Key extends SkySample {
  hour: number;
}

const key = (
  hour: number,
  zenith: string,
  horizon: string,
  sunColor: string,
  sunlight: number,
  hemiSky: string,
  hemiGround: string,
  hemiIntensity: number,
  ambient: number,
  fogColor: string,
  fogDensity: number,
  night: number,
  water: string,
  exposure: number,
): Key => ({
  hour,
  zenith: new THREE.Color(zenith),
  horizon: new THREE.Color(horizon),
  sunColor: new THREE.Color(sunColor),
  sunlight,
  hemiSky: new THREE.Color(hemiSky),
  hemiGround: new THREE.Color(hemiGround),
  hemiIntensity,
  ambient,
  fogColor: new THREE.Color(fogColor),
  fogDensity,
  night,
  water: new THREE.Color(water),
  exposure,
});

/** Hand-tuned dial: dawn, noon, golden hour, dusk and night should read differently. */
const KEYS: Key[] = [
  key(0, '#060a16', '#111c33', '#8fa6d0', 0.35, '#233253', '#141a20', 0.3, 0.1, '#141d31', 0.0085, 1, '#0f2237', 1.18),
  key(3, '#050810', '#0d1526', '#8093bd', 0.3, '#1d2a45', '#11151b', 0.26, 0.09, '#101827', 0.0095, 1, '#0c1c2e', 1.2),
  key(5, '#131f3c', '#3b3a5c', '#9c96b8', 0.5, '#39406a', '#1c1d22', 0.4, 0.12, '#252b42', 0.009, 0.55, '#1b2f45', 1.12),
  key(6.6, '#2b4f7d', '#f0a066', '#ffb268', 1.7, '#7f97bd', '#4b3d34', 0.7, 0.14, '#c08a68', 0.0065, 0.05, '#3a5c74', 1.02),
  key(8.5, '#5d9ed4', '#cfe6f2', '#ffe7c2', 2.6, '#a8cfe6', '#6e6650', 0.9, 0.16, '#bcd6e4', 0.0045, 0, '#3f6d84', 0.98),
  key(12, '#77b8e6', '#e2f2fb', '#fff7e6', 3.05, '#bcdcf0', '#77705a', 1, 0.18, '#cfe4f0', 0.0038, 0, '#42768f', 0.96),
  key(16, '#74b2df', '#e9e6d6', '#fff0d2', 2.65, '#b3d3e8', '#7a7059', 0.95, 0.17, '#d5e2e3', 0.0042, 0.03, '#417289', 0.97),
  key(17.8, '#4f81b3', '#f7bd7e', '#ffb96d', 1.85, '#94b0cf', '#6b533f', 0.72, 0.15, '#dfa77c', 0.0058, 0.45, '#3c6279', 1.0),
  key(18.9, '#2b3f6d', '#e07a55', '#ff8b5c', 1.0, '#6a6a92', '#3f3339', 0.5, 0.13, '#8a5a5a', 0.0072, 0.8, '#22415c', 1.08),
  key(19.8, '#141f42', '#5b4668', '#8878a0', 0.55, '#3a4166', '#211f26', 0.38, 0.11, '#2f3450', 0.0085, 0.75, '#17293f', 1.15),
  key(21.5, '#070b18', '#101a2f', '#8ba1cc', 0.33, '#22304f', '#13171d', 0.28, 0.1, '#121a2b', 0.009, 1, '#0e2033', 1.18),
  key(24, '#060a16', '#111c33', '#8fa6d0', 0.35, '#233253', '#141a20', 0.3, 0.1, '#141d31', 0.0085, 1, '#0f2237', 1.18),
];

const RAIN_GREY = new THREE.Color('#8d95a1');
const RAIN_WATER = new THREE.Color('#4a5f6d');

export class SkyPalette {
  readonly sample: SkySample = {
    zenith: new THREE.Color(),
    horizon: new THREE.Color(),
    sunColor: new THREE.Color(),
    sunlight: 0,
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiIntensity: 0,
    ambient: 0,
    fogColor: new THREE.Color(),
    fogDensity: 0,
    night: 0,
    water: new THREE.Color(),
    exposure: 1,
  };

  /** Interpolates the keyframes, then desaturates and dims for rain. */
  at(hour: number, rain: number): SkySample {
    const h = clamp(hour, 0, 24);
    let i = 0;
    while (i < KEYS.length - 2 && h > KEYS[i + 1].hour) i += 1;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = clamp((h - a.hour) / Math.max(1e-6, b.hour - a.hour), 0, 1);
    const s = this.sample;

    s.zenith.copy(a.zenith).lerp(b.zenith, t);
    s.horizon.copy(a.horizon).lerp(b.horizon, t);
    s.sunColor.copy(a.sunColor).lerp(b.sunColor, t);
    s.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
    s.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
    s.fogColor.copy(a.fogColor).lerp(b.fogColor, t);
    s.water.copy(a.water).lerp(b.water, t);
    s.sunlight = a.sunlight + (b.sunlight - a.sunlight) * t;
    s.hemiIntensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * t;
    s.ambient = a.ambient + (b.ambient - a.ambient) * t;
    s.fogDensity = a.fogDensity + (b.fogDensity - a.fogDensity) * t;
    s.night = a.night + (b.night - a.night) * t;
    s.exposure = a.exposure + (b.exposure - a.exposure) * t;

    if (rain > 0) {
      const wash = 0.55 * rain;
      s.zenith.lerp(RAIN_GREY, wash * 0.75);
      s.horizon.lerp(RAIN_GREY, wash);
      s.hemiSky.lerp(RAIN_GREY, wash * 0.6);
      s.fogColor.lerp(RAIN_GREY, wash);
      s.water.lerp(RAIN_WATER, wash * 0.7);
      s.sunlight *= 1 - 0.52 * rain;
      s.hemiIntensity *= 1 - 0.24 * rain;
      s.ambient *= 1 + 0.34 * rain;
      s.fogDensity += 0.0042 * rain;
      s.night = clamp(s.night + 0.22 * rain, 0, 1);
      s.exposure += 0.05 * rain;
    }

    return s;
  }
}
