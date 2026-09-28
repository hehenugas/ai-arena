import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { TREES, type TreeSpec } from './layout';
import { WIND_DIR } from '../state';
import { grassHeight } from './island';
import { mulberry32, TAU } from '../utils';

const TRUNK = '#7c5a41';
const FOLIAGE = ['#5fa860', '#4f9455', '#6fb767', '#579c5c'];
const PINE = ['#46855a', '#3d7550'];

export interface Tree {
  root: Group;
  sway: Group;
  canopy: Group | null;
  phase: number;
  amp: number;
}

/**
 * Trees lean with the shared wind vector (towards +X/+Z like everything else)
 * and oscillate around it; amplitude and speed both scale with wind strength.
 */
export function createTrees(): { group: Group; trees: Tree[] } {
  const group = new Group();
  group.name = 'trees';

  const trunkMat = new MeshStandardMaterial({ color: TRUNK, roughness: 0.9 });
  const foliageMats = FOLIAGE.map(
    (c) => new MeshStandardMaterial({ color: new Color(c), roughness: 0.92, flatShading: true }),
  );
  const pineMats = PINE.map(
    (c) => new MeshStandardMaterial({ color: new Color(c), roughness: 0.92, flatShading: true }),
  );
  const blobGeo = new IcosahedronGeometry(1, 1);
  const trunkGeo = new CylinderGeometry(0.14, 0.2, 1.2, 7);
  const coneGeo = new ConeGeometry(0.78, 1.1, 7);

  const trees: Tree[] = TREES.map((spec: TreeSpec) => {
    const rand = mulberry32(spec.seed);
    const root = new Group();
    root.position.set(spec.x, grassHeight(spec.x, spec.z) - 0.03, spec.z);
    root.rotation.y = rand() * TAU;
    root.scale.setScalar(spec.scale);
    group.add(root);

    const sway = new Group();
    root.add(sway);

    const trunk = new Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.55;
    trunk.castShadow = true;
    sway.add(trunk);

    let canopy: Group | null = null;

    if (spec.kind === 'round') {
      canopy = new Group();
      const canopyGroup = canopy;
      canopyGroup.position.y = 1.0;
      sway.add(canopyGroup);
      const blobs: Array<[number, number, number, number]> = [
        [0, 0.55, 0, 0.85],
        [-0.5, 0.3, 0.28, 0.58],
        [0.46, 0.36, -0.3, 0.6],
        [0.05, 1.0, 0.08, 0.55],
      ];
      blobs.forEach(([x, y, z, r], i) => {
        const blob = new Mesh(blobGeo, foliageMats[i % foliageMats.length]);
        blob.position.set(x + (rand() - 0.5) * 0.12, y, z + (rand() - 0.5) * 0.12);
        blob.scale.set(r * (0.9 + rand() * 0.25), r * (0.82 + rand() * 0.2), r * (0.9 + rand() * 0.2));
        blob.rotation.set(rand() * TAU, rand() * TAU, rand() * TAU);
        blob.castShadow = true;
        canopyGroup.add(blob);
      });
    } else if (spec.kind === 'pine') {
      const trunkTop = new Mesh(trunkGeo, trunkMat);
      trunkTop.position.y = 1.35;
      trunkTop.scale.set(0.7, 1.4, 0.7);
      trunkTop.castShadow = true;
      sway.add(trunkTop);
      const layers: Array<[number, number]> = [
        [1.0, 1.0],
        [1.7, 0.78],
        [2.3, 0.55],
      ];
      layers.forEach(([y, s], i) => {
        const cone = new Mesh(coneGeo, pineMats[i % pineMats.length]);
        cone.position.set((rand() - 0.5) * 0.05, y, (rand() - 0.5) * 0.05);
        cone.scale.set(s, s * 1.15, s);
        cone.rotation.y = rand() * TAU;
        cone.castShadow = true;
        sway.add(cone);
      });
    } else {
      canopy = new Group();
      canopy.position.y = 0.4;
      sway.add(canopy);
      const blob = new Mesh(blobGeo, foliageMats[2]);
      blob.position.y = 0.3;
      blob.scale.set(0.62, 0.5, 0.6);
      blob.castShadow = true;
      canopy.add(blob);
    }

    return {
      root,
      sway,
      canopy,
      phase: rand() * TAU,
      amp: 0.75 + rand() * 0.5,
    };
  });

  return { group, trees };
}

export function updateTrees(trees: Tree[], t: number, wind: number): void {
  // Shared wind direction: +X and +Z, matching clouds and rain slant.
  const leanZ = -WIND_DIR.x;
  const leanX = WIND_DIR.y;
  for (const tree of trees) {
    const amp = (0.006 + 0.075 * wind) * tree.amp;
    const speed = 1.1 + 1.7 * wind;
    const wobble = Math.sin(t * speed + tree.phase);
    const gust = Math.sin(t * speed * 0.43 + tree.phase * 2.1) * 0.5 + 0.5;
    const amount = amp * (0.55 + 0.45 * gust);
    tree.sway.rotation.z = leanZ * amount * wobble;
    tree.sway.rotation.x = leanX * amount * wobble;
    if (tree.canopy) {
      tree.canopy.rotation.z = leanZ * amount * wobble * 1.6;
      tree.canopy.rotation.x = leanX * amount * wobble * 1.6;
    }
  }
}
