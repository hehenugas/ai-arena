import * as THREE from 'three';
import { TINTS } from './palette';

/**
 * Procedural value noise on a 2D grid — smooth, seedable, allocation-free
 * after warm-up. Used for terrain silhouettes and wind sway phases.
 */
export function makeNoise2D(seed = 1337): (x: number, y: number) => number {
  const perm = new Uint8Array(512);
  let s = seed >>> 0;
  const rand = () => {
    // mulberry32 PRNG
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];

  const fade = (t: number): number => t * t * (3 - 2 * t);

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[xi] + yi] / 255;
    const ab = perm[perm[xi] + yi + 1] / 255;
    const ba = perm[perm[xi + 1] + yi] / 255;
    const bb = perm[perm[xi + 1] + yi + 1] / 255;
    const x1 = lerpN(aa, ba, u);
    const x2 = lerpN(ab, bb, u);
    return lerpN(x1, x2, v); // 0..1
  };
}

function lerpN(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shared deterministic randomness for reproducible composition. */
export function makeRng(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dispose helper for groups of meshes. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else m?.dispose();
    }
  });
}

export const tintHex = (key: keyof typeof TINTS): number => TINTS[key][0];
