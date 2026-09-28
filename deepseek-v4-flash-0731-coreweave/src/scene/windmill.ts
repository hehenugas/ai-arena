import * as THREE from 'three';
import { islandHeight } from './height';
import { stoneTexture } from '../tx/stone';
import { woodTexture } from '../tx/wood';
import { thatchTexture } from '../tx/thatch';
import { sailTexture } from '../tx/sail';

export interface WindmillHandle {
  group: THREE.Group;
  spin: THREE.Group;
}

// A tapered stone tower which sail blades turned by the wind
export function buildWindmill(scene: THREE.Scene): WindmillHandle {
  const group = new THREE.Group();
  const x =-	 1.15;
  const z =-	 1.0;
  const groundY = islandHeight(x,z);
  group.position.set(x, groundY,z);

  // blades face the island centre
  const face = Math.atan2(-x, -z);
  group.rotation.y = face;

  // tapered stone tower
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness:	 0.95 });
		const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16,	 0.34,	 1.7,	 14), stoneMat);
  tower.position.y =	 0.85;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // tiny door and window
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness:	 0.9 });
		const door = new THREE.Mesh(new THREE.BoxGeometry(0.2,	 0.3,	 0.07),woodMat);
  door.position.set(0.05,	 0.3,	 0.31);
  door.castShadow = true;
  group.add(door);
  const window = new THREE.Mesh(new THREE.BoxGeometry(0.14,	 0.14,	 0.05), woodMat);
  window.position.set(-0.05,	 0.95,	 0.26);
  group.add(window);

  // conical thatched cap
  const capMat = new THREE.MeshStandardMaterial({ map: thatchTexture(), roughness:	 1.0 });
		const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26,	 0.3,	 10), capMat);
  cap.position.y =	 1.85;
  cap.castShadow = true;
  group.add(cap);

  // blade assembly -- hub plus four sails turning about local Z
  const spin = new THREE.Group();
  spin.position.set(0,	 1.72,	0.28);
	  const sailMat = new THREE.MeshStandardMaterial({ map: sailTexture(), roughness:	 0.8, side:	THREE.DoubleSide });
	 Array(4).forEach((_, i) => {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.13,	 0.9,	 0.03),sailMat);
    blade.position.y =	 0.42;
    blade.rotation.z = (i *	Math.PI) /	2;
    blade.castShadow = true;
    spin.add(blade);
  });
	  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09,	 0.12,	 0.14,	8), woodMat);
  hub.rotation.x = Math.PI /	2;
  hub.position.z =-	 0.02;
  spin.add(hub);

  group.add(spin);
  scene.add(group);
  return { group, spin };
}
export function spinWindmill(wm: WindmillHandle, dt: number, wind: number): void {
  wm.spin.rotation.z +=  wind * 1.6 * dt;
}
