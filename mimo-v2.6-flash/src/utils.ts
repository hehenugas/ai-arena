import { Color } from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Frame-rate independent exponential smoothing (interruptible by design). */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

export function mod(v: number, m: number): number {
  return ((v % m) + m) % m;
}

/** Wrap-aware damping for values living on a ring (e.g. minutes in a day). */
export function dampRing(
  current: number,
  target: number,
  rate: number,
  dt: number,
  period: number,
): number {
  const delta = mod(target - current + period / 2, period) - period / 2;
  return mod(current + delta * (1 - Math.exp(-rate * dt)), period);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Deterministic PRNG so procedural variation is stable between reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatTime(minutes: number): string {
  const m = Math.round(mod(minutes, 1440)) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Piecewise linear colour ramp across a 24h day (0..1440 minutes). */
export class ColorStops {
  private times: number[] = [];
  private colors: Color[] = [];

  constructor(stops: Array<[number, string]>) {
    const sorted = [...stops].sort((a, b) => a[0] - b[0]);
    for (const [t, hex] of sorted) {
      this.times.push(t);
      this.colors.push(new Color(hex));
    }
  }

  sample(minutes: number, out: Color): Color {
    const t = mod(minutes, 1440);
    const times = this.times;
    const colors = this.colors;
    if (t <= times[0]) return out.copy(colors[0]);
    for (let i = 0; i < times.length - 1; i++) {
      if (t <= times[i + 1]) {
        const k = (t - times[i]) / (times[i + 1] - times[i]);
        return out.copy(colors[i]).lerp(colors[i + 1], k);
      }
    }
    return out.copy(colors[colors.length - 1]);
  }
}
