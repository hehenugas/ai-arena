import * as THREE from 'three';

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential approach toward a target. */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Small, fast, seedable PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shared deterministic RNG for layout, so the world is identical on every load. */
export const rng = mulberry32(20260924);

/** Irregular blob outline used for the island top, the pond and its shoreline. */
export function blobShape(radius: number, points: number, wobble: number, seed: number): THREE.Shape {
  const rand = mulberry32(seed);
  const p0 = rand() * Math.PI * 2;
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const shape = new THREE.Shape();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const n =
      0.6 * Math.sin(a * 3 + p0) + 0.28 * Math.sin(a * 5 + p1) + 0.12 * Math.sin(a * 8 + p2);
    const r = radius * (1 + wobble * n);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export interface RockOptions {
  seed: number;
  radialAmount?: number;
  yJitter?: number;
  /** Optional vertex-color gradient painted by height after displacement. */
  minY?: number;
  maxY?: number;
  topColor?: THREE.Color;
  bottomColor?: THREE.Color;
}

/**
 * Displaces vertices radially with layered angular noise for a hand-sculpted,
 * slightly craggy look, then recomputes normals.
 */
export function sculptRock(geo: THREE.BufferGeometry, o: RockOptions): THREE.BufferGeometry {
  const rand = mulberry32(o.seed);
  const phases = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2];
  const freqs = [2 + Math.floor(rand() * 2), 5 + Math.floor(rand() * 3), 9 + Math.floor(rand() * 4)];
  const radial = o.radialAmount ?? 0.14;
  const yJitter = o.yJitter ?? 0;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.25) continue; // keep axis vertices clean
    const a = Math.atan2(z, x);
    const n =
      0.6 * Math.sin(a * freqs[0] + phases[0]) +
      0.28 * Math.sin(a * freqs[1] + phases[1]) +
      0.12 * Math.sin(a * freqs[2] + phases[2]);
    const k = 1 + radial * n + (rand() - 0.5) * radial * 0.5;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    if (yJitter) pos.setY(i, y + (rand() - 0.5) * yJitter * Math.min(1, r * 0.4));
  }
  pos.needsUpdate = true;

  if (o.topColor && o.bottomColor && o.minY !== undefined && o.maxY !== undefined) {
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const span = o.maxY - o.minY;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = clamp((y - o.minY) / span, 0, 1);
      const band = Math.sin(y * 7 + o.seed) * 0.045;
      c.copy(o.bottomColor).lerp(o.topColor, clamp(t + band, 0, 1));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  geo.computeVertexNormals();
  return geo;
}
