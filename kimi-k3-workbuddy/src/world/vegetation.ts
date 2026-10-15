import * as THREE from 'three';
import { MAT, enableShadows } from './materials';
import { groundY } from './island';

export interface Tree {
  group: THREE.Group;
  crown: THREE.Object3D;
  phase: number;
  flex: number; // sway multiplier per tree
}

/** Three tree archetypes: round, tall cone, and lollipop. */
export function buildTree(kind: 0 | 1 | 2, scale: number): Tree {
  const g = new THREE.Group();
  const crown = new THREE.Group();

  const trunkH = kind === 1 ? 0.7 : 0.55;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07 * scale, 0.11 * scale, trunkH * scale, 6),
    MAT.trunk
  );
  trunk.position.y = (trunkH * scale) / 2;
  g.add(trunk);

  const leafMat = kind === 0 ? MAT.leafA : kind === 1 ? MAT.leafB : MAT.leafC;

  if (kind === 0) {
    // round: two stacked blobs
    const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * scale, 0), leafMat);
    b1.position.y = trunkH * scale + 0.28 * scale;
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * scale, 0), leafMat);
    b2.position.set(0.14 * scale, trunkH * scale + 0.55 * scale, 0.08 * scale);
    crown.add(b1, b2);
  } else if (kind === 1) {
    // pine: two cones
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.34 * scale, 0.6 * scale, 7), leafMat);
    c1.position.y = trunkH * scale + 0.3 * scale;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.24 * scale, 0.5 * scale, 7), leafMat);
    c2.position.y = trunkH * scale + 0.68 * scale;
    crown.add(c1, c2);
  } else {
    // lollipop
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 8, 7), leafMat);
    s.position.y = trunkH * scale + 0.34 * scale;
    s.scale.y = 1.15;
    crown.add(s);
  }

  g.add(crown);
  enableShadows(g);
  return { group: g, crown, phase: Math.random() * Math.PI * 2, flex: 0.7 + Math.random() * 0.6 };
}

export function buildFlowers(): THREE.Group {
  const g = new THREE.Group();
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4);
  const headGeo = new THREE.SphereGeometry(0.045, 6, 5);
  const spots: [number, number, THREE.Material][] = [
    [-2.6, 1.2, MAT.flowerPink],
    [-2.4, 1.5, MAT.flowerYellow],
    [-2.9, 0.9, MAT.flowerYellow],
    [0.6, 2.9, MAT.flowerPink],
    [0.9, 3.1, MAT.flowerYellow],
    [-0.6, -2.7, MAT.flowerPink],
    [-1.0, -2.5, MAT.flowerYellow],
    [3.3, -1.6, MAT.flowerPink]
  ];
  spots.forEach(([x, z, m]) => {
    const stem = new THREE.Mesh(stemGeo, MAT.stem);
    stem.position.set(x, 0.36, z);
    const head = new THREE.Mesh(headGeo, m);
    head.position.set(x, 0.44, z);
    g.add(stem, head);
  });
  return g;
}

export function buildPath(): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 7);
  // stepping stones from the pond shore toward the house door
  const pts: [number, number][] = [
    [-0.28, 1.35], [-0.34, 1.75], [-0.2, 2.15], [-0.42, 2.55], [-0.3, 2.95], [-0.5, 3.35]
  ];
  pts.forEach(([x, z], i) => {
    const s = new THREE.Mesh(geo, MAT.pathStone);
    s.position.set(x, 0.33, z);
    s.rotation.y = i * 0.9;
    s.scale.setScalar(0.85 + (i % 3) * 0.12);
    s.receiveShadow = true;
    s.castShadow = true;
    g.add(s);
  });
  return g;
}

export function buildFence(): THREE.Group {
  const g = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.07, 0.42, 0.07);
  const railGeo = new THREE.BoxGeometry(1.05, 0.05, 0.04);
  // small fence arc around the pond, west side
  const segments = 4;
  const cx = 1.9;
  const cz = 1.4;
  const r = 1.55;
  for (let i = 0; i < segments; i++) {
    const a = Math.PI * 0.65 + (i / (segments - 1)) * Math.PI * 0.5;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const post = new THREE.Mesh(postGeo, MAT.wood);
    post.position.set(x, groundY(x, z) + 0.18, z);
    g.add(post);
    if (i < segments - 1) {
      const a2 = Math.PI * 0.65 + ((i + 0.5) / (segments - 1)) * Math.PI * 0.5;
      const rx = cx + Math.cos(a2) * r;
      const rz = cz + Math.sin(a2) * r;
      const rail = new THREE.Mesh(railGeo, MAT.wood);
      rail.position.set(rx, groundY(rx, rz) + 0.3, rz);
      rail.rotation.y = -a2 + Math.PI / 2;
      rail.scale.x = 0.62;
      g.add(rail);
    }
  }
  enableShadows(g);
  return g;
}
