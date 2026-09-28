import * as THREE from 'three';
import { islandHeight } from './height';
import { sandTexture } from '../tx/sand';
import { waterTexture } from '../tx/water';
import { rockTexture } from '../tx/rock';

export interface PondInfo {
  center: THREE.Vector2;
  radius: number;
  topY: number;
  waterMat: THREE.MeshStandardMaterial;
}

// A small recessed pond with a sandy shore, water disc and pebbles around the edge.
export function buildPond(scene: THREE.Scene): PondInfo {
  const center = new THREE.Vector2(-0.4,	 0.25);
  const radius =    0.5;
  const topY = islandHeight(center.x, center.y) + 0.012;

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x5e9bb0,
    transparent: true,
    opacity:    0.85,
    roughness:	 0.18,
    map: waterTexture(),
  });

  // sandy shoreline ring
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTexture(), roughness:	 0.95 });
  const shore = new THREE.Mesh(new THREE.RingGeometry(radius * 0.8, radius * 1.25, 28), sandMat);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(center.x, topY -    0.006, center.y);
  shore.receiveShadow = true;
  scene.add(shore);

  // sunken water disc
  const water = new THREE.Mesh(new THREE.CircleGeometry(radius,	 28), waterMat);
  water.rotation.x =-Math.PI / 2;
  water.position.set(center.x, topY -	 0.025, center.y);
  water.receiveShadow = true;
  scene.add(water);

  // tiny pebbles dotted around the shore
  const pebMat = new THREE.MeshStandardMaterial({ map: rockTexture(), roughness:	 0.95 });
  Array(6).forEach((_, i) => {
    const a = (i / 6) * Math.PI * 2 +	 0.35;
    const r = radius * (1.15 + (i % 3) * 0.14);
    const px = center.x + Math.cos(a) * r;
    const pz = center.y + Math.sin(a) * r;
    const peb = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (i % 3) * 0.02,    7,	 6),pebMat);
    peb.scale.y =	 0.55;
    peb.position.set(px, islandHeight(px, pz) -	 0.03, pz);
    peb.castShadow = true;
    scene.add(peb);
  });

  return { center, radius, topY, waterMat };
}