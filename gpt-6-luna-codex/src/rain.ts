import * as THREE from 'three';
import { isOverIsland } from './island';

interface Drop {
  x: number;
  y: number;
  z: number;
  speed: number;
  seed: number;
}

export function createRain(scene: THREE.Scene, count = 118): { update: (delta: number, wind: number, amount: number, time: number) => void } {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 6);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: '#e6f0ed', transparent: true, opacity: 0, depthWrite: false, linewidth: 1 });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  scene.add(rain);

  let seed = 419;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const drops: Drop[] = Array.from({ length: count }, (_, i) => ({
    x: (random() - 0.5) * 5.6,
    y: 0.3 + random() * 3.7,
    z: (random() - 0.5) * 5.2,
    speed: 3.2 + random() * 1.5,
    seed: i * 0.17,
  }));

  return {
    update(delta, wind, amount, time) {
      material.opacity = amount * 0.65;
      if (amount < 0.01) return;
      for (let i = 0; i < drops.length; i += 1) {
        const drop = drops[i];
        drop.y -= drop.speed * delta;
        drop.x += wind * 0.68 * delta;
        drop.z += wind * 0.12 * delta;
        if (isOverIsland(drop.x, drop.z) && drop.y <= 0.13) {
          drop.y = 1.8 + random() * 2.3;
          drop.x = (random() - 0.5) * 5.5;
          drop.z = (random() - 0.5) * 5.1;
        } else if (drop.y < -2.5 || Math.abs(drop.x) > 3.4 || Math.abs(drop.z) > 3.3) {
          drop.y = 2.1 + random() * 2;
          drop.x = (random() - 0.5) * 5.5;
          drop.z = (random() - 0.5) * 5.1;
        }
        const start = i * 6;
        positions[start] = drop.x;
        positions[start + 1] = drop.y;
        positions[start + 2] = drop.z;
        positions[start + 3] = drop.x - wind * 0.055;
        positions[start + 4] = drop.y - 0.24;
        positions[start + 5] = drop.z - wind * 0.01;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeBoundingSphere();
      rain.position.y = 0.04 + Math.sin(time * 3) * 0.002;
    },
  };
}
