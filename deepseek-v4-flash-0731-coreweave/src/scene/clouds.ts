import * as THREE from 'three';
import { rand3 } from '../noise';

export interface CloudHandle {
  group: THREE.Group;
  speed: number;
  phase: number;
  baseY: number;
}

const cloudWhite = new THREE.Color(0xffffff);
const cloudGray = new THREE.Color(0x9aa2a8);
const mat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  roughness: 1.0,
  metalness: 0.0,
});

// Soft puffy clouds drifting high above the island
export function buildClouds(scene: THREE.Scene): CloudHandle[] {
  const out: CloudHandle[] = [];
  Array(5).forEach((_, i) => {
    const group = new THREE.Group();
    const baseY = 6.0 + (i % 5) * 0.7 + rand3(2.0, i, 1.0);
    const x = (i - 2) * 2.4 + rand3(3.0, i, 2.0) * 1.5;
    const z = (i - 2) * 1.6 + rand3(4.0, i, 3.0);
    group.userData = { x, z };
    group.position.set(x, baseY, z);
    const puffs  = 5 + (i % 2);
    Array(puffs).forEach((j) => {
      const pr  = 0.55 +	rand3(5.0,	i,	j) *	0.25;
      const p  = new THREE.Mesh(new THREE.SphereGeometry(pr,	10,	8), mat);
      p.position.set(
        (rand3(6.0,	i,	j) -	0.5) *	1.4,
        (rand3(7.0,	i,j) -	0.5) *	0.7,
        (rand3(8.0,	i,j) -	0.5) *	1.2,
      );
      p.scale.set(1.0,	0.72,	1.05);
      group.add(p);
    });
    const speed  = 0.25 +	rand3(9.0,	i,	1.0) *	0.35;
    const phase  = i *	1.3;
    out.push({ group, speed, phase, baseY });
    scene.add(group);
  });
	 return out;
}

// Drift clouds with the wind, wrap at ±22, bob gently, dim under rain
export function updateClouds(clouds: CloudHandle[], dt: number, time: number, wind: number, rain: number, reduced: boolean): void {
  const wrap = 22;
  const ud = clouds.map((c) => c.group.userData as { x: number; z: number });
  clouds.forEach((c, i) => {
    const u = ud[i];
    c.group.position.x = u.x + wind * c.speed * dt * 2.4;
    if (c.group.position.x > wrap) c.group.position.x -= wrap * 2;
    else if (c.group.position.x < -wrap) c.group.position.x += wrap * 2;
    const bob = reduced ? 0 : Math.sin(time * 0.3 + c.phase) * 0.15;
    c.group.position.y = c.baseY - rain * 1.2 + bob;
    c.group.position.z = u.z;
  });
  const f = Math.min(1, rain * dt * 3.0);
  if (rain > 0.01) mat.color.lerp(cloudGray, f);
  else mat.color.lerp(cloudWhite, f);
  mat.opacity = 0.9 - rain * 0.35;
}

export function cloudMaterial(): THREE.MeshStandardMaterial {
  return mat;
}