import { BufferAttribute, BufferGeometry, Color } from 'three';
import { clamp01, fbm2, lerp, smoothstep } from './utils';

/** Where the landmarks live on the island (XZ plane, island centre is 0,0). */
export const LAYOUT = {
  pond: { x: 2.45, z: 1.7 },
  house: { x: -1.7, z: 0.3 },
  windmill: { x: 0.5, z: -3.1 },
  doorStep: { x: -1.72, z: 1.1 },
};

export const ISLAND = {
  baseRadius: 6.1,
  rimFalloff: 0.3,
  pondDepth: 1,
  pondSigma: 1.35,
  hillHeight: 1,
  hillSigma: 1.5,
  plateauHeight: 0.3,
  plateauSigma: 1.4,
  rockTipY: -4.7,
};

const ANG_SEG = 104;
const RAD_SEG = 20;
const ROCK_ANG_SEG = 72;
const ROCK_LEVELS = 9;
const WATER_TABLE_SIZE = 128;

/** The dirt trail that winds from the house door towards the rim and the mill. */
export const PATH_LINES: { x: number; z: number }[][] = [
  [
    { x: -1.72, z: 1.1 },
    { x: -0.95, z: 2.05 },
    { x: 0.35, z: 2.8 },
    { x: 1.9, z: 3.4 },
    { x: 3.05, z: 4.15 },
  ],
  [
    { x: -1.72, z: 1.1 },
    { x: -1.45, z: -0.05 },
    { x: -0.9, z: -1.5 },
    { x: 0.0, z: -2.5 },
    { x: 0.42, z: -2.95 },
  ],
];

const gauss = (dx: number, dz: number, sigma: number): number =>
  Math.exp(-(dx * dx + dz * dz) / (sigma * sigma));

/** Irregular island silhouette, driven by a few harmonics. */
export function islandRadius(theta: number): number {
  return (
    ISLAND.baseRadius *
    (1 +
      0.085 * Math.sin(3 * theta + 1.1) +
      0.05 * Math.sin(5 * theta + 2.4) +
      0.03 * Math.sin(7 * theta + 0.7) +
      0.018 * Math.sin(11 * theta + 4.2))
  );
}

/** Height of the grassy ground at a given point (before any object is placed). */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const rim = islandRadius(theta);
  const t = clamp01(r / rim);

  let h = 0.66 * Math.pow(1 - t * t, 1.3) - 0.14;
  h += ISLAND.hillHeight * gauss(x - LAYOUT.windmill.x, z - LAYOUT.windmill.z, ISLAND.hillSigma);
  h +=
    ISLAND.plateauHeight *
    gauss(x - LAYOUT.house.x, z - LAYOUT.house.z, ISLAND.plateauSigma);
  h -= ISLAND.pondDepth * gauss(x - LAYOUT.pond.x, z - LAYOUT.pond.z, ISLAND.pondSigma);
  h -= ISLAND.rimFalloff * smoothstep(0.86, 1, t);
  return h;
}

function segmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 0 ? clamp01((wx * vx + wz * vz) / lenSq) : 0;
  const dx = wx - vx * t;
  const dz = wz - vz * t;
  return Math.hypot(dx, dz);
}

export function distanceToPath(x: number, z: number): number {
  let best = Infinity;
  for (const line of PATH_LINES) {
    for (let i = 0; i < line.length - 1; i++) {
      const d = segmentDistance(x, z, line[i].x, line[i].z, line[i + 1].x, line[i + 1].z);
      if (d < best) best = d;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Island queries used by the rest of the scene                       */
/* ------------------------------------------------------------------ */

export interface IslandInfo {
  waterLevel: number;
  pond: { x: number; z: number };
  /** Water edge distance from the pond centre for a direction around the pond. */
  waterRadiusAt(angle: number): number;
  isOverPond(x: number, z: number): boolean;
  /** Random point inside the pond (uniform-ish). */
  pondPoint(rand: () => number): { x: number; z: number };
  /** Height a falling raindrop collides with (or a low value outside the island). */
  surfaceY(x: number, z: number): number;
  heightAt(x: number, z: number): number;
  /** Pulls a point inside the island silhouette, keeping a margin from the rim. */
  clampToIsland(x: number, z: number, margin: number): { x: number; z: number };
}

export function createIslandInfo(): IslandInfo {
  const pond = LAYOUT.pond;
  const waterLevel = terrainHeight(pond.x, pond.z) + 0.34;

  const table = new Float32Array(WATER_TABLE_SIZE);
  for (let i = 0; i < WATER_TABLE_SIZE; i++) {
    const angle = (i / WATER_TABLE_SIZE) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let r = 0.12;
    while (r < 2.9) {
      if (terrainHeight(pond.x + dx * r, pond.z + dz * r) > waterLevel) break;
      r += 0.02;
    }
    table[i] = r + 0.02;
  }

  const waterRadiusAt = (angle: number): number => {
    const wrapped = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const pos = (wrapped / (Math.PI * 2)) * WATER_TABLE_SIZE;
    const i0 = Math.floor(pos) % WATER_TABLE_SIZE;
    const i1 = (i0 + 1) % WATER_TABLE_SIZE;
    return lerp(table[i0], table[i1], pos - Math.floor(pos));
  };

  const isOverPond = (x: number, z: number): boolean => {
    const dx = x - pond.x;
    const dz = z - pond.z;
    return Math.hypot(dx, dz) < waterRadiusAt(Math.atan2(dz, dx));
  };

  const surfaceY = (x: number, z: number): number => {
    if (isOverPond(x, z)) return waterLevel;
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    if (r < islandRadius(theta) - 0.04) return terrainHeight(x, z) + 0.03;
    // Off the island the drop just keeps falling past the floating rock.
    return -13;
  };

  const clampToIsland = (x: number, z: number, margin: number) => {
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    const limit = Math.max(0.5, islandRadius(theta) - margin);
    if (r <= limit) return { x, z };
    const scale = limit / r;
    return { x: x * scale, z: z * scale };
  };

  return {
    waterLevel,
    pond,
    waterRadiusAt,
    isOverPond,
    pondPoint(rand: () => number) {
      // Rejection sampling keeps ripples clear of the shoreline.
      for (let i = 0; i < 24; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * waterRadiusAt(a) * 0.86;
        const x = pond.x + Math.cos(a) * r;
        const z = pond.z + Math.sin(a) * r;
        if (isOverPond(x, z)) return { x, z };
      }
      return { x: pond.x, z: pond.z };
    },
    surfaceY,
    heightAt: terrainHeight,
    clampToIsland,
  };
}

/* ------------------------------------------------------------------ */
/* Terrain colours                                                    */
/* ------------------------------------------------------------------ */

const GRASS_A = new Color('#5f8f42');
const GRASS_B = new Color('#8ab55c');
const GRASS_DARK = new Color('#48713a');
const DIRT = new Color('#8a6b48');
const SAND = new Color('#cdb98d');
const WET_SAND = new Color('#9c8a62');
const RIM_DIRT = new Color('#6e5b45');

const scratchColor = new Color();

export function terrainColorAt(
  info: IslandInfo,
  x: number,
  z: number,
  out: Color,
): Color {
  const coarse = fbm2(x * 0.42 + 21, z * 0.42 - 8, 4);
  const fine = fbm2(x * 1.6 - 4, z * 1.6 + 12, 2);

  out.copy(GRASS_A).lerp(GRASS_B, coarse);
  out.lerp(GRASS_DARK, smoothstep(0.52, 0.92, fine) * 0.5);

  const pathMask = smoothstep(0.52, 0.14, distanceToPath(x, z) + (fine - 0.5) * 0.26);
  out.lerp(DIRT, pathMask * 0.9);

  const dx = x - info.pond.x;
  const dz = z - info.pond.z;
  const dPond = Math.hypot(dx, dz);
  const waterEdge = info.waterRadiusAt(Math.atan2(dz, dx));
  out.lerp(SAND, smoothstep(waterEdge + 0.62, waterEdge - 0.02, dPond) * 0.85);
  out.lerp(WET_SAND, smoothstep(waterEdge + 0.05, waterEdge - 0.45, dPond) * 0.9);

  const r = Math.hypot(x, z);
  const rimMask = smoothstep(0.88, 1, r / islandRadius(Math.atan2(z, x)));
  out.lerp(RIM_DIRT, rimMask * 0.85);

  // Gentle mottling so large areas never look flat.
  out.offsetHSL(0, 0, (fine - 0.5) * 0.05);
  return out;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                           */
/* ------------------------------------------------------------------ */

export function buildTerrainGeometry(info: IslandInfo): BufferGeometry {
  const vertexCount = 1 + ANG_SEG * RAD_SEG;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  const centerY = terrainHeight(0, 0);
  positions[0] = 0;
  positions[1] = centerY;
  positions[2] = 0;
  terrainColorAt(info, 0, 0, scratchColor);
  colors[0] = scratchColor.r;
  colors[1] = scratchColor.g;
  colors[2] = scratchColor.b;

  for (let j = 1; j <= RAD_SEG; j++) {
    const t = j / RAD_SEG;
    const radiusFactor = Math.pow(t, 0.94);
    for (let i = 0; i < ANG_SEG; i++) {
      const theta = (i / ANG_SEG) * Math.PI * 2;
      const r = radiusFactor * islandRadius(theta);
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = terrainHeight(x, z);
      const index = 1 + (j - 1) * ANG_SEG + i;
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      terrainColorAt(info, x, z, scratchColor);
      colors[index * 3] = scratchColor.r;
      colors[index * 3 + 1] = scratchColor.g;
      colors[index * 3 + 2] = scratchColor.b;
    }
  }

  const ringIndex = (ring: number, i: number): number => 1 + (ring - 1) * ANG_SEG + i;

  for (let i = 0; i < ANG_SEG; i++) {
    const cur = ringIndex(1, i);
    const next = ringIndex(1, (i + 1) % ANG_SEG);
    indices.push(0, next, cur);
  }

  for (let j = 1; j < RAD_SEG; j++) {
    for (let i = 0; i < ANG_SEG; i++) {
      const iNext = (i + 1) % ANG_SEG;
      const a = ringIndex(j, i);
      const b = ringIndex(j, iNext);
      const c = ringIndex(j + 1, iNext);
      const d = ringIndex(j + 1, i);
      indices.push(a, c, d, a, b, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

const ROCK_DARK = new Color('#5f564c');
const ROCK_MID = new Color('#7e7466');
const ROCK_LIGHT = new Color('#9c9285');

export function buildRockGeometry(info: IslandInfo): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new Color();

  const rimY: number[] = [];
  for (let i = 0; i < ROCK_ANG_SEG; i++) {
    const theta = (i / ROCK_ANG_SEG) * Math.PI * 2;
    const r = islandRadius(theta);
    rimY.push(terrainHeight(Math.cos(theta) * r, Math.sin(theta) * r) - 0.015);
  }
  const rimAverage = rimY.reduce((sum, v) => sum + v, 0) / rimY.length;

  const pushRockColor = (value: number, dirt: number): void => {
    color.copy(ROCK_DARK).lerp(ROCK_MID, smoothstep(0.15, 0.6, value));
    color.lerp(ROCK_LIGHT, smoothstep(0.6, 0.95, value));
    color.lerp(RIM_DIRT, dirt);
    colors.push(color.r, color.g, color.b);
  };

  const levelCount = ROCK_LEVELS;
  for (let level = 0; level < levelCount; level++) {
    const t = level / levelCount;
    const shrink = Math.pow(1 - t, 0.66);
    const yBase = lerp(rimAverage, ISLAND.rockTipY, Math.pow(t, 0.85));
    const driftX = Math.sin(t * 2.4 + 0.4) * 0.95 * Math.sin(Math.PI * t);
    const driftZ = Math.cos(t * 1.9 + 1.2) * 0.8 * Math.sin(Math.PI * t);

    // The top ring has to match the grassy rim exactly, so the wobble only
    // eases in as the rock descends and can never open a seam.
    const wobbleAmount = smoothstep(0, 0.3, t);
    for (let i = 0; i < ROCK_ANG_SEG; i++) {
      const theta = (i / ROCK_ANG_SEG) * Math.PI * 2;
      const wobble = fbm2(
        Math.cos(theta) * 2.1 + 5 + t * 1.5,
        Math.sin(theta) * 2.1 + t * 4.2,
        2,
      );
      const radius =
        islandRadius(theta) * shrink * (1 + (wobble - 0.5) * 0.34 * wobbleAmount) +
        0.05 * (1 - t) * wobbleAmount;
      const vertical = level === 0 ? 0 : (wobble - 0.5) * 0.22 * (1 - t);
      positions.push(
        Math.cos(theta) * radius + driftX,
        (level === 0 ? rimY[i] : yBase) + vertical,
        Math.sin(theta) * radius + driftZ,
      );
      pushRockColor(wobble, level === 0 ? 0.75 : smoothstep(0.12, 0, t) * 0.55);
    }
  }

  for (let level = 0; level < levelCount - 1; level++) {
    for (let i = 0; i < ROCK_ANG_SEG; i++) {
      const iNext = (i + 1) % ROCK_ANG_SEG;
      const a = level * ROCK_ANG_SEG + i;
      const b = level * ROCK_ANG_SEG + iNext;
      const c = (level + 1) * ROCK_ANG_SEG + iNext;
      const d = (level + 1) * ROCK_ANG_SEG + i;
      indices.push(a, c, d, a, b, c);
    }
  }

  const tipIndex = positions.length / 3;
  const tipY = ISLAND.rockTipY - 0.35;
  positions.push(
    Math.sin(2.4 + 0.4) * 0.35,
    tipY,
    Math.cos(1.9 + 1.2) * 0.3,
  );
  pushRockColor(0.2, 0);
  const lastLevel = levelCount - 1;
  for (let i = 0; i < ROCK_ANG_SEG; i++) {
    const iNext = (i + 1) % ROCK_ANG_SEG;
    indices.push(lastLevel * ROCK_ANG_SEG + i, tipIndex, lastLevel * ROCK_ANG_SEG + iNext);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Water surface: a fan that follows the real shoreline for every direction. */
export function buildWaterGeometry(info: IslandInfo): BufferGeometry {
  const segments = 96;
  const positions = new Float32Array((segments + 1) * 3);
  const shore = new Float32Array(segments + 1);
  const indices: number[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = info.waterRadiusAt(angle);
    const index = 1 + i;
    positions[index * 3] = Math.cos(angle) * r;
    positions[index * 3 + 1] = 0;
    positions[index * 3 + 2] = Math.sin(angle) * r;
    shore[index] = 1;
  }
  shore[0] = 0;

  for (let i = 0; i < segments; i++) {
    const cur = 1 + i;
    const next = 1 + ((i + 1) % segments);
    indices.push(0, next, cur);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aShore', new BufferAttribute(shore, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

