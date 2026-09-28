// Windmill with rotating blades
import * as THREE from 'three';

const towerMat = new THREE.MeshLambertMaterial({ color: 0xd8c8a8 });
const bladeMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc8, side: THREE.DoubleSide });
const hubMat = new THREE.MeshLambertMaterial({ color: 0x8a7a60 });
const capMat = new THREE.MeshLambertMaterial({ color: 0x7a5530 });

export interface WindmillObject {
  group: THREE.Group;
  bladeGroup: THREE.Group;
}

export function createWindmill(): WindmillObject {
  const group = new THREE.Group();
  group.name = 'windmill';

  // Tapered tower
  const towerGeo = new THREE.CylinderGeometry(0.32, 0.55, 4.0, 10);
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = 2.0;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // Small door at base
  const doorGeo = new THREE.BoxGeometry(0.28, 0.45, 0.1);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x5a3820 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.22, 0.57);
  group.add(door);

  // Windows (small square holes, no glass)
  const winMat = new THREE.MeshLambertMaterial({ color: 0x2a3050 });
  for (let i = 0; i < 3; i++) {
    const winGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const win = new THREE.Mesh(winGeo, winMat);
    const angle = (i / 3) * Math.PI * 2 + 0.5;
    win.position.set(Math.sin(angle) * 0.4, 1.2 + i * 0.9, Math.cos(angle) * 0.4);
    group.add(win);
  }

  // Conical cap
  const capGeo = new THREE.ConeGeometry(0.5, 0.7, 10);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 4.35;
  cap.castShadow = true;
  group.add(cap);

  // Hub
  const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.25, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.position.set(0.34, 3.8, 0);
  group.add(hub);

  // Blade group (rotates)
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0.46, 3.8, 0);

  // 4 blades
  for (let i = 0; i < 4; i++) {
    const bladeGeo = new THREE.BoxGeometry(0.18, 1.4, 0.05);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.castShadow = true;

    // Center blade pivot offset so it extends outward from hub
    blade.position.y = 0.7;

    const bladeWrapper = new THREE.Group();
    bladeWrapper.rotation.z = (i / 4) * Math.PI * 2;
    bladeWrapper.add(blade);
    bladeGroup.add(bladeWrapper);

    // Cross spar
    const sparGeo = new THREE.BoxGeometry(0.06, 1.35, 0.04);
    const sparMat = new THREE.MeshLambertMaterial({ color: 0x7a5530 });
    const spar = new THREE.Mesh(sparGeo, sparMat);
    spar.position.y = 0.67;
    bladeWrapper.add(spar);
  }

  group.add(bladeGroup);

  return { group, bladeGroup };
}
