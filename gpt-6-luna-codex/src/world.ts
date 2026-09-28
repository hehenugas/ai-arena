import * as THREE from 'three';
import { createIsland } from './island';
import { createHouse } from './house';
import { createPond } from './pond';
import { createVegetation } from './vegetation';
import { createWindmill } from './windmill';

export function buildWorld(scene: THREE.Scene) {
  const island = createIsland();
  const house = createHouse();
  const pond = createPond();
  const vegetation = createVegetation();
  const windmill = createWindmill();
  scene.add(island, house.group, pond.group, vegetation.group, windmill.group);

  const pathMaterial = new THREE.MeshStandardMaterial({ color: '#c2ad7f', roughness: 1 });
  for (const [i, point] of [[0, [-0.09, 0.1, 0.85]], [1, [-0.18, 0.09, 1.13]], [2, [-0.32, 0.08, 1.39]]] as const) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.12, 0.035, 7), pathMaterial);
    stone.position.set(point[0], point[1], point[2]);
    stone.rotation.y = i * 0.5;
    stone.receiveShadow = true;
    scene.add(stone);
  }

  return { island, house, pond, vegetation, windmill };
}
