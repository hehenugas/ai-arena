import * as THREE from 'three';
import { POND_POS, POND_RADIUS, groundHeightAt } from './island';

export interface Pond {
  group: THREE.Group;
  surfaceY: number;
  update: (weather: number, wind: number) => void;
}

export function createPond(): Pond {
  const group = new THREE.Group();
  const cx = POND_POS.x;
  const cz = POND_POS.y;
  const surfaceY = groundHeightAt(cx, cz) + 0.055;

  // Damp darker meadow under the water so the pond reads as set into the grass.
  const damp = new THREE.Mesh(
    new THREE.CircleGeometry(POND_RADIUS + 0.55, 32),
    new THREE.MeshStandardMaterial({ color: '#6f8a52', roughness: 1 })
  );
  damp.rotation.x = -Math.PI / 2;
  damp.position.set(cx, surfaceY - 0.05, cz);
  damp.receiveShadow = true;
  group.add(damp);

  // Sandy shoreline ring.
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(POND_RADIUS - 0.12, POND_RADIUS + 0.28, 40),
    new THREE.MeshStandardMaterial({
      color: '#cfc19a',
      roughness: 1,
      transparent: true,
      opacity: 0.95,
    })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(cx, surfaceY + 0.002, cz);
  shore.receiveShadow = true;
  group.add(shore);

  // The water itself.
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#4f86b8',
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.96,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND_RADIUS - 0.05, 44), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, surfaceY + 0.01, cz);
  water.receiveShadow = true;
  group.add(water);

  // A couple of flat stones by the shore for the path to land on.
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#b8a387', roughness: 1 });
  const stonePositions: Array<[number, number]> = [
    [cx - 1.15, cz + 0.85],
    [cx + 0.95, cz - 1.05],
  ];
  for (const [sx, sz] of stonePositions) {
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), stoneMat);
    stone.scale.y = 0.32;
    stone.position.set(sx, groundHeightAt(sx, sz) + 0.05, sz);
    const rot = Math.atan2(sz - cz, sx - cx);
    stone.rotation.y = rot;
    group.add(stone);
  }

  const waterBase = waterMat.color.clone();
  const update = (weather: number, _wind: number): void => {
    // Muted, darker water under a rainy sky.
    waterMat.color.copy(waterBase).lerp(new THREE.Color('#3f6d94'), weather * 0.6);
  };

  return { group, surfaceY, update };
}