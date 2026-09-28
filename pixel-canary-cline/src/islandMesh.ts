import * as THREE from 'three';
import { groundAt, POND, silhouette, WATER_LEVEL } from './island';
import { clamp, makeRandom, noise2, smoothstep } from './noise';

const SEG = 116;

const GRASS_TONES = ['#9dbf6d', '#8fb863', '#84ae5f', '#7aa459', '#a8c478'].map((h) => new THREE.Color(h));
const ROCK_TONES = ['#a2907b', '#8f7d6b', '#7a695c', '#61524a', '#4a3f39', '#3a312d'].map((h) => new THREE.Color(h));
const DIRT = new THREE.Color('#9c7b56');
const SHORE = new THREE.Color('#b3a079');

const rImp = makeRandom(4711);
const R_IMP = Array.from({ length: 12 }, () => 0.55 + rImp() * 0.9);
const A_IMP = Array.from({ length: 12 }, () => rImp() * Math.PI * 2);
const D_IMP = Array.from({ length: 12 }, () => 0.35 + rImp() * 0.75);

function taper(t: number): number {
  return Math.pow(Math.sin(Math.PI * clamp(t, 0, 1)), 0.62);
}

/** Radius of the rocky body at normalised depth t (0 = soil band, 1 = tip). */
function bodyRadius(theta: number, t: number): number {
  const base = silhouette(theta) * (t < 0.1 ? 0.99 + 0.02 * t : 0.995);
  let r = base * taper(t);
  for (let i = 0; i < 12; i += 1) {
    const a = A_IMP[i];
    let d = Math.abs(theta - a);
    if (d > Math.PI) d = Math.PI * 2 - d;
    r -= R_IMP[i] * Math.exp(-(d * d) / (2 * D_IMP[i] * D_IMP[i])) * Math.pow(t, 0.85);
  }
  r *= 1 + 0.035 * noise2(Math.cos(theta) * 2.6 + 7.7, Math.sin(theta) * 2.6 + t * 7.3);
  return Math.max(0.045, r);
}

/** Push a (inner, outer, outer) quad pair into the index list with up/out-facing winding. */
function quadPair(idx: number[], a: number, b: number, c: number, d: number): void {
  idx.push(a, b, c, b, d, c);
}

function buildCap(): THREE.BufferGeometry {
  const rings = 22;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();

  for (let i = 0; i <= rings; i += 1) {
    const u = i / rings;
    for (let s = 0; s < SEG; s += 1) {
      const theta = (s / SEG) * Math.PI * 2;
      const x = Math.cos(theta) * u * silhouette(theta);
      const z = Math.sin(theta) * u * silhouette(theta);
      pos.push(x, groundAt(x, z), z);

      const shade = 0.9 + 0.1 * noise2(x * 1.7 - 2.3, z * 1.7 + 4.9);
      c.copy(GRASS_TONES[(s + i) % GRASS_TONES.length]).multiplyScalar(shade);
      c.lerp(DIRT, smoothstep(0.74, 1, u) * 0.45);
      const dPond = Math.hypot(x - POND.x, z - POND.z) / (POND.r * 1.35);
      if (dPond < 1) c.lerp(SHORE, (1 - dPond) * 0.55);
      col.push(c.r, c.g, c.b);
    }
  }

  const at = (i: number, s: number) => i * SEG + s;
  for (let i = 0; i < rings; i += 1) {
    for (let s = 0; s < SEG; s += 1) {
      const s2 = (s + 1) % SEG;
      quadPair(idx, at(i, s), at(i, s2), at(i + 1, s), at(i + 1, s2));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
