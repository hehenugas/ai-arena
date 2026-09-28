import * as THREE from 'three';

export function createProps(): THREE.Group {
  const group = new THREE.Group();

  const rockPositions = [
    { x: -6, z: 0, scale: 0.4 },
    { x: 6, z: -2, scale: 0.3 },
    { x: -3, z: 5, scale: 0.25 },
    { x: 2, z: -5, scale: 0.35 },
  ];

  rockPositions.forEach(pos => {
    const rock = createRock(pos.scale);
    rock.position.set(pos.x, 0.3, pos.z);
    group.add(rock);
  });

  const pathPoints = [
    new THREE.Vector3(0, 0.32, 2),
    new THREE.Vector3(0.5, 0.32, 3),
    new THREE.Vector3(0, 0.32, 4),
    new THREE.Vector3(-0.5, 0.32, 5),
  ];

  pathPoints.forEach(point => {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 })
    );
    stone.position.copy(point);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    stone.castShadow = true;
    group.add(stone);
  });

  const fenceGroup = createFence();
  fenceGroup.position.set(-4, 0.3, 3);
  fenceGroup.rotation.y = Math.PI / 4;
  group.add(fenceGroup);

  const flowerPositions = [
    { x: 3, z: 3 },
    { x: -2, z: -3 },
    { x: 5, z: 0 },
    { x: -5, z: -1 },
    { x: 1, z: -4 },
  ];

  flowerPositions.forEach(pos => {
    const flower = createFlower();
    flower.position.set(pos.x, 0.3, pos.z);
    group.add(flower);
  });

  return group;
}

function createRock(scale: number): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(scale, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const noise = (Math.random() - 0.5) * 0.1;
    positions.setXYZ(i, x + noise, y + noise, z + noise);
  }
  geometry.computeVertexNormals();

  const rock = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.95 })
  );
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function createFence(): THREE.Group {
  const fence = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });

  for (let i = 0; i < 5; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), postMaterial);
    post.position.set(i * 0.6, 0.25, 0);
    post.castShadow = true;
    fence.add(post);
  }

  for (let i = 0; i < 2; i++) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.04), postMaterial);
    rail.position.set(1.2, 0.15 + i * 0.2, 0);
    rail.castShadow = true;
    fence.add(rail);
  }

  return fence;
}

function createFlower(): THREE.Group {
  const flower = new THREE.Group();

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x4a7c3f, roughness: 0.8 })
  );
  stem.position.y = 0.1;
  flower.add(stem);

  const colors = [0xff6b6b, 0xffd93d, 0xff8fab, 0xc084fc];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const petals = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 6, 6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  petals.position.y = 0.22;
  flower.add(petals);

  return flower;
}
