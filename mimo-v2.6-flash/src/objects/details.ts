import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import {
  FENCE,
  FLOWER_CLUSTERS,
  PATH_POINTS,
  ROCKS,
} from './layout';
import { grassHeight, islandRadius } from './island';
import { getTextures, variant } from '../textureSet';
import { DEG, mulberry32, TAU } from '../utils';

const FLOWER_COLORS = ['#f4e9cf', '#f0c14b', '#e58fa4', '#cfe0f0', '#e9dcc0'];

export interface Details {
  group: Group;
  update(t: number, wind: number, motion: number): void;
}

export function createDetails(): Details {
  const { wood, mottle } = getTextures();
  const group = new Group();
  group.name = 'details';
  const swayNodes: Array<{ node: Object3D; phase: number }> = [];

  // ---- stepping-stone path -------------------------------------------------
  const stoneMat = new MeshStandardMaterial({
    color: '#cfc7b8',
    map: variant(mottle, 0.9, 0.9),
    roughness: 0.95,
  });
  const stoneGeo = new CylinderGeometry(0.33, 0.36, 0.11, 7);
  const curve = new CatmullRomCurve3(
    PATH_POINTS.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.4,
  );
  const randPath = mulberry32(5150);
  const stones = 9;
  for (let i = 0; i < stones; i++) {
    const p = curve.getPoint(i / (stones - 1));
    const lateral = (i % 2 === 0 ? 1 : -1) * (0.1 + randPath() * 0.06);
    const tangent = curve.getTangent(i / (stones - 1));
    const nx = -tangent.z;
    const nz = tangent.x;
    const x = p.x + nx * lateral;
    const z = p.z + nz * lateral;
    const stone = new Mesh(stoneGeo, stoneMat);
    stone.position.set(x, grassHeight(x, z) + 0.015, z);
    stone.rotation.y = randPath() * TAU;
    stone.scale.set(0.85 + randPath() * 0.3, 1, 0.85 + randPath() * 0.3);
    stone.receiveShadow = true;
    group.add(stone);
  }

  // ---- fence along the back edge ------------------------------------------
  const fenceMat = new MeshStandardMaterial({
    color: '#9a7150',
    map: variant(wood, 2, 2),
    roughness: 0.85,
  });
  const postGeo = new BoxGeometry(0.1, 0.66, 0.1);
  const fence = new Group();
  fence.name = 'fence';
  const posts: Vector3[] = [];
  for (let i = 0; i < FENCE.posts; i++) {
    const k = i / (FENCE.posts - 1);
    const deg = FENCE.startDeg + (FENCE.endDeg - FENCE.startDeg) * k;
    const a = deg * DEG;
    const r = islandRadius(a) * FENCE.radiusFactor;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = grassHeight(x, z);
    const post = new Mesh(postGeo, fenceMat);
    post.position.set(x, y + 0.28, z);
    post.rotation.y = -a;
    post.castShadow = true;
    fence.add(post);
    posts.push(new Vector3(x, y + 0.42, z));
    posts.push(new Vector3(x, y + 0.2, z));
  }
  // Rails between consecutive posts (two heights)
  for (let i = 0; i < FENCE.posts - 1; i++) {
    for (let h = 0; h < 2; h++) {
      const a = posts[i * 2 + h];
      const b = posts[(i + 1) * 2 + h];
      const len = a.distanceTo(b);
      const rail = new Mesh(new BoxGeometry(0.05, 0.06, len + 0.04), fenceMat);
      rail.position.copy(a).add(b).multiplyScalar(0.5);
      rail.lookAt(b);
      rail.castShadow = true;
      fence.add(rail);
    }
  }
  group.add(fence);

  // ---- scattered rocks -----------------------------------------------------
  const rockGeo = new IcosahedronGeometry(1, 0);
  const rockMat = new MeshStandardMaterial({
    color: '#948778',
    roughness: 0.95,
    flatShading: true,
  });
  for (const spec of ROCKS) {
    const rock = new Mesh(rockGeo, rockMat);
    rock.position.set(spec.x, grassHeight(spec.x, spec.z) + spec.s * 0.32, spec.z);
    rock.scale.set(spec.s, spec.s * 0.72, spec.s * 0.9);
    rock.rotation.set(spec.seed * 0.9, spec.seed * 1.7, spec.seed * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // ---- flowers -------------------------------------------------------------
  const stemGeo = new CylinderGeometry(0.014, 0.02, 0.2, 5);
  const headGeo = new IcosahedronGeometry(0.058, 0);
  const stemMat = new MeshStandardMaterial({ color: '#5f8f52', roughness: 0.9 });
  const headMats = FLOWER_COLORS.map(
    (c) => new MeshStandardMaterial({ color: c, roughness: 0.7 }),
  );
  const randFlower = mulberry32(31337);
  for (const cluster of FLOWER_CLUSTERS) {
    for (let i = 0; i < cluster.count; i++) {
      const a = randFlower() * TAU;
      const r = Math.sqrt(randFlower()) * cluster.spread;
      const x = cluster.x + Math.cos(a) * r;
      const z = cluster.z + Math.sin(a) * r;
      const y = grassHeight(x, z);
      const node = new Group();
      node.position.set(x, y, z);
      const stem = new Mesh(stemGeo, stemMat);
      stem.position.y = 0.1;
      node.add(stem);
      const head = new Mesh(headGeo, headMats[Math.floor(randFlower() * headMats.length)]);
      head.position.y = 0.22;
      head.scale.setScalar(0.8 + randFlower() * 0.5);
      node.add(head);
      group.add(node);
      swayNodes.push({ node, phase: randFlower() * TAU });
    }
  }

  const update = (t: number, wind: number, motion: number): void => {
    const amp = (0.03 + 0.07 * wind) * motion;
    for (const { node, phase } of swayNodes) {
      node.rotation.z = Math.sin(t * 2.1 + phase) * amp;
      node.rotation.x = Math.sin(t * 1.7 + phase * 1.3) * amp * 0.7;
    }
  };

  return { group, update };
}
