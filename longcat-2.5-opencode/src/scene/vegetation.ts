import * as THREE from 'three';

export function createVegetation(): THREE.Group {
  const group = new THREE.Group();
  const trees: THREE.Group[] = [];

  const treePositions = [
    { x: -4, z: 2, scale: 1.2 },
    { x: -5, z: -3, scale: 0.9 },
    { x: 4, z: -3, scale: 1.0 },
    { x: 5, z: 2, scale: 1.1 },
    { x: -2, z: -5, scale: 0.8 },
    { x: 3, z: 4, scale: 0.7 },
  ];

  treePositions.forEach((pos, i) => {
    const tree = createTree(pos.scale, i);
    tree.position.set(pos.x, 0.3, pos.z);
    group.add(tree);
    trees.push(tree);
  });

  const bushPositions = [
    { x: -3, z: 4, scale: 0.5 },
    { x: 4, z: -1, scale: 0.4 },
    { x: -1, z: -4, scale: 0.6 },
  ];

  bushPositions.forEach(pos => {
    const bush = createBush(pos.scale);
    bush.position.set(pos.x, 0.3, pos.z);
    group.add(bush);
  });

  group.userData.trees = trees;
  return group;
}

function createTree(scale: number, variant: number): THREE.Group {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.8 * scale, 6),
    new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
  );
  trunk.position.y = 0.4 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliageColor = variant % 2 === 0 ? 0x4a7c3f : 0x5a8c4f;
  const foliage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5 * scale, 1),
    new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.8 })
  );
  foliage.position.y = 1.0 * scale;
  foliage.castShadow = true;
  tree.add(foliage);

  if (variant % 3 === 0) {
    const foliage2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3 * scale, 1),
      new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.8 })
    );
    foliage2.position.set(0.2 * scale, 1.2 * scale, 0.1 * scale);
    foliage2.castShadow = true;
    tree.add(foliage2);
  }

  return tree;
}

function createBush(scale: number): THREE.Group {
  const bush = new THREE.Group();
  const foliage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3 * scale, 1),
    new THREE.MeshStandardMaterial({ color: 0x4a7c3f, roughness: 0.8 })
  );
  foliage.position.y = 0.2 * scale;
  foliage.castShadow = true;
  bush.add(foliage);
  return bush;
}
