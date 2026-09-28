import * as THREE from 'three';

export function createHouse(): THREE.Group {
  const group = new THREE.Group();

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.8 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.6 });
  const chimneyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1.8), wallMaterial);
  walls.position.y = 0.75;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 4), roofMaterial);
  roof.position.y = 2.1;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.1), doorMaterial);
  door.position.set(0, 0.4, 0.95);
  door.castShadow = true;
  group.add(door);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x87ceeb,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0xffa500,
    emissiveIntensity: 0,
  });

  const windowPositions = [
    { x: -0.6, y: 0.9, z: 0.95 },
    { x: 0.6, y: 0.9, z: 0.95 },
    { x: -0.95, y: 0.9, z: 0, rotationY: Math.PI / 2 },
    { x: 0.95, y: 0.9, z: 0, rotationY: Math.PI / 2 },
  ];

  const windows: THREE.Mesh[] = [];
  windowPositions.forEach(pos => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.08), windowMaterial.clone());
    window.position.set(pos.x, pos.y, pos.z);
    if (pos.rotationY) window.rotation.y = pos.rotationY;
    window.castShadow = true;
    group.add(window);
    windows.push(window);
  });

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), chimneyMaterial);
  chimney.position.set(0.5, 2.0, 0);
  chimney.castShadow = true;
  group.add(chimney);

  group.userData.windows = windows;
  return group;
}

export function updateHouseLights(house: THREE.Group, lightsOn: boolean): void {
  const windows = house.userData.windows as THREE.Mesh[];
  windows.forEach(window => {
    const material = window.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = lightsOn ? 1.5 : 0;
  });
}
