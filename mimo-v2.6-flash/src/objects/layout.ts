/**
 * Single source of truth for where everything sits on the island.
 * Kept apart from the builders so placement can be sanity-checked on its own.
 */

/** Base grass height at the (flattened) centre of the island. */
export const BASE_HEIGHT = 0.34;

export const HOUSE = { x: 0.6, z: -0.8, yaw: 0.18 };

export const WINDMILL = { x: 4.3, z: -1.0, yaw: 0.5 };

export const POND = {
  x: -2.7,
  z: 2.0,
  radius: 1.68,
  depth: 0.82,
  waterY: -0.14,
};

/** Gently flattened pads so large objects sit cleanly on the terrain. */
export const FLAT_SPOTS: Array<{
  x: number;
  z: number;
  outer: number;
  inner: number;
  amount: number;
}> = [
  { x: HOUSE.x, z: HOUSE.z, outer: 3.0, inner: 1.9, amount: 0.88 },
  { x: WINDMILL.x, z: WINDMILL.z, outer: 1.9, inner: 1.1, amount: 0.92 },
];

export type TreeKind = 'round' | 'pine' | 'shrub';

export interface TreeSpec {
  x: number;
  z: number;
  scale: number;
  kind: TreeKind;
  seed: number;
}

export const TREES: TreeSpec[] = [
  { x: -3.7, z: -2.6, scale: 1.25, kind: 'round', seed: 11 },
  { x: -1.7, z: -3.6, scale: 1.15, kind: 'pine', seed: 23 },
  { x: 4.5, z: 1.5, scale: 0.95, kind: 'round', seed: 37 },
  { x: -3.6, z: -0.5, scale: 0.8, kind: 'round', seed: 51 },
  { x: 0.6, z: 4.3, scale: 0.7, kind: 'pine', seed: 67 },
];

export const ROCKS: Array<{ x: number; z: number; s: number; seed: number }> = [
  { x: -1.4, z: 4.1, s: 0.36, seed: 3 },
  { x: 3.6, z: 1.9, s: 0.44, seed: 7 },
  { x: -4.33, z: 3.9, s: 0.4, seed: 13 },
  { x: -0.6, z: 2.3, s: 0.3, seed: 19 },
];

/** Small fence arc along the back edge (degrees, counter-clockwise from +X). */
export const FENCE = { startDeg: 250, endDeg: 300, radiusFactor: 0.86, posts: 7 };

/** Stepping-stone path from the front door towards the near cliff edge. */
export const PATH_POINTS: Array<[number, number]> = [
  [1.3, 0.62],
  [2.0, 1.5],
  [2.5, 2.3],
  [2.9, 2.9],
];

export const FLOWER_CLUSTERS: Array<{ x: number; z: number; count: number; spread: number }> = [
  { x: 1.95, z: 0.75, count: 5, spread: 0.55 },
  { x: -0.1, z: 1.7, count: 4, spread: 0.5 },
  { x: 2.25, z: 2.5, count: 4, spread: 0.45 },
  { x: -0.7, z: 3.6, count: 4, spread: 0.5 },
  { x: -1.6, z: -2.5, count: 3, spread: 0.45 },
  { x: 2.7, z: -0.9, count: 4, spread: 0.45 },
  { x: -2.5, z: -1.9, count: 4, spread: 0.55 },
  { x: 0.1, z: -3.0, count: 3, spread: 0.45 },
];

/** Little rocks that float in the air below the island (pure whimsy). */
export const FLOATERS: Array<{ x: number; y: number; z: number; s: number; seed: number }> = [
  { x: -5.4, y: -3.4, z: 3.2, s: 0.42, seed: 71 },
  { x: 4.6, y: -4.6, z: -3.4, s: 0.3, seed: 83 },
  { x: 1.2, y: -6.4, z: 4.6, s: 0.24, seed: 97 },
];

export const CLOUDS: Array<{ x: number; y: number; z: number; s: number; seed: number }> = [
  { x: -11, y: 8.4, z: -9, s: 1.6, seed: 101 },
  { x: 6, y: 9.3, z: -14, s: 2.0, seed: 113 },
  { x: -7, y: 7.7, z: 6, s: 1.3, seed: 127 },
  { x: 13, y: 8.9, z: 3, s: 1.7, seed: 139 },
  { x: -15, y: 9.7, z: -3, s: 1.9, seed: 151 },
];
