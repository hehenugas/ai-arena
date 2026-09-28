import { fbm, lerp, smoothstep } from '../core/utils';

export const ISLAND_RADIUS = 4.6;
export const ISLAND_DEPTH = 4.2;

export const POND = {
  x: 1.95,
  z: -0.55,
  /** Water plane height — the terrain is carved so the shore crosses this. */
  level: 0.17,
  /** Nominal pool radius, before the shoreline noise. */
  radius: 1.25,
  shelf: 2.15,
  shelfHeight: 0.32,
  bowl: 0.54,
};

/** Irregular outline: a few harmonics so the silhouette never reads as a disc. */
export function rimRadius(theta: number): number {
  return (
    ISLAND_RADIUS *
    (1 +
      0.085 * Math.sin(3 * theta + 0.8) +
      0.05 * Math.sin(5 * theta + 2.4) +
      0.032 * Math.sin(7 * theta + 5.1) +
      0.018 * Math.sin(11 * theta + 1.2))
  );
}

/** Angle-dependent wobble that keeps the pond shore from being a perfect circle. */
function shoreWobble(a: number): number {
  return 1 + 0.14 * Math.sin(3 * a + 0.9) + 0.08 * Math.sin(5 * a + 2.7) + 0.05 * Math.sin(8 * a);
}

/** Ground height at any point of the grass cap. */
export function terrainHeight(x: number, z: number): number {
  const theta = Math.atan2(z, x);
  const r = Math.hypot(x, z) / rimRadius(theta);
  const inside = 1 - smoothstep(0.86, 1.0, r);

  let h = 0.66 * (1 - r * r) * inside;
  h += (fbm(x * 0.45 + 11.3, z * 0.45 + 7.1, 4) - 0.5) * 0.42 * inside;
  h += (fbm(x * 1.6 + 3.7, z * 1.6 + 9.4, 2) - 0.5) * 0.1 * inside;

  const dx = x - POND.x;
  const dz = z - POND.z;
  const d = Math.hypot(dx, dz) * shoreWobble(Math.atan2(dz, dx));

  const shelf = 1 - smoothstep(POND.radius * 0.5, POND.shelf, d);
  h = lerp(h, POND.shelfHeight, shelf * 0.9);
  h -= POND.bowl * (1 - smoothstep(0, POND.radius, d));
  h += (fbm(x * 2.2 + 21, z * 2.2 + 5, 2) - 0.5) * 0.045 * inside;

  return h;
}

/** How far outside the grass cap a point sits, 0 on the cap and 1 well beyond. */
export function edgeFactor(x: number, z: number): number {
  const theta = Math.atan2(z, x);
  return Math.hypot(x, z) / rimRadius(theta);
}

/** True when a footprint fits on grass without hanging over the rim. */
export function fitsOnIsland(x: number, z: number, margin = 0.5): boolean {
  if (edgeFactor(x, z) > 1 - margin / ISLAND_RADIUS) return false;
  const d = Math.hypot(x - POND.x, z - POND.z);
  return d > POND.radius * 0.92 + margin * 0.35;
}
