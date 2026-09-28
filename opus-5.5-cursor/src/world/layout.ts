import * as THREE from 'three';

/** Hand-placed composition. All positions are on the XZ plane of the island top. */
export const LAYOUT = {
  house: { x: 0.65, z: -0.5, ry: 0.45 },
  windmill: { x: -2.35, z: -1.95, ry: -0.72 },
  pond: { x: -1.75, z: 1.25, r: 1.15 },
  garden: { x: 2.25, z: -0.3 },
  trees: [
    { x: 2.85, z: -2.05, kind: 'round', size: 1.15 },
    { x: 1.75, z: -2.95, kind: 'pine', size: 1.0 },
    { x: 3.75, z: -0.85, kind: 'pine', size: 0.8 },
    { x: -0.55, z: -3.35, kind: 'poplar', size: 1.0 },
    { x: -3.75, z: -0.25, kind: 'round', size: 0.85 },
    { x: 3.35, z: 1.85, kind: 'round', size: 0.7 },
    { x: -3.55, z: 2.75, kind: 'pine', size: 0.62 },
    { x: 0.55, z: -3.9, kind: 'round', size: 0.72 },
  ] as const,
} as const;

/** Wind always blows from the direction the windmill faces, so its sails catch it. */
export const WIND_DIRECTION = new THREE.Vector3(
  -Math.sin(LAYOUT.windmill.ry),
  0,
  -Math.cos(LAYOUT.windmill.ry),
).normalize();

/** Local house point → world XZ. */
export function houseToWorld(lx: number, lz: number): { x: number; z: number } {
  const { x, z, ry } = LAYOUT.house;
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}
