import * as THREE from "three";
import type { Textures } from "./textures";

export type Materials = {
  island: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  wetSand: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  rockChunk: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  woodLight: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  brick: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  lantern: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafDark: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  pine: THREE.MeshStandardMaterial;
  stem: THREE.MeshStandardMaterial;
  reed: THREE.MeshStandardMaterial;
  pad: THREE.MeshStandardMaterial;
  flower: THREE.MeshStandardMaterial;
  tuft: THREE.MeshStandardMaterial;
  sail: THREE.MeshStandardMaterial;
  smoke: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  ripple: THREE.MeshBasicMaterial;
};

function standard(color: string, roughness: number, extras: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    ...extras,
  });
}

export function createMaterials(textures: Textures): Materials {
  return {
    island: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    }),
    sand: standard("#e4d2ae", 1),
    wetSand: standard("#cbb892", 0.92),
    rock: standard("#746556", 0.96),
    rockChunk: new THREE.MeshStandardMaterial({
      color: "#6d5e50",
      roughness: 0.94,
      metalness: 0,
      flatShading: true,
    }),
    plaster: standard("#ffffff", 0.9, { map: textures.plaster }),
    trim: standard("#e7d8c4", 0.82),
    roof: standard("#ffffff", 0.78, { map: textures.shingle }),
    wood: standard("#ffffff", 0.68, { map: textures.wood }),
    woodDark: standard("#5c3b28", 0.72),
    woodLight: standard("#c4a574", 0.64),
    stone: standard("#d5cbb8", 0.96),
    brick: standard("#ffffff", 0.86, { map: textures.brick }),
    glass: new THREE.MeshStandardMaterial({
      color: "#8eb6c8",
      roughness: 0.18,
      metalness: 0.04,
      emissive: "#ffb15a",
      emissiveIntensity: 0,
    }),
    lantern: new THREE.MeshStandardMaterial({
      color: "#f0d7a4",
      roughness: 0.35,
      metalness: 0,
      emissive: "#ffb15a",
      emissiveIntensity: 0,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: "#d7c4a2",
      roughness: 0.32,
      metalness: 0.72,
    }),
    trunk: standard("#6b4632", 0.86),
    leaf: standard("#6f9a4c", 0.88),
    leafDark: standard("#4f7a38", 0.9),
    leafLight: standard("#93b56a", 0.86),
    pine: standard("#3e6844", 0.9),
    stem: standard("#6a8a48", 0.8),
    reed: standard("#7d8f52", 0.8),
    pad: standard("#3f7a45", 0.7),
    flower: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.62,
      metalness: 0,
    }),
    tuft: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 1,
      metalness: 0,
    }),
    sail: standard("#f3ead7", 0.72),
    smoke: new THREE.MeshBasicMaterial({
      color: "#f4f1ea",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    glow: new THREE.MeshBasicMaterial({
      map: textures.glow,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true,
    }),
    ripple: new THREE.MeshBasicMaterial({
      color: "#d5eef5",
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
}
