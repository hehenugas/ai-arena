import * as THREE from 'three';
import { fbm2, lerp, noise3, smoothstep } from '../utils/math';
import { LAYOUT } from './layout';

export const ISLAND_RADIUS = 5;
export const WATER_LEVEL = -0.08;
const POND_BOTTOM = -0.42;
const UNDERSIDE_DEPTH = 3.9;

export function islandRadiusAt(theta: number): number {
  return (
    ISLAND_RADIUS *
    (1 +
      0.07 * Math.sin(3 * theta + 0.6) +
      0.045 * Math.sin(5 * theta + 1.9) +
      0.025 * Math.sin(8 * theta + 0.3))
  );
}

export function pondRadiusAt(theta: number): number {
  return LAYOUT.pond.r * (1 + 0.1 * Math.sin(2 * theta + 0.4) + 0.06 * Math.sin(3 * theta + 2.0));
}

/** Distance from the pond center, normalised so 1 is roughly the shoreline. */
export function pondDistance(x: number, z: number): number {
  const dx = x - LAYOUT.pond.x;
  const dz = z - LAYOUT.pond.z;
  return Math.hypot(dx, dz) / pondRadiusAt(Math.atan2(dz, dx));
}

const FLATS = [
  { x: LAYOUT.house.x, z: LAYOUT.house.z, r: 1.55, h: 0.12 },
  { x: LAYOUT.windmill.x, z: LAYOUT.windmill.z, r: 0.85, h: 0.16 },
  { x: LAYOUT.garden.x, z: LAYOUT.garden.z, r: 1.0, h: 0.13 },
];

function baseHeight(x: number, z: number): number {
  let h = 0.1 + 0.09 * fbm2(x * 0.45, z * 0.45);
  h += 0.5 * Math.exp(-((x - 1.9) ** 2 + (z + 2.9) ** 2) / 3.2);
  h += 0.28 * Math.exp(-((x + 3.1) ** 2 + (z + 1.2) ** 2) / 2.2);
  h += 0.12 * Math.exp(-((x - 2.8) ** 2 + (z - 2.2) ** 2) / 1.5);
  for (const f of FLATS) {
    const w = 1 - smoothstep(f.r * 0.55, f.r, Math.hypot(x - f.x, z - f.z));
    h = lerp(h, f.h, w);
  }
  return h;
}

/** Height of the grassy top surface (ignores the rounded rim fall-off beyond the edge). */
export function terrainHeight(x: number, z: number): number {
  let h = baseHeight(x, z);
  const bowl = 1 - smoothstep(0.5, 1.18, pondDistance(x, z));
  h = lerp(h, POND_BOTTOM, bowl);
  const r = Math.hypot(x, z);
  const f = r / islandRadiusAt(Math.atan2(z, x));
  h -= 0.34 * smoothstep(0.86, 1.0, f) ** 2;
  return h;
}

export function isOnIsland(x: number, z: number, margin = 1): boolean {
  return Math.hypot(x, z) < islandRadiusAt(Math.atan2(z, x)) * margin;
}

const C = (hex: number) => new THREE.Color(hex);
const TOP_COLORS = {
  grassA: C(0x86b25a),
  grassB: C(0x6f9d4a),
  grassLight: C(0xa3c76c),
  rim: C(0x5f8c43),
  sand: C(0xd9c795),
  wetSand: C(0xa89a72),
  pondBed: C(0x557061),
};

function buildTop(): THREE.BufferGeometry {
  const rings = 60;
  const segs = 140;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const col = new THREE.Color();

  const push = (x: number, z: number, f: number) => {
    const y = terrainHeight(x, z);
    positions.push(x, y, z);
    const n = fbm2(x * 0.9 + 3, z * 0.9 - 2);
    col.lerpColors(TOP_COLORS.grassB, TOP_COLORS.grassA, smoothstep(-0.4, 0.4, n));
    col.lerp(TOP_COLORS.grassLight, smoothstep(0.25, 0.7, fbm2(x * 0.35 - 7, z * 0.35 + 4)) * 0.55);
    col.lerp(TOP_COLORS.rim, smoothstep(0.88, 1.0, f) * 0.8);
    const pd = pondDistance(x, z);
    const sand = 1 - smoothstep(0.95, 1.28, pd);
    col.lerp(TOP_COLORS.sand, sand);
    col.lerp(TOP_COLORS.wetSand, 1 - smoothstep(0.78, 0.92, pd));
    col.lerp(TOP_COLORS.pondBed, 1 - smoothstep(0.55, 0.8, pd));
    colors.push(col.r, col.g, col.b);
  };

  push(0, 0, 0);
  for (let i = 1; i <= rings; i++) {
    const f = i / rings;
    for (let j = 0; j < segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const r = islandRadiusAt(th) * f;
      push(Math.cos(th) * r, Math.sin(th) * r, f);
    }
  }
  for (let j = 0; j < segs; j++) {
    const a = 1 + j;
    const b = 1 + ((j + 1) % segs);
    indices.push(0, b, a);
  }
  for (let i = 1; i < rings; i++) {
    const r0 = 1 + (i - 1) * segs;
    const r1 = 1 + i * segs;
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      indices.push(r0 + j, r0 + j1, r1 + j);
      indices.push(r0 + j1, r1 + j1, r1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const STRATA = [0x9a8877, 0x857466, 0xab9a86, 0x75665b, 0x927f6c].map(C);
const DIRT = C(0x6e4f37);
const DIRT_DARK = C(0x5a3f2c);
const DEEP = C(0x5d5452);

function buildUnderside(): THREE.BufferGeometry {
  const rings = 16;
  const segs = 72;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const col = new THREE.Color();
  const tip = new THREE.Vector3(0.35, 0, -0.25);

  for (let k = 0; k <= rings; k++) {
    const s = k / rings;
    for (let j = 0; j < segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const R = islandRadiusAt(th);
      const edgeY = terrainHeight(Math.cos(th) * R * 0.999, Math.sin(th) * R * 0.999);
      let radius: number;
      let y: number;
      if (k === 0) {
        radius = R * 1.002;
        y = edgeY + 0.02;
      } else if (k === 1) {
        radius = R * 1.015;
        y = edgeY - 0.14;
      } else {
        const p = 1 - 0.14 * smoothstep(0, 0.25, s) - 0.86 * Math.pow(s, 1.55);
        radius = R * Math.max(p, 0);
        y = edgeY - 0.14 - s * UNDERSIDE_DEPTH * (1 - 0.25 * Math.cos(th * 2 + 1) * s);
      }
      let x = Math.cos(th) * radius;
      let z = Math.sin(th) * radius;
      if (k >= 2) {
        const amt = Math.sin(s * Math.PI) * 0.55 + 0.12;
        const n = noise3(x * 0.7, y * 1.3, z * 0.7);
        const ledge = Math.sin(y * 5.5 + n * 2) * 0.06;
        const scale = 1 + (n * 0.16 + ledge) * amt;
        x = x * scale + tip.x * s * s;
        z = z * scale + tip.z * s * s;
        y += noise3(x * 1.1 + 5, y, z * 1.1) * 0.12 * amt;
      }
      if (k === rings) {
        x = tip.x;
        z = tip.z;
        y = -UNDERSIDE_DEPTH - 0.5;
      }
      positions.push(x, y, z);

      const depth = -y;
      if (k <= 1 || depth < 0.35) {
        col.lerpColors(DIRT, DIRT_DARK, k === 0 ? 0 : 0.5);
      } else {
        const band = Math.floor(depth * 2.3 + noise3(x * 0.8, 0, z * 0.8) * 0.9);
        col.copy(STRATA[((band % STRATA.length) + STRATA.length) % STRATA.length]);
        col.lerp(DIRT, 1 - smoothstep(0.35, 0.8, depth));
        col.lerp(DEEP, smoothstep(2.0, 4.2, depth) * 0.6);
      }
      colors.push(col.r, col.g, col.b);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      const a = k * segs + j;
      const b = k * segs + j1;
      const c = (k + 1) * segs + j;
      const d = (k + 1) * segs + j1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function buildWater(): THREE.BufferGeometry {
  const segs = 64;
  const positions: number[] = [LAYOUT.pond.x, WATER_LEVEL, LAYOUT.pond.z];
  const indices: number[] = [];
  for (let j = 0; j < segs; j++) {
    const th = (j / segs) * Math.PI * 2;
    const r = pondRadiusAt(th) * 1.02;
    positions.push(LAYOUT.pond.x + Math.cos(th) * r, WATER_LEVEL, LAYOUT.pond.z + Math.sin(th) * r);
    indices.push(0, 1 + ((j + 1) % segs), 1 + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export interface Terrain {
  group: THREE.Group;
  grassMaterial: THREE.MeshStandardMaterial;
  waterMaterial: THREE.MeshStandardMaterial;
}

export function createTerrain(): Terrain {
  const group = new THREE.Group();
  group.name = 'terrain';

  const grassMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const top = new THREE.Mesh(buildTop(), grassMaterial);
  top.receiveShadow = true;
  group.add(top);

  const rockMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    flatShading: true,
  });
  const under = new THREE.Mesh(buildUnderside(), rockMaterial);
  under.receiveShadow = true;
  group.add(under);

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x5f8fa6,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
  });
  const water = new THREE.Mesh(buildWater(), waterMaterial);
  water.receiveShadow = true;
  water.name = 'pond';
  group.add(water);

  return { group, grassMaterial, waterMaterial };
}
