import * as THREE from 'three';

/** Shared materials — reused across the whole scene. */
export const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x7fb069, roughness: 0.95, flatShading: true }),
  grassDark: new THREE.MeshStandardMaterial({ color: 0x659352, roughness: 0.95, flatShading: true }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x8a6a4e, roughness: 1.0, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8d8578, roughness: 0.9, flatShading: true }),
  rockDark: new THREE.MeshStandardMaterial({ color: 0x6e675c, roughness: 0.95, flatShading: true }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.85 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xc06b4a, roughness: 0.8, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.9 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x6b4f36, roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x77553a, roughness: 0.95, flatShading: true }),
  leafA: new THREE.MeshStandardMaterial({ color: 0x5f9e5a, roughness: 0.9, flatShading: true }),
  leafB: new THREE.MeshStandardMaterial({ color: 0x74b06a, roughness: 0.9, flatShading: true }),
  leafC: new THREE.MeshStandardMaterial({ color: 0x8fbf6f, roughness: 0.9, flatShading: true }),
  water: new THREE.MeshStandardMaterial({
    color: 0x5f8fb4,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88
  }),
  cloud: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.92,
    flatShading: true
  }),
  windowLit: new THREE.MeshStandardMaterial({
    color: 0xffd98a,
    emissive: 0xffb545,
    emissiveIntensity: 0.0
  }),
  pathStone: new THREE.MeshStandardMaterial({ color: 0xb8ad98, roughness: 1, flatShading: true }),
  flowerPink: new THREE.MeshStandardMaterial({ color: 0xe88aa0, roughness: 0.8, flatShading: true }),
  flowerYellow: new THREE.MeshStandardMaterial({ color: 0xf0c95e, roughness: 0.8, flatShading: true }),
  stem: new THREE.MeshStandardMaterial({ color: 0x5e8c4f, roughness: 1 })
};

export function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}
