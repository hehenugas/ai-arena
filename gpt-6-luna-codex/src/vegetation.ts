import * as THREE from 'three';
import { woodTexture } from './textures';

export interface Tree {
  group: THREE.Group;
  phase: number;
}

const foliageColors = ['#688558', '#79945e', '#8ba069', '#5f7d58'];
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: 0.98 });

function makeTree(x: number, z: number, scale: number, tint: string, phase: number): Tree {
  const group = new THREE.Group();
  group.position.set(x, 0.06, z);
  const stemHeight = 0.64 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.095 * scale, 0.15 * scale, stemHeight, 7), trunkMaterial);
  trunk.position.y = stemHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const crown = new THREE.Group();
  crown.position.y = stemHeight * 0.78;
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.96, flatShading: true });
  const crownParts = [
    { p: [0, 0.22, 0], s: [0.43, 0.48, 0.42] },
    { p: [-0.25, 0.06, 0.04], s: [0.32, 0.34, 0.33] },
    { p: [0.23, 0.04, 0.03], s: [0.34, 0.33, 0.34] },
    { p: [0.02, -0.11, 0.2], s: [0.28, 0.28, 0.28] },
  ];
  for (const part of crownParts) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), foliageMaterial);
    leaf.position.set(part.p[0] * scale, part.p[1] * scale, part.p[2] * scale);
    leaf.scale.set(part.s[0] * scale, part.s[1] * scale, part.s[2] * scale);
    leaf.rotation.set(0.12, phase * 1.7, 0.08);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    crown.add(leaf);
  }
  group.add(crown);
  return { group, phase };
}

export function createVegetation(): { group: THREE.Group; trees: Tree[]; update: (time: number, wind: number, motionScale: number) => void } {
  const group = new THREE.Group();
  group.name = 'Orchard and meadow';
  const trees = [
    makeTree(-1.58, -0.83, 0.83, foliageColors[0], 0.4),
    makeTree(-1.67, 0.94, 0.93, foliageColors[1], 1.7),
    makeTree(-0.05, 1.73, 0.78, foliageColors[2], 2.4),
    makeTree(1.66, 1.17, 0.75, foliageColors[3], 3.2),
  ];
  for (const tree of trees) group.add(tree.group);

  const flowerColors = ['#d88f73', '#e6c775', '#edf0d6', '#a9bbc0'];
  for (let i = 0; i < 20; i += 1) {
    const angle = i * 2.399;
    const radius = 1.25 + (i % 4) * 0.12;
    const flower = new THREE.Group();
    flower.position.set(Math.cos(angle) * radius - 0.08, 0.08, Math.sin(angle) * radius + 0.23);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.12, 5), new THREE.MeshStandardMaterial({ color: '#657b50', roughness: 1 }));
    stem.position.y = 0.06;
    flower.add(stem);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 7), new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], roughness: 0.75 }));
    bloom.position.y = 0.14;
    flower.add(bloom);
    group.add(flower);
  }

  const pebbleMaterial = new THREE.MeshStandardMaterial({ color: '#9a9381', roughness: 1, flatShading: true });
  for (const [x, z, scale, turn] of [
    [-2.02, -0.02, 0.15, 0.4], [-1.13, 1.61, 0.12, 1.1], [1.92, -0.1, 0.12, 2.4], [1.73, 1.58, 0.17, 0.8],
    [0.25, -1.91, 0.13, 1.3], [-0.28, 1.45, 0.09, 2.1],
  ]) {
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), pebbleMaterial);
    pebble.position.set(x, 0.12, z);
    pebble.scale.set(scale * 1.5, scale * 0.72, scale);
    pebble.rotation.y = turn;
    pebble.castShadow = true;
    group.add(pebble);
  }

  const fenceMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: 0.96 });
  const fence = new THREE.Group();
  const posts = [[0.06, -1.82], [0.48, -1.91], [0.9, -1.88]];
  for (const [x, z] of posts) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 6), fenceMaterial);
    post.position.set(x, 0.3, z);
    post.castShadow = true;
    fence.add(post);
  }
  for (const y of [0.2, 0.39]) {
    for (let i = 0; i < posts.length - 1; i += 1) {
      const a = new THREE.Vector3(posts[i][0], y, posts[i][1]);
      const b = new THREE.Vector3(posts[i + 1][0], y, posts[i + 1][1]);
      const delta = b.clone().sub(a);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, delta.length(), 6), fenceMaterial);
      rail.position.copy(a).add(b).multiplyScalar(0.5);
      rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      fence.add(rail);
    }
  }
  group.add(fence);

  return {
    group,
    trees,
    update(time, wind, motionScale) {
      for (const tree of trees) {
        const sway = Math.min(1, wind) * motionScale;
        tree.group.rotation.z = Math.sin(time * 1.45 + tree.phase) * 0.045 * sway;
        tree.group.rotation.x = Math.cos(time * 1.12 + tree.phase * 1.4) * 0.026 * sway;
      }
    },
  };
}
