import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { makeRandom } from '../core/utils';
import { POND, edgeFactor, terrainHeight } from './terrain';

const PATH_TO_POND = [
  [1.42, 1.72],
  [1.86, 1.15],
  [1.9, 0.62],
  [1.86, 0.28],
];
const PATH_TO_MILL = [
  [1.42, 1.72],
  [0.72, 1.28],
  [-0.42, 0.55],
  [-1.55, -0.2],
  [-2.35, -0.62],
];

const CLEARINGS: [number, number, number][] = [
  [0.85, 1.05, 1.15],
  [-1.95, -1.45, 0.95],
  [POND.x, POND.z, POND.radius * 0.95],
];

function blocked(x: number, z: number, margin: number): boolean {
  for (const [cx, cz, r] of CLEARINGS) {
    if (Math.hypot(x - cx, z - cz) < r + margin) return true;
  }
  return false;
}

function buildPath(waypoints: number[][], width: number, seed: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    waypoints.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.4,
  );
  const samples = 46;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rand = makeRandom(seed);
  const worn = new THREE.Color(0xc2a077);
  const edge = new THREE.Color(0x6d8a4a);
  const tmp = new THREE.Color();

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const w = width * (0.82 + Math.sin(t * 9) * 0.12 + rand() * 0.1);
    for (let c = -1; c <= 1; c++) {
      const x = p.x + normal.x * w * c;
      const z = p.z + normal.z * w * c;
      positions.push(x, terrainHeight(x, z) + 0.016, z);
      tmp.copy(c === 0 ? worn : edge).offsetHSL(0, 0, (rand() - 0.5) * 0.05);
      colors.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < 2; c++) {
      const a = i * 3 + c;
      const b = a + 1;
      const d = a + 3;
      const e = d + 1;
      indices.push(a, d, e, a, e, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export interface Props {
  group: THREE.Group;
}

/** Path, fence and scattered boulders — the small evidence that people live here. */
export function createProps(): Props {
  const group = new THREE.Group();
  const rand = makeRandom(880311);

  const pathMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const path = new THREE.Mesh(buildPath(PATH_TO_POND, 0.42, 991), pathMat);
  path.receiveShadow = true;
  group.add(path);
  const pathToMill = new THREE.Mesh(buildPath(PATH_TO_MILL, 0.36, 992), pathMat);
  pathToMill.receiveShadow = true;
  group.add(pathToMill);

  // --- fence along the pond's outer bend -------------------------------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5c42, roughness: 0.95, flatShading: true });
  const fence = new THREE.Group();
  const fencePts: [number, number][] = [];
  for (let i = 0; i <= 7; i++) {
    const a = -0.45 + (i / 7) * 1.45;
    fencePts.push([2.6 + Math.cos(a) * 1.15, -1.15 + Math.sin(a) * 1.35]);
  }
  for (const [x, z] of fencePts) {
    if (blocked(x, z, 0.3) || edgeFactor(x, z) > 0.97) continue;
    const y = terrainHeight(x, z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), woodMat);
    post.position.set(x, y + 0.13, z);
    post.rotation.y = rand() * 0.4 - 0.2;
    post.castShadow = true;
    fence.add(post);
  }
  for (let i = 0; i < fencePts.length - 1; i++) {
    const [x1, z1] = fencePts[i];
    const [x2, z2] = fencePts[i + 1];
    if (blocked(x1, z1, 0.3) || blocked(x2, z2, 0.3)) continue;
    for (const h of [0.19, 0.28]) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), woodMat);
      rail.position.set((x1 + x2) / 2, (terrainHeight(x1, z1) + terrainHeight(x2, z2)) / 2 + h, (z1 + z2) / 2);
      rail.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      rail.castShadow = true;
      fence.add(rail);
    }
  }
  group.add(fence);

  // --- bench + woodpile -------------------------------------------------
  const bench = new THREE.Group();
  {
    const x = 2.0;
    const z = 1.35;
    const y = terrainHeight(x, z);
    bench.position.set(x, y, z);
    bench.rotation.y = -0.7;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.2), woodMat);
    plank.position.y = 0.16;
    bench.add(plank);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.04), woodMat);
    back.position.set(0, 0.26, -0.09);
    bench.add(back);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.16), woodMat);
      leg.position.set(sx * 0.24, 0.08, 0);
      bench.add(leg);
    }
  }
  bench.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      (o as THREE.Mesh).castShadow = true;
      (o as THREE.Mesh).receiveShadow = true;
    }
  });
  group.add(bench);

  const logMat = new THREE.MeshStandardMaterial({ color: 0x8a6742, roughness: 0.95, flatShading: true });
  const woodpile = new THREE.Group();
  {
    const x = -0.35;
    const z = 1.95;
    woodpile.position.set(x, terrainHeight(x, z), z);
    woodpile.rotation.y = 0.35;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - row; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 6), logMat);
        log.rotation.x = Math.PI / 2;
        log.position.set((i - (3 - row) / 2) * 0.11 + row * 0.055, 0.05 + row * 0.095, 0);
        log.castShadow = true;
        woodpile.add(log);
      }
    }
  }
  group.add(woodpile);

  // --- boulders ---------------------------------------------------------
  const rockMats = [
    new THREE.MeshStandardMaterial({ color: PALETTE.rock, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: PALETTE.rockDark, roughness: 1, flatShading: true }),
  ];
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  let placed = 0;
  let guard = 0;
  while (placed < 16 && guard < 600) {
    guard++;
    const a = rand() * Math.PI * 2;
    const r = 1.2 + Math.sqrt(rand()) * 3.3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (blocked(x, z, 0.35) || edgeFactor(x, z) > 0.95) continue;
    const size = 0.07 + rand() * 0.16;
    const rock = new THREE.Mesh(rockGeo, rockMats[placed % 2]);
    rock.position.set(x, terrainHeight(x, z) + size * 0.35, z);
    rock.scale.set(size, size * (0.6 + rand() * 0.4), size * (0.8 + rand() * 0.4));
    rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
    placed++;
  }

  return { group };
}
