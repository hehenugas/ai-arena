import { Color, MeshLambertMaterial, MeshStandardMaterial } from 'three';

/**
 * Shared materials. Everything in the diorama reuses these so the palette stays
 * consistent and the renderer has fewer programs to compile.
 *
 * Large matte surfaces (ground, rock, foliage) use Lambert so they read like a
 * soft painted miniature instead of picking up a broad specular sheen, while
 * buildings keep a subtle standard-material response.
 */
export const materials = {
  terrain: new MeshLambertMaterial({ vertexColors: true }),
  islandRock: new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  rock: new MeshLambertMaterial({ color: '#8b8172', flatShading: true }),
  rockLight: new MeshLambertMaterial({ color: '#9c9282', flatShading: true }),
  wood: new MeshStandardMaterial({ color: '#8a5f3d', roughness: 0.78 }),
  woodDark: new MeshStandardMaterial({ color: '#5c4129', roughness: 0.8 }),
  plaster: new MeshStandardMaterial({ color: '#f4e7cd', roughness: 0.92 }),
  roof: new MeshStandardMaterial({ color: '#a75945', roughness: 0.74 }),
  brick: new MeshStandardMaterial({ color: '#9d6a52', roughness: 0.86 }),
  stone: new MeshStandardMaterial({ color: '#aaa496', roughness: 0.9 }),
  brass: new MeshStandardMaterial({ color: '#c39b4a', roughness: 0.35, metalness: 0.8 }),
  leaf: new MeshLambertMaterial({ color: '#5f9440', flatShading: true }),
  leafDark: new MeshLambertMaterial({ color: '#45803a', flatShading: true }),
  leafLight: new MeshLambertMaterial({ color: '#7db051', flatShading: true }),
  trunk: new MeshLambertMaterial({ color: '#7a5334' }),
  cloud: new MeshLambertMaterial({ color: '#f8f5ef' }),
  sail: new MeshLambertMaterial({ color: '#f2e6cc' }),
  metal: new MeshStandardMaterial({ color: '#6d6b64', roughness: 0.42, metalness: 0.7 }),
  /** Lit window panes of the house (driven by the house-lights toggle). */
  housePane: new MeshStandardMaterial({
    color: '#40372a',
    emissive: new Color('#ffb46b'),
    emissiveIntensity: 0,
    roughness: 0.4,
  }),
  /** Windmill windows glow softly on their own at night. */
  millPane: new MeshStandardMaterial({
    color: '#3d3730',
    emissive: new Color('#ffc98a'),
    emissiveIntensity: 0,
    roughness: 0.45,
  }),
  flowerStem: new MeshLambertMaterial({ color: '#5d8b3d' }),
  lilyPad: new MeshLambertMaterial({ color: '#3f7a48' }),
} as const;

export type MaterialKey = keyof typeof materials;
