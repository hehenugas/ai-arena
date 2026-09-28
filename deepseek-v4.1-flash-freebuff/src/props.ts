import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  Object3D,
} from 'three';
import { materials } from './materials';
import type { FrameContext } from './state';
import {
  distanceToPath,
  islandRadius,
  LAYOUT,
  PATH_LINES,
  terrainHeight,
  type IslandInfo,
} from './terrain';
import { mulberry32 } from './utils';

/** Boulder shape reused for surface rocks, underside bumps and floating stones. */
const BOULDER_GEOMETRY = new IcosahedronGeometry(1, 0);
const RAIL_GEOMETRY = new BoxGeometry(1, 1, 1);
const LILY_GEOMETRY = new CylinderGeometry(0.2, 0.2, 0.022, 12);
const STEM_GEOMETRY = new CylinderGeometry(0.006, 0.009, 1, 5);
const BLOSSOM_GEOMETRY = new IcosahedronGeometry(0.055, 0);
const GRASS_CAP_GEOMETRY = new CylinderGeometry(1, 1, 0.16, 12);

const BLOSSOM_MATERIAL = new MeshLambertMaterial({ color: '#ffffff' });
const BLOSSOM_COLORS = ['#e5bd63', '#d98d86', '#ece4d4', '#a68fc9', '#d9a469'];

const SURFACE_ROCKS: { x: number; z: number; scale: number; tilt: number }[] = [
  { x: -3.3, z: 0.5, scale: 0.42, tilt: 0.5 },
  { x: -0.3, z: 3.6, scale: 0.3, tilt: 1.1 },
  { x: 2.2, z: -1.4, scale: 0.26, tilt: 0.2 },
  { x: 4.4, z: 1.8, scale: 0.34, tilt: 0.8 },
  { x: -4.2, z: -0.6, scale: 0.31, tilt: 1.4 },
  { x: 0.9, z: -1.1, scale: 0.22, tilt: 0.35 },
];

const FLOWER_CLUSTERS: { x: number; z: number; count: number }[] = [
  { x: -2.5, z: 1.5, count: 9 },
  { x: -1.5, z: 0.9, count: 7 },
  { x: -2.4, z: 2.4, count: 8 },
  { x: -0.7, z: -0.9, count: 6 },
  { x: 2.3, z: 3.9, count: 7 },
  { x: 3.6, z: -0.9, count: 5 },
];

interface FloatingStone {
  group: Group;
  radius: number;
  angle: number;
  baseY: number;
  phase: number;
  speed: number;
}

function sampleLine(
  line: { x: number; z: number }[],
  spacing: number,
): { x: number; z: number; nx: number; nz: number }[] {
  const points: { x: number; z: number; nx: number; nz: number }[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.round(length / spacing));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      // Outward normal: the fence always sits on the far side of the trail.
      points.push({
        x: a.x + dx * t,
        z: a.z + dz * t,
        nx: -dz / length,
        nz: dx / length,
      });
    }
  }
  const last = line[line.length - 1];
  const prev = line[line.length - 2];
  const dx = last.x - prev.x;
  const dz = last.z - prev.z;
  const length = Math.hypot(dx, dz);
  points.push({ x: last.x, z: last.z, nx: -dz / length, nz: dx / length });
  return points;
}

export interface Props {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createProps(info: IslandInfo): Props {
  const group = new Group();
  group.name = 'props';
  const rand = mulberry32(5150);
  const dummy = new Object3D();
  const color = new Color();

  // Surface boulders.
  for (const spec of SURFACE_ROCKS) {
    const anchor = info.clampToIsland(spec.x, spec.z, 0.7);
    const rock = new Mesh(BOULDER_GEOMETRY, spec.scale > 0.3 ? materials.rockLight : materials.rock);
    rock.position.set(anchor.x, terrainHeight(anchor.x, anchor.z) + spec.scale * 0.25, anchor.z);
    rock.scale.set(spec.scale, spec.scale * 0.78, spec.scale * 0.92);
    rock.rotation.set(spec.tilt, spec.tilt * 1.7, spec.tilt * 0.6);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // Bumps on the sculpted underside so the rock is not a smooth cone.
  for (let i = 0; i < 6; i++) {
    const theta = rand() * Math.PI * 2;
    const depth = -0.55 - rand() * 1.5;
    const radius = islandRadius(theta) * (0.7 - rand() * 0.18);
    const size = 0.22 + rand() * 0.26;
    const rock = new Mesh(BOULDER_GEOMETRY, materials.rock);
    rock.position.set(Math.cos(theta) * radius, depth, Math.sin(theta) * radius);
    rock.scale.set(size, size * 0.9, size);
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    rock.castShadow = true;
    group.add(rock);
  }

  // Fence along the trail from the cottage towards the rim.
  const fencePoints = sampleLine(PATH_LINES[0], 0.62)
    .map((point) => {
      const offset = { x: point.x + point.nx * 0.52, z: point.z + point.nz * 0.52 };
      const distToHouse = Math.hypot(offset.x - LAYOUT.house.x, offset.z - LAYOUT.house.z);
      return { ...offset, skip: distToHouse < 1.7 };
    })
    .filter((point) => !point.skip)
    .map((point) => info.clampToIsland(point.x, point.z, 0.5));

  const postGeometry = new CylinderGeometry(0.05, 0.06, 1, 6);
  for (const point of fencePoints) {
    const post = new Mesh(postGeometry, materials.woodDark);
    const base = terrainHeight(point.x, point.z);
    post.position.set(point.x, base + 0.21, point.z);
    post.scale.set(1, 0.44, 1);
    post.castShadow = true;
    group.add(post);
  }
  for (let i = 0; i < fencePoints.length - 1; i++) {
    const a = fencePoints[i];
    const b = fencePoints[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (length > 1.4) continue;
    const rotation = Math.atan2(-dz, dx);
    for (const height of [0.3, 0.17]) {
      const rail = new Mesh(RAIL_GEOMETRY, materials.wood);
      const y = (terrainHeight(a.x, a.z) + terrainHeight(b.x, b.z)) / 2 + height;
      rail.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
      rail.scale.set(length * 1.04, 0.05, 0.035);
      rail.rotation.y = rotation;
      rail.castShadow = true;
      group.add(rail);
    }
  }

  // Flowers: two instanced meshes for the whole meadow.
  const capacity = 96;
  const stems = new InstancedMesh(STEM_GEOMETRY, materials.flowerStem, capacity);
  const blossoms = new InstancedMesh(BLOSSOM_GEOMETRY, BLOSSOM_MATERIAL, capacity);
  stems.castShadow = false;
  blossoms.castShadow = false;
  let flowerCount = 0;

  for (const cluster of FLOWER_CLUSTERS) {
    for (let i = 0; i < cluster.count && flowerCount < capacity; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = Math.sqrt(rand()) * 0.46;
      const x = cluster.x + Math.cos(angle) * distance;
      const z = cluster.z + Math.sin(angle) * distance;
      if (info.isOverPond(x, z) || distanceToPath(x, z) < 0.3) continue;
      const clamped = info.clampToIsland(x, z, 0.45);
      const baseY = terrainHeight(clamped.x, clamped.z);
      const height = 0.12 + rand() * 0.1;

      dummy.position.set(clamped.x, baseY + height / 2, clamped.z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(flowerCount, dummy.matrix);

      dummy.position.set(clamped.x, baseY + height + 0.02, clamped.z);
      dummy.rotation.set(rand(), rand() * Math.PI, rand());
      dummy.scale.setScalar(0.7 + rand() * 0.35);
      dummy.updateMatrix();
      blossoms.setMatrixAt(flowerCount, dummy.matrix);
      blossoms.setColorAt(flowerCount, color.set(BLOSSOM_COLORS[Math.floor(rand() * BLOSSOM_COLORS.length)]));

      flowerCount++;
    }
  }
  stems.count = flowerCount;
  blossoms.count = flowerCount;
  if (blossoms.instanceColor) blossoms.instanceColor.needsUpdate = true;
  stems.instanceMatrix.needsUpdate = true;
  blossoms.instanceMatrix.needsUpdate = true;
  group.add(stems, blossoms);

  // Lily pads drifting on the pond.
  const pads: Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const point = info.pondPoint(rand);
    const pad = new Mesh(LILY_GEOMETRY, materials.lilyPad);
    pad.position.set(point.x, info.waterLevel + 0.008, point.z);
    pad.rotation.y = rand() * Math.PI;
    pad.scale.setScalar(0.7 + rand() * 0.6);
    pads.push(pad);
    group.add(pad);
  }

  // Small stones floating alongside the island.
  const stones: FloatingStone[] = [];
  const stoneSpecs = [
    { radius: 9.6, angle: 2.5, baseY: -2.4, size: 0.3 },
    { radius: 10.4, angle: 5.6, baseY: -3.4, size: 0.24 },
    { radius: 9.2, angle: 4.3, baseY: -1.6, size: 0.27 },
  ];
  for (const spec of stoneSpecs) {
    const stoneGroup = new Group();
    const rock = new Mesh(BOULDER_GEOMETRY, materials.rock);
    rock.scale.set(spec.size, spec.size * 0.85, spec.size * 0.9);
    rock.rotation.set(spec.angle, spec.angle * 0.7, spec.angle * 0.4);
    rock.castShadow = true;
    const cap = new Mesh(GRASS_CAP_GEOMETRY, materials.leaf);
    cap.scale.set(spec.size * 0.85, 1, spec.size * 0.8);
    cap.position.y = spec.size * 0.42;
    cap.castShadow = true;
    stoneGroup.add(rock, cap);
    group.add(stoneGroup);
    stones.push({
      group: stoneGroup,
      radius: spec.radius,
      angle: spec.angle,
      baseY: spec.baseY,
      phase: rand() * Math.PI * 2,
      speed: 0.02 + rand() * 0.02,
    });
  }

  return {
    group,
    update(ctx: FrameContext) {
      for (const pad of pads) {
        pad.rotation.y += ctx.dt * 0.06 * (0.4 + ctx.wind);
      }

      for (const stone of stones) {
        if (!ctx.reducedMotion) {
          stone.angle += ctx.dt * stone.speed;
        }
        const bob = ctx.reducedMotion ? 0 : Math.sin(ctx.elapsed * 0.55 + stone.phase) * 0.16;
        stone.group.position.set(
          Math.cos(stone.angle) * stone.radius,
          stone.baseY + bob,
          Math.sin(stone.angle) * stone.radius,
        );
      }
    },
  };
}
