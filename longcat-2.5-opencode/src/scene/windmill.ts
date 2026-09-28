import * as THREE from 'three';

export function createWindmill(): THREE.Group {
  const group = new THREE.Group();

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.8 })
  );
  tower.position.y = 1.5;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 })
  );
  cap.position.y = 3.25;
  cap.castShadow = true;
  group.add(cap);

  const blades = new THREE.Group();
  blades.position.set(0, 3, 0.35);

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.8, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.8 })
    );
    blade.position.y = 0.9;
    blade.castShadow = true;

    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI) / 2;
    pivot.add(blade);
    blades.add(pivot);
  }

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.6 })
  );
  blades.add(hub);

  group.add(blades);
  group.userData.blades = blades;

  return group;
}
