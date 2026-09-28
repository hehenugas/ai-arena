import * as THREE from 'three';
import type { UpdaterCtx, WorldPiece } from '../state';
import { M } from '../materials';
import { rng, sculptRock } from '../util';

interface Swayer {
  root: THREE.Group;
  node: THREE.Object3D;
  phase: number;
  amp: number;
}

function makeOak(scale: number, mainLeaf: THREE.Material, altLeaf: THREE.Material): Swayer {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 1.1, 7), M.trunk);
  trunk.position.y = 0.55;
  trunk.castShadow = true;
  g.add(trunk);

  const foliage = new THREE.Group();
  foliage.position.y = 1.05;
  const blob = new THREE.IcosahedronGeometry(0.62, 1);
  const b1 = new THREE.Mesh(blob, mainLeaf);
  b1.position.y = 0.28;
  b1.scale.set(1, 0.85, 1);
  const b2 = new THREE.Mesh(blob, altLeaf);
  b2.position.set(0.45, -0.02, 0.2);
  b2.scale.setScalar(0.7);
  const b3 = new THREE.Mesh(blob, mainLeaf);
  b3.position.set(-0.42, -0.04, -0.15);
  b3.scale.setScalar(0.62);
  for (const b of [b1, b2, b3]) {
    b.castShadow = true;
    b.receiveShadow = true;
    foliage.add(b);
  }
  g.add(foliage);
  g.scale.setScalar(scale);
  return { root: g, node: foliage, phase: rng() * Math.PI * 2, amp: 0.075 };
}

function makePine(scale: number): Swayer {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.5, 7), M.trunk);
  trunk.position.y = 0.25;
  trunk.castShadow = true;
  g.add(trunk);

  const foliage = new THREE.Group();
  foliage.position.y = 0.45;
  const tiers: Array<[number, number, number]> = [
    [0.55, 0.75, 0.35],
    [0.42, 0.7, 0.85],
    [0.28, 0.6, 1.3],
  ];
  for (const [r, h, y] of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), M.pine);
    cone.position.y = y;
    cone.castShadow = true;
    cone.receiveShadow = true;
    foliage.add(cone);
  }
  g.add(foliage);
  g.scale.setScalar(scale);
  return { root: g, node: foliage, phase: rng() * Math.PI * 2, amp: 0.05 };
}

function makeBush(): Swayer {
  const g = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), M.leaf3);
  blob.scale.set(1.2, 0.75, 1);
  blob.position.y = 0.22;
  blob.castShadow = true;
  blob.receiveShadow = true;
  g.add(blob);
  return { root: g, node: g, phase: rng() * Math.PI * 2, amp: 0.03 };
}

/** Oaks, pines and bushes that sway with the shared wind state. */
export function createTrees(): WorldPiece {
  const group = new THREE.Group();
  const swayers: Swayer[] = [];

  const spec: Array<[number, number, number, () => Swayer]> = [
    [-1.2, 2.9, 1.25, () => makeOak(1.25, M.leaf1, M.leaf2)],
    [-4.6, 0.6, 1.0, () => makeOak(1.0, M.leaf2, M.leaf3)],
    [-0.6, 4.1, 0.75, () => makeOak(0.75, M.leaf3, M.leaf1)],
    [0.9, -3.4, 1.15, () => makePine(1.15)],
    [-5.0, -2.6, 0.95, () => makePine(0.95)],
    [5.2, 0.2, 1.05, () => makePine(1.05)],
    [4.5, -3.9, 0.8, () => makePine(0.8)],
    [-4.2, -0.7, 1.0, makeBush],
    [-0.5, 0.3, 1.0, makeBush],
    [0.3, 2.2, 1.0, makeBush],
  ];
  for (const [x, z, rot, make] of spec) {
    const s = make();
    s.root.position.set(x, 0, z);
    s.root.rotation.y = rot;
    group.add(s.root);
    swayers.push(s);
  }

  return {
    group,
    update(ctx: UpdaterCtx) {
      const windFactor = 0.12 + 0.88 * ctx.smooth.wind;
      const motion = ctx.reduced ? 0.25 : 1;
      for (const s of swayers) {
        const gust = 0.72 + 0.28 * Math.sin(ctx.elapsed * 0.85 + s.phase * 2.1);
        const eff = s.amp * windFactor * motion * gust;
        s.node.rotation.x = Math.sin(ctx.elapsed * 1.9 + s.phase) * eff;
        s.node.rotation.z = Math.cos(ctx.elapsed * 1.55 + s.phase * 1.3) * eff * 0.8;
        s.root.rotation.z = Math.sin(ctx.elapsed * 1.05 + s.phase) * eff * 0.25;
      }
    },
  };
}

/** Shared sculpted-rock helper reuse for boulders placed by props. */
export function makeBoulder(scale: number, seed: number): THREE.Mesh {
  const geo = sculptRock(new THREE.DodecahedronGeometry(scale, 0), {
    seed,
    radialAmount: 0.22,
    yJitter: 0,
  });
  const m = new THREE.Mesh(geo, M.rockGray);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
