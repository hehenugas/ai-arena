import * as THREE from 'three';

export function createClouds(): THREE.Group {
  const group = new THREE.Group();

  const cloudPositions = [
    { x: -8, y: 6, z: -5 },
    { x: 5, y: 7, z: -8 },
    { x: 10, y: 5, z: 3 },
    { x: -5, y: 8, z: 8 },
  ];

  cloudPositions.forEach(pos => {
    const cloud = createCloud();
    cloud.position.set(pos.x, pos.y, pos.z);
    cloud.scale.setScalar(0.8 + Math.random() * 0.6);
    group.add(cloud);
  });

  return group;
}

function createCloud(): THREE.Group {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.9,
  });

  const puffCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < puffCount; i++) {
    const size = 0.3 + Math.random() * 0.4;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), material);
    puff.position.set(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.8
    );
    cloud.add(puff);
  }

  return cloud;
}
