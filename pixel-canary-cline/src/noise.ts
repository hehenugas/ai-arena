/** Deterministic value noise, so every reload builds the same island. */

const FOLD = Math.PI * 2;

/** Smooth 2D value noise returning values in the -1..1 range. */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const lattice = (ix: number, iy: number) => {
    const s = Math.sin(ix * 12.9898 + iy * 78.233 + 1.37) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const a = lattice(xi, yi);
  const b = lattice(xi + 1, yi);
  const c = lattice(xi, yi + 1);
  const d = lattice(xi + 1, yi + 1);

  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

/** Fractal sum of `noise2`, roughly -1..1. */
export function fbm2(x: number, y: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise2(fx, fy) * amp;
    norm += amp;
    amp *= 0.5;
    fx *= 2.03;
    fy *= 2.03;
  }
  return sum / norm;
}

/** Clamp helper used all over the world builders. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Move `value` towards `target` at `rate` units per second, stopping at the target. */
export function approach(value: number, target: number, rate: number, dt: number): number {
  if (value === target) return target;
  const step = rate * dt;
  if (Math.abs(target - value) <= step) return target;
  return value + Math.sign(target - value) * step;
}

/** Frame-rate independent smoothing. */
export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-smoothing * dt));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Small, fast, repeatable RNG (mulberry32). */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { FOLD };
