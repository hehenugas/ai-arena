import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { makeRandom } from '../core/utils';
import { POND, fitsOnIsland, terrainHeight } from './terrain';

interface Swayer {
  node: THREE.Object3D;
  phase: number;
  stiffness: number;
  axis: number;
}

const BROADLEAF: [number, number, number][] = [
  [-2.85, 0.95, 1.0],
  [-2.25, 2.05, 0.82],
  [-3.35, -0.35, 0.68],
  [2.95, 1.05, 0.74],
  [3.15, 2.15, 0.6],
];
const CONIFER: [number, number, number][] = [
  [-1.15, 3.15, 0.95],
  [2.35, 2.85, 0.8],
  [-3.1, 1.95, 0.72],
  [0.35, -3.15, 0.66],
];
const BUSHES: [number, number, number][] = [
  [1.95, 0.15, 0.9],
  [-0.55, 1.6, 0.7],
  [2.6, -0.35, 0.8],
  [-1.75, 0.25, 0.65],
  [0.6, 2.5, 0.6],
];

export interface Vegetation {
  group: THREE.Group;
  update(elapsed: number, wind: number, motion: number): void;
}

export function createVegetation(): Vegetation {
  const group = new THREE.Group();
  const rand = makeRandom(20240917);
  const swayers: Swayer[] = [];

  const bark = new THREE.MeshStandardMaterial({ color: PALETTE.timberDark, roughness: 1, flatShading: true });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: PALETTE.leafA, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: PALETTE.leafB, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: PALETTE.leafC, roughness: 0.95, flatShading: true }),
  ];
  const coniferMat = new THREE.MeshStandardMaterial({
    color: PALETTE.conifer,
    roughness: 0.95,
    flatShading: true,
  });
  const blobGeo = new THREE.IcosahedronGeometry(1, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 7);

  const shadowed = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  };

  const makeBroadleaf = (x: number, z: number, scale: number) => {
    const tree = new THREE.Group();
    tree.position.set(x, terrainHeight(x, z) - 0.05, z);
    tree.rotation.y = rand() * Math.PI * 2;

    const trunkH = 0.5 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.085 * scale, trunkH, 7), bark);
    trunk.position.y = trunkH / 2;
    trunk.rotation.z = (rand() - 0.5) * 0.12;
    shadowed(trunk);
    tree.add(trunk);

    const canopy = new THREE.Group();
    canopy.position.y = trunkH;
    const blobs = 4 + Math.floor(rand() * 2);
    for (let i = 0; i < blobs; i++) {
      const r = (0.2 + rand() * 0.13) * scale;
      const blob = new THREE.Mesh(blobGeo, leafMats[Math.floor(rand() * leafMats.length)]);
      const a = (i / blobs) * Math.PI * 2 + rand();
      const spread = 0.16 * scale * rand();
      blob.position.set(Math.cos(a) * spread, 0.1 * scale + rand() * 0.22 * scale, Math.sin(a) * spread);
      blob.scale.set(r, r * 0.86, r);
      shadowed(blob);
      canopy.add(blob);
    }
    tree.add(canopy);
    group.add(tree);
    swayers.push({ node: tree, phase: rand() * 6.28, stiffness: 1, axis: rand() * 0.6 });
  };

  const makeConifer = (x: number, z: number, scale: number) => {
    const tree = new THREE.Group();
    tree.position.set(x, terrainHeight(x, z) - 0.04, z);
    tree.rotation.y = rand() * Math.PI * 2;

    const trunkH = 0.22 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, trunkH, 6), bark);
    trunk.position.y = trunkH / 2;
    shadowed(trunk);
    tree.add(trunk);

    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      const r = (0.34 - t * 0.16) * scale;
      const h = (0.52 - t * 0.12) * scale;
      const cone = new THREE.Mesh(coneGeo, coniferMat);
      cone.position.y = trunkH + t * 0.3 * scale + h / 2;
      cone.scale.set(r, h, r);
      cone.rotation.y = rand() * 2;
      shadowed(cone);
      tree.add(cone);
    }
    group.add(tree);
    swayers.push({ node: tree, phase: rand() * 6.28, stiffness: 0.6, axis: rand() * 0.4 });
  };

  const makeBush = (x: number, z: number, scale: number) => {
    const bush = new THREE.Group();
    bush.position.set(x, terrainHeight(x, z) - 0.03, z);
    for (let i = 0; i < 3; i++) {
      const r = (0.1 + rand() * 0.07) * scale;
      const blob = new THREE.Mesh(blobGeo, leafMats[Math.floor(rand() * leafMats.length)]);
      blob.position.set((rand() - 0.5) * 0.2 * scale, r * 0.75, (rand() - 0.5) * 0.2 * scale);
      blob.scale.set(r, r * 0.8, r);
      shadowed(blob);
      bush.add(blob);
    }
    group.add(bush);
    swayers.push({ node: bush, phase: rand() * 6.28, stiffness: 1.5, axis: rand() * 0.3 });
  };

  for (const [x, z, s] of BROADLEAF) if (fitsOnIsland(x, z, 0.6)) makeBroadleaf(x, z, s);
  for (const [x, z, s] of CONIFER) if (fitsOnIsland(x, z, 0.6)) makeConifer(x, z, s);
  for (const [x, z, s] of BUSHES) if (fitsOnIsland(x, z, 0.4)) makeBush(x, z, s);

  // --- grass tufts + wildflowers (instanced, placed once) ---------------
  const tuftGeo = new THREE.ConeGeometry(0.035, 0.055, 5);
  tuftGeo.translate(0, 0.026, 0);
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const TUFTS = 200;
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, TUFTS);
  tufts.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  let guard = 0;
  while (placed < TUFTS && guard < TUFTS * 12) {
    guard++;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 4.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!fitsOnIsland(x, z, 0.25)) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius * 0.85) continue;
    dummy.position.set(x, terrainHeight(x, z) - 0.01, z);
    dummy.rotation.set((rand() - 0.5) * 0.3, rand() * 6.28, (rand() - 0.5) * 0.3);
    dummy.scale.setScalar(0.7 + rand() * 0.8);
    dummy.updateMatrix();
    tufts.setMatrixAt(placed, dummy.matrix);
    color.setHSL(0.23 + rand() * 0.05, 0.36 + rand() * 0.14, 0.3 + rand() * 0.14);
    tufts.setColorAt(placed, color);
    placed++;
  }
  tufts.count = placed;
  tufts.instanceMatrix.needsUpdate = true;
  if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  group.add(tufts);

  const flowerGeo = new THREE.IcosahedronGeometry(0.022, 0);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: true });
  const FLOWERS = 70;
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, FLOWERS);
  const petal = [PALETTE.flowerA, PALETTE.flowerB, PALETTE.flowerC];
  let fPlaced = 0;
  guard = 0;
  while (fPlaced < FLOWERS && guard < FLOWERS * 20) {
    guard++;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 4.1;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!fitsOnIsland(x, z, 0.2)) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius * 0.9) continue;
    dummy.position.set(x, terrainHeight(x, z) + 0.06, z);
    dummy.rotation.set(rand(), rand() * 6.28, rand());
    dummy.scale.setScalar(0.8 + rand() * 0.6);
    dummy.updateMatrix();
    flowers.setMatrixAt(fPlaced, dummy.matrix);
    color.setHex(petal[Math.floor(rand() * petal.length)]);
    flowers.setColorAt(fPlaced, color);
    fPlaced++;
  }
  flowers.count = fPlaced;
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  group.add(flowers);

  return {
    group,
    update(elapsed: number, wind: number, motion: number) {
      const gust = 0.78 + 0.22 * Math.sin(elapsed * 0.55);
      const amp = wind * gust * motion;
      for (const s of swayers) {
        const a = amp * 0.055 * s.stiffness;
        s.node.rotation.z = Math.sin(elapsed * 1.25 + s.phase) * a;
        s.node.rotation.x = Math.cos(elapsed * 0.95 + s.phase * 1.7) * a * (0.5 + s.axis);
      }
    },
  };
}

