import * as THREE from "three";
import { mulberry32 } from "../util";
import { BENCH, FENCE, HOUSE, POND, ROCKS, WINDMILL } from "./layout";
import { insideIsland, islandRadius, surfaceHeight } from "./island";
import type { Materials } from "./materials";

export function createProps(materials: Materials, tuftCount: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "props";
  const pathPoints = addPath(group, materials);
  addFence(group, materials);
  addFlowers(group, materials);
  addRocks(group, materials);
  addBench(group, materials);
  addMushrooms(group, materials);
  addTufts(group, materials, tuftCount, pathPoints);
  return group;
}

function addPath(group: THREE.Group, materials: Materials): THREE.Vector3[] {
  const door = new THREE.Vector3(0.1, 0, 0.9);
  door.applyAxisAngle(new THREE.Vector3(0, 1, 0), HOUSE.rotation);
  const start = new THREE.Vector3(HOUSE.x + door.x, 0, HOUSE.z + door.z);
  const end = new THREE.Vector3(POND.x + POND.rx * 0.55, 0, POND.z + 0.12);
  const mid = new THREE.Vector3(start.x * 0.45 + end.x * 0.55, 0, Math.max(start.z, end.z) + 0.22);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const geometry = new THREE.CylinderGeometry(0.13, 0.15, 0.045, 7);
  const points: THREE.Vector3[] = [];
  const count = 11;
  for (let i = 0; i < count; i += 1) {
    const t = 0.06 + (i / (count - 1)) * 0.9;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const stone = new THREE.Mesh(geometry, materials.stone);
    const wobble = 1 + ((i % 3) - 1) * 0.08;
    stone.scale.set(wobble, 1, 0.72);
    stone.rotation.y = Math.atan2(tangent.x, tangent.z);
    stone.position.set(point.x, surfaceHeight(point.x, point.z) - 0.005, point.z);
    stone.receiveShadow = true;
    stone.castShadow = false;
    group.add(stone);
    points.push(point);
  }
  return points;
}

function addFence(group: THREE.Group, materials: Materials): void {
  const postGeo = new THREE.BoxGeometry(0.055, 0.5, 0.055);
  const posts: THREE.Vector3[] = [];
  for (const [x, z] of FENCE) {
    if (!insideIsland(x, z, 0.05)) continue;
    const post = new THREE.Mesh(postGeo, materials.wood);
    const y = surfaceHeight(x, z);
    post.position.set(x, y + 0.23, z);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
    posts.push(new THREE.Vector3(x, y, z));
  }
  for (let i = 0; i < posts.length - 1; i += 1) {
    const a = posts[i];
    const b = posts[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const railGeo = new THREE.BoxGeometry(0.028, 0.032, length);
    for (const height of [0.18, 0.34]) {
      const rail = new THREE.Mesh(railGeo, materials.wood);
      rail.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + height, (a.z + b.z) / 2);
      rail.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      rail.castShadow = true;
      rail.receiveShadow = true;
      group.add(rail);
    }
  }
}

function addFlowers(group: THREE.Group, materials: Materials): void {
  const clusters = [
    { x: 1.12, z: 0.78, n: 5, seed: 2 },
    { x: 0.82, z: 0.95, n: 4, seed: 5 },
    { x: -0.42, z: 0.72, n: 4, seed: 8 },
    { x: -1.5, z: 0.02, n: 3, seed: 11 },
    { x: 1.2, z: -0.22, n: 3, seed: 14 },
  ];
  const colors = ["#e7b1a2", "#f0d48a", "#d5c0e4", "#f7f3ea"];
  const spots: Array<{ x: number; z: number; color: THREE.Color }> = [];
  for (const cluster of clusters) {
    const rand = mulberry32(cluster.seed);
    for (let i = 0; i < cluster.n; i += 1) {
      const x = cluster.x + (rand() - 0.5) * 0.28;
      const z = cluster.z + (rand() - 0.5) * 0.28;
      if (!insideIsland(x, z, 0.2) || blocked(x, z)) continue;
      spots.push({ x, z, color: new THREE.Color(colors[i % colors.length]) });
    }
  }
  if (spots.length === 0) return;

  const stemGeo = new THREE.CylinderGeometry(0.01, 0.014, 0.12, 5);
  stemGeo.translate(0, 0.06, 0);
  const headGeo = new THREE.SphereGeometry(0.042, 8, 6);
  const centerGeo = new THREE.SphereGeometry(0.016, 6, 5);
  const stems = new THREE.InstancedMesh(stemGeo, materials.stem, spots.length);
  const heads = new THREE.InstancedMesh(headGeo, materials.flower, spots.length);
  const centers = new THREE.InstancedMesh(
    centerGeo,
    new THREE.MeshStandardMaterial({ color: "#c9893a", roughness: 0.5, metalness: 0 }),
    spots.length,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < spots.length; i += 1) {
    const spot = spots[i];
    const y = surfaceHeight(spot.x, spot.z);
    dummy.position.set(spot.x, y, spot.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 0.12;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, spot.color);
    dummy.position.y = y + 0.145;
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    centers.setMatrixAt(i, dummy.matrix);
  }
  stems.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  for (const mesh of [stems, heads, centers]) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function addRocks(group: THREE.Group, materials: Materials): void {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  for (const rock of ROCKS) {
    if (!insideIsland(rock.x, rock.z, 0.02)) continue;
    const mesh = new THREE.Mesh(geometry, materials.rockChunk);
    mesh.scale.set(rock.s, rock.s * 0.72, rock.s * 0.9);
    mesh.position.set(rock.x, surfaceHeight(rock.x, rock.z) - rock.s * 0.22, rock.z);
    mesh.rotation.set(rock.yaw * 0.4, rock.yaw, rock.s);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function addBench(group: THREE.Group, materials: Materials): void {
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.16), materials.wood);
  seat.position.y = 0.22;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.03), materials.wood);
  back.position.set(0, 0.32, -0.065);
  const legGeo = new THREE.BoxGeometry(0.04, 0.22, 0.14);
  const left = new THREE.Mesh(legGeo, materials.woodDark);
  left.position.set(-0.18, 0.11, 0);
  const right = new THREE.Mesh(legGeo, materials.woodDark);
  right.position.set(0.18, 0.11, 0);
  bench.add(seat, back, left, right);
  bench.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  bench.position.set(BENCH.x, surfaceHeight(BENCH.x, BENCH.z), BENCH.z);
  bench.rotation.y = Math.atan2(POND.x - BENCH.x, POND.z - BENCH.z);
  group.add(bench);
}

function addMushrooms(group: THREE.Group, materials: Materials): void {
  const spots = [
    { x: 1.86, z: -0.18, s: 1, color: "#c46a4a" },
    { x: 1.72, z: -0.02, s: 0.75, color: "#e6d3ae" },
    { x: 1.96, z: -0.34, s: 0.62, color: "#c46a4a" },
  ];
  const stemGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.07, 6);
  for (const spot of spots) {
    if (!insideIsland(spot.x, spot.z, 0.08)) continue;
    const mushroom = new THREE.Group();
    const stem = new THREE.Mesh(stemGeo, materials.woodLight);
    stem.position.y = 0.035;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      new THREE.MeshStandardMaterial({ color: spot.color, roughness: 0.7, metalness: 0 }),
    );
    cap.scale.y = 0.55;
    cap.position.y = 0.075;
    mushroom.add(stem, cap);
    mushroom.scale.setScalar(spot.s);
    mushroom.position.set(spot.x, surfaceHeight(spot.x, spot.z), spot.z);
    group.add(mushroom);
  }
}

function addTufts(group: THREE.Group, materials: Materials, count: number, path: THREE.Vector3[]): void {
  const rand = mulberry32(21);
  const spots: Array<{ x: number; z: number; h: number; s: number; yaw: number; color: THREE.Color }> = [];
  const light = new THREE.Color("#8fb56a");
  const mid = new THREE.Color("#6a9448");
  const dark = new THREE.Color("#4d7636");
  let guard = 0;
  while (spots.length < count && guard < count * 40) {
    guard += 1;
    const theta = rand() * Math.PI * 2;
    const reach = islandRadius(theta);
    const radius = (0.55 + rand() * 0.38) * reach;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const edge = Math.hypot(x, z) / reach;
    if (edge < 0.5 || edge > 0.9) continue;
    if (!insideIsland(x, z, 0.12) || blocked(x, z) || nearPath(x, z, path)) continue;
    const choice = rand();
    const color = choice < 0.33 ? light : choice < 0.75 ? mid : dark;
    spots.push({ x, z, h: 0.055 + rand() * 0.07, s: 0.8 + rand() * 0.9, yaw: rand() * Math.PI, color });
  }
  if (spots.length === 0) return;
  const geometry = new THREE.ConeGeometry(0.045, 0.1, 5);
  const tufts = new THREE.InstancedMesh(geometry, materials.tuft, spots.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < spots.length; i += 1) {
    const spot = spots[i];
    const heightScale = spot.h / 0.1;
    dummy.position.set(spot.x, surfaceHeight(spot.x, spot.z) + spot.h * 0.5 - 0.01, spot.z);
    dummy.rotation.set(0, spot.yaw, 0);
    dummy.scale.set(spot.s, heightScale, spot.s);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, spot.color);
  }
  tufts.instanceMatrix.needsUpdate = true;
  if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  tufts.castShadow = false;
  tufts.receiveShadow = true;
  group.add(tufts);
}

function blocked(x: number, z: number): boolean {
  const house = (x - HOUSE.x) ** 2 + (z - HOUSE.z) ** 2;
  if (house < 0.95 ** 2) return true;
  const px = (x - POND.x) / (POND.rx * 1.15);
  const pz = (z - POND.z) / (POND.rz * 1.15);
  if (px * px + pz * pz < 1) return true;
  const mill = (x - WINDMILL.x) ** 2 + (z - WINDMILL.z) ** 2;
  return mill < 0.42 ** 2;
}

function nearPath(x: number, z: number, path: THREE.Vector3[]): boolean {
  for (const point of path) {
    const dx = x - point.x;
    const dz = z - point.z;
    if (dx * dx + dz * dz < 0.2 ** 2) return true;
  }
  return false;
}
