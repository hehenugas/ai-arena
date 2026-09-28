import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  Object3D,
} from 'three';
import { materials } from './materials';
import type { FrameContext } from './state';
import { terrainHeight, type IslandInfo } from './terrain';
import { mulberry32 } from './utils';

const TRUNK_GEOMETRY = new CylinderGeometry(0.055, 0.1, 1, 8);
const BLOB_GEOMETRY = new IcosahedronGeometry(1, 1);
const CONE_GEOMETRY = new ConeGeometry(1, 1, 9);

type TreeKind = 'broadleaf' | 'conifer' | 'bush';

interface TreeSpec {
  x: number;
  z: number;
  scale: number;
  kind: TreeKind;
}

/** Hand-placed so the island reads as composed rather than scattered. */
const TREES: TreeSpec[] = [
  { x: -4, z: -1.9, scale: 1.3, kind: 'conifer' },
  { x: -4.7, z: 1.5, scale: 1.1, kind: 'broadleaf' },
  { x: -2.9, z: 3.2, scale: 0.95, kind: 'broadleaf' },
  { x: -0.5, z: 4.5, scale: 0.8, kind: 'broadleaf' },
  { x: 4.1, z: -2.3, scale: 1.15, kind: 'conifer' },
  { x: 4.8, z: 0.9, scale: 1.05, kind: 'broadleaf' },
  { x: 3.1, z: 4, scale: 0.7, kind: 'bush' },
  { x: 1.6, z: -4.4, scale: 0.95, kind: 'conifer' },
  { x: -3.7, z: -3.5, scale: 0.75, kind: 'bush' },
];

interface Swayer {
  object: Object3D;
  phase: number;
  amount: number;
}

const leafMaterials = [materials.leaf, materials.leafDark, materials.leafLight];

function addTrunk(parent: Object3D, height: number, width: number, rand: () => number): void {
  const trunk = new Mesh(TRUNK_GEOMETRY, materials.trunk);
  trunk.position.y = height / 2;
  trunk.scale.set(width, height, width);
  trunk.rotation.y = rand() * Math.PI;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  parent.add(trunk);
}

function addBlob(
  parent: Object3D,
  x: number,
  y: number,
  z: number,
  radius: number,
  rand: () => number,
): void {
  const blob = new Mesh(BLOB_GEOMETRY, leafMaterials[Math.floor(rand() * leafMaterials.length)]);
  blob.position.set(x, y, z);
  blob.scale.set(radius, radius * (0.82 + rand() * 0.18), radius);
  blob.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
  blob.castShadow = true;
  blob.receiveShadow = true;
  parent.add(blob);
}

function addCone(
  parent: Object3D,
  y: number,
  radius: number,
  height: number,
  rand: () => number,
): void {
  const cone = new Mesh(CONE_GEOMETRY, rand() > 0.55 ? materials.leafDark : materials.leaf);
  cone.position.y = y + height / 2;
  cone.scale.set(radius, height, radius);
  cone.rotation.y = rand() * Math.PI;
  cone.castShadow = true;
  cone.receiveShadow = true;
  parent.add(cone);
}

function buildTree(spec: TreeSpec, rand: () => number): Group {
  const tree = new Group();
  const s = spec.scale;

  if (spec.kind === 'broadleaf') {
    const trunkHeight = 1.05 * s;
    addTrunk(tree, trunkHeight, 0.9 * s, rand);
    addBlob(tree, 0, trunkHeight + 0.42 * s, 0, 0.58 * s, rand);
    addBlob(tree, 0.26 * s, trunkHeight + 0.26 * s, -0.16 * s, 0.4 * s, rand);
    addBlob(tree, -0.28 * s, trunkHeight + 0.3 * s, 0.14 * s, 0.36 * s, rand);
    addBlob(tree, 0.06 * s, trunkHeight + 0.72 * s, 0.06 * s, 0.34 * s, rand);
  } else if (spec.kind === 'conifer') {
    const trunkHeight = 0.5 * s;
    addTrunk(tree, trunkHeight, 0.85 * s, rand);
    addCone(tree, trunkHeight - 0.08 * s, 0.66 * s, 1.05 * s, rand);
    addCone(tree, trunkHeight + 0.5 * s, 0.5 * s, 0.92 * s, rand);
    addCone(tree, trunkHeight + 1.02 * s, 0.34 * s, 0.8 * s, rand);
  } else {
    addBlob(tree, 0, 0.26 * s, 0, 0.34 * s, rand);
    addBlob(tree, 0.22 * s, 0.2 * s, 0.12 * s, 0.26 * s, rand);
    addBlob(tree, -0.2 * s, 0.22 * s, -0.14 * s, 0.24 * s, rand);
  }

  return tree;
}

export interface Vegetation {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createVegetation(info: IslandInfo): Vegetation {
  const group = new Group();
  group.name = 'vegetation';
  const rand = mulberry32(20240924);
  const swayers: Swayer[] = [];

  for (const spec of TREES) {
    const anchor = info.clampToIsland(spec.x, spec.z, 1.15);
    const pivot = new Group();
    pivot.position.set(anchor.x, terrainHeight(anchor.x, anchor.z) - 0.04, anchor.z);
    pivot.rotation.y = rand() * Math.PI * 2;
    pivot.add(buildTree(spec, rand));
    group.add(pivot);

    swayers.push({
      object: pivot,
      phase: rand() * Math.PI * 2,
      // Taller trees lean a little more than the small ones.
      amount: 0.026 + 0.02 * spec.scale,
    });
  }

  return {
    group,
    update(ctx: FrameContext) {
      const motion = ctx.reducedMotion ? 0.3 : 1;
      const gust = 0.65 + 0.35 * Math.sin(ctx.elapsed * 0.37 + 1.2);
      const strength = (0.16 + ctx.wind * 1.65) * gust * motion;
      for (const swayer of swayers) {
        const wave = Math.sin(ctx.elapsed * 1.45 * (0.85 + ctx.wind * 0.5) + swayer.phase);
        const cross = Math.sin(ctx.elapsed * 0.58 + swayer.phase * 1.7);
        swayer.object.rotation.z = wave * swayer.amount * strength;
        swayer.object.rotation.x = cross * swayer.amount * strength * 0.55;
      }
    },
  };
}
