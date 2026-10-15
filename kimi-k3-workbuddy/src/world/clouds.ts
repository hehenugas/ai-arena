import * as THREE from 'three';
import { MAT } from './materials';

export interface Cloud {
  group: THREE.Group;
  speed: number;
  angle: number;
  radius: number;
  y: number;
}

export function buildClouds(): { clouds: Cloud[]; material: THREE.MeshStandardMaterial } {
  const clouds: Cloud[] = [];
  const defs: { radius: number; y: number; angle: number; s: number }[] = [
    { radius: 7.5, y: 4.6, angle: 0.4, s: 1.0 },
    { radius: 8.5, y: 5.4, angle: 2.4, s: 1.3 },
    { radius: 7.0, y: 5.0, angle: 4.2, s: 0.8 },
    { radius: 9.2, y: 4.2, angle: 5.4, s: 1.1 }
  ];
  const blobGeo = new THREE.SphereGeometry(0.5, 8, 6);
  defs.forEach((d) => {
    const g = new THREE.Group();
    const blobs = 3 + Math.floor(d.s * 2);
    for (let i = 0; i < blobs; i++) {
      const b = new THREE.Mesh(blobGeo, MAT.cloud);
      b.position.set((i - blobs / 2) * 0.45 * d.s, Math.sin(i * 2.1) * 0.12, Math.cos(i * 1.7) * 0.2 * d.s);
      b.scale.setScalar(d.s * (0.7 + Math.sin(i * 3.3) * 0.25 + 0.25));
      b.scale.y *= 0.62;
      g.add(b);
    }
    clouds.push({
      group: g,
      speed: 0.06 + 0.03 * d.s,
      angle: d.angle,
      radius: d.radius,
      y: d.y
    });
  });
  return { clouds, material: MAT.cloud };
}
