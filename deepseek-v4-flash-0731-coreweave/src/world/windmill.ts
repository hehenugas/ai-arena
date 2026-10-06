import * as THREE from 'three';
import { WINDMILL_POS, groundHeightAt } from './island';
import { makeStoneTexture } from '../utils/textures';

export interface Windmill {
  group: THREE.Group;
  blades: THREE.Group;
}

/**
 * Stone windmill with four slowly rotating sails. The sails' rotation speed
 * is driven by the shared wind state.
 */
export function createWindmill(): Windmill {
  const group = new THREE.Group();
  const x = WINDMILL_POS.x;
  const z = WINDMILL_POS.y;
  group.position.set(x, groundHeightAt(x, z) - 0.12, z);
  // Face the sails toward the centre of the island so they read from the
  // default camera view.
  group.rotation.y = Math.atan2(-x, -z);

  const stoneTex = makeStoneTexture();

  // Grassy mound the mill sits on, blending into the meadow.
  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.9, 0.5, 18),
    new THREE.MeshStandardMaterial({ color: '#5a8a4e', roughness: 1 })
  );
  mound.position.y = -0.12;
  mound.receiveShadow = true;
  group.add(mound);

  // Tower.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.15, 3.4, 14),
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 })
  );
  tower.position.y = 1.7;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // Small door at the base.
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.72, 0.12),
    new THREE.MeshStandardMaterial({ color: '#5a4632', roughness: 0.9 })
  );
  door.position.set(0, 0.36, 0.92);
  group.add(door);
  // Round window on the tower front.
  const windowMat = new THREE.MeshStandardMaterial({
    color: '#2a3448',
    emissive: new THREE.Color('#ffd9a0'),
    emissiveIntensity: 0,
  });
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), windowMat);
  win.position.set(0, 1.35, 0.87);
  group.add(win);

  // Cap.
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(1.12, 0.85, 12),
    new THREE.MeshStandardMaterial({ color: '#8d5b3c', roughness: 0.9 })
  );
  cap.position.y = 3.8;
  cap.castShadow = true;
  group.add(cap);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 0.6 })
  );
  tip.position.y = 4.42;
  group.add(tip);

  // Rotating sail assembly.
  const blades = new THREE.Group();
  blades.position.set(0, 3.12, 0.78);
  group.add(blades);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: '#6b5138', roughness: 0.85 })
  );
  hub.rotation.x = Math.PI / 2;
  blades.add(hub);

  const sailMat = new THREE.MeshStandardMaterial({ color: '#e8dfcf', roughness: 0.8 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#5a4632', roughness: 0.85 });

  function addBlade(dirX: number, dirY: number, horizontal: boolean): void {
    const g = new THREE.Group();
    const length = 2.15;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.17, length, 0.05), frameMat);
    blade.position.y = length / 2;
    g.add(blade);
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? 0.52 : 0.2, horizontal ? 0.2 : 0.52, 0.03),
      sailMat
    );
    sail.position.set(0, length * 0.55, 0);
    g.add(sail);
    const sail2 = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? 0.52 : 0.2, horizontal ? 0.2 : 0.52, 0.03),
      sailMat
    );
    sail2.position.set(0, length * 0.22, 0);
    g.add(sail2);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 0.2 : 0.52, horizontal ? 0.52 : 0.2, 0.05), frameMat);
    cross.position.set(0, length * 0.55, 0);
    g.add(cross);

    const dist = length / 2 + 0.1;
    g.position.set(dirX * dist, dirY * dist, 0);
    if (horizontal) g.rotation.z = Math.PI / 2;
    blades.add(g);
  }
  addBlade(0, 1, false); // top
  addBlade(0, -1, false); // bottom
  addBlade(1, 0, true); // right
  addBlade(-1, 0, true); // left

  // Gentle pre-tilt so the sails read at an angle out of the box.
  blades.rotation.x = 0.12;

  return { group, blades };
}