import * as THREE from 'three';

const std = (color: number, params: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...params });

/** Shared materials: one instance per surface type, reused across every object. */
export const MAT = {
  wall: std(0xf0e4c8, { roughness: 0.95 }),
  plaster: std(0xe6d6b4, { roughness: 0.95 }),
  wood: std(0x9a6a44),
  woodDark: std(0x6b4631),
  woodLight: std(0xc79a68),
  roof: std(0xb4644a, { roughness: 0.8 }),
  roofDark: std(0x9a5340, { roughness: 0.8 }),
  brick: std(0x9b5b47),
  stone: std(0xa39a8e, { roughness: 0.95, flatShading: true }),
  stoneDark: std(0x7f776f, { roughness: 0.95, flatShading: true }),
  metal: std(0x3d3a38, { roughness: 0.5, metalness: 0.6 }),
  brass: std(0xc9a25a, { roughness: 0.35, metalness: 0.8 }),
  glass: std(0x2d3b4a, {
    roughness: 0.25,
    metalness: 0.1,
    emissive: new THREE.Color(0xffb04a),
    emissiveIntensity: 0,
  }),
  lantern: std(0xfff0d0, {
    roughness: 0.4,
    emissive: new THREE.Color(0xffb85a),
    emissiveIntensity: 0,
  }),
  sail: std(0xf4ecd8, { roughness: 1, side: THREE.DoubleSide }),
  trunk: std(0x7a563b, { roughness: 1, flatShading: true }),
  birch: std(0xe9e1d2, { roughness: 1, flatShading: true }),
  leaves: [0x6a9e4c, 0x5a8e44, 0x7cac56, 0x4f8040].map((c) =>
    std(c, { roughness: 0.9, flatShading: true }),
  ),
  pine: std(0x3f7248, { roughness: 0.9, flatShading: true }),
  pineLight: std(0x4f8452, { roughness: 0.9, flatShading: true }),
  soil: std(0x6b4a33, { roughness: 1, flatShading: true }),
  sprout: std(0x8cc063, { roughness: 0.9, flatShading: true }),
  pumpkin: std(0xe08a3c, { roughness: 0.7, flatShading: true }),
  grassTuft: std(0x8dba5e, { roughness: 1, flatShading: true }),
  cloud: std(0xffffff, { roughness: 1, flatShading: true, emissive: new THREE.Color(0xfff8f0) }),
};
