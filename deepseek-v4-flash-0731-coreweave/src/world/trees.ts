import * as THREE from 'three';
import { mulberry32 } from '../utils/noise';
import { groundHeightAt } from './island';

export interface TreeHandle {
  group: THREE.Group;
  sway: { speed: number; amp: number; phase: number };
}

export function createTrees(): { group: THREE.Group; trees: TreeHandle[] } {
  const group = new THREE.Group();
  const rng = mulberry32(4242);
  const trees: TreeHandle[] = [];

  const barkMat = new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.95 });
  const pineMat = new THREE.MeshStandardMaterial({ color: '#2f6b3f', roughness: 0.9 });
  const darkPineMat = new THREE.MeshStandardMaterial({ color: '#265338', roughness: 0.9 });

  function trunk(r: number, h: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.25, h, 7), barkMat);
    m.castShadow = true;
    return m;
  }

  /** Broadleaf tree: tall-ish trunk + two stacked, slightly flattened blobs. */
  function roundTree(x: number, z: number, s: number, leafColor: THREE.Color): void {
    const g = new THREE.Group();
    const h = 0.65 + s * 0.5;
    const t = trunk(0.14 * s + 0.1, h);
    t.position.y = h / 2;
    g.add(t);
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.9,
      flatShading: false,
    });
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.72 * s, 10, 8), leafMat);
    c1.position.y = h + 0.45 * s;
    c1.scale.y = 0.82;
    c1.castShadow = true;
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 10, 8), leafMat);
    c2.position.y = h + 0.95 * s;
    c2.position.x = 0.28 * s;
    c2.position.z = -0.16 * s;
    c2.scale.y = 0.9;
    c2.castShadow = true;
    g.add(c2);
    g.position.set(x, groundHeightAt(x, z) - 0.06, z);
    group.add(g);
    trees.push({
      group: g,
      sway: { speed: 0.7 + rng() * 0.7, amp: 0.05 + rng() * 0.05, phase: rng() * Math.PI * 2 },
    });
  }

  /** Pine: trunk + stacked cones, pointed silhouette. */
  function pineTree(x: number, z: number, s: number): void {
    const g = new THREE.Group();
    const h = 0.5 + s * 0.4;
    const t = trunk(0.12 * s + 0.08, h);
    t.position.y = h / 2;
    g.add(t);
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const r = (0.78 - i * 0.16) * s;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r, 1.05 * s, 9),
        i % 2 === 0 ? pineMat : darkPineMat
      );
      cone.position.y = h + (0.35 + i * 0.42) * s;
      cone.castShadow = true;
      g.add(cone);
    }
    g.position.set(x, groundHeightAt(x, z) - 0.06, z);
    group.add(g);
    trees.push({
      group: g,
      sway: { speed: 0.8 + rng() * 0.6, amp: 0.035 + rng() * 0.04, phase: rng() * Math.PI * 2 },
    });
  }

  roundTree(-2.9, -2.5, 1.25, new THREE.Color('#5a9d50'));
  pineTree(5.6, 0.7, 1.2);
  roundTree(-1.7, 3.9, 1.0, new THREE.Color('#4e8a46'));
  roundTree(2.3, 2.9, 0.85, new THREE.Color('#eec9d6')); // blossom near the cottage
  pineTree(6.0, -3.4, 0.95);
  roundTree(-5.0, -0.7, 0.8, new THREE.Color('#6aa858'));
  pineTree(-4.9, -4.4, 0.8);

  return { group, trees };
}