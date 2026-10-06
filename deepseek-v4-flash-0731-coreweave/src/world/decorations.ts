import * as THREE from 'three';
import { mulberry32 } from '../utils/noise';
import {
  ISLAND_RADIUS,
  POND_POS,
  POND_RADIUS,
  HOUSE_POS,
  WINDMILL_POS,
  groundHeightAt,
} from './island';

/* ------------------------------------------------------------------ */
/* Clouds                                                              */
/* ------------------------------------------------------------------ */

export interface Clouds {
  group: THREE.Group;
  update: (dt: number, time: number, wind: number, weather: number, reduceMotion: boolean) => void;
}

interface CloudHandle {
  group: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
  baseY: number;
  phase: number;
}

export function createClouds(): Clouds {
  const group = new THREE.Group();
  const clouds: CloudHandle[] = [];

  const cloudMat = () =>
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: false });

  function makeCloud(scale: number, seed: number): CloudHandle {
    const g = new THREE.Group();
    const mats: THREE.MeshStandardMaterial[] = [];
    const r = mulberry32(seed);
    const puffs = 4 + Math.floor(r() * 3);
    for (let i = 0; i < puffs; i++) {
      const m = cloudMat();
      mats.push(m);
      const s = 0.7 + r() * 1.1;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s * scale, 10, 8), m);
      puff.position.set(
        (r() - 0.5) * 3.2 * scale,
        (r() - 0.5) * 0.5 * scale,
        (r() - 0.5) * 1.8 * scale
      );
      puff.scale.y = 0.55;
      g.add(puff);
    }
    const c: CloudHandle = { group: g, mats, baseY: 0, phase: r() * Math.PI * 2 };
    clouds.push(c);
    return c;
  }

  const positions: Array<[number, number, number, number]> = [
    [-18, 13.5, -9, 1.15],
    [-6, 11.5, 12, 0.9],
    [8, 14.5, -14, 1.3],
    [22, 12.5, 2, 1.05],
    [34, 15.5, -7, 0.85],
    [-32, 12.5, -18, 1.0],
    [15, 16.0, 20, 0.95],
    [-12, 17.5, -28, 1.25],
  ];
  for (const [x, y, z, s] of positions) {
    const c = makeCloud(s, Math.abs(x * 31 + z * 17) + 5);
    c.group.position.set(x, y, z);
    c.baseY = y;
    group.add(c.group);
  }

  const update: Clouds['update'] = (dt, time, wind, weather, reduceMotion) => {
    const speed = 0.5 + wind * 2.6 + weather * 0.6;
    const targetColor = new THREE.Color('#9aa3ad');
    for (const c of clouds) {
      c.group.position.x += speed * dt;
      if (c.group.position.x > 46) c.group.position.x -= 92;
      if (!reduceMotion) {
        c.group.position.y = c.baseY - weather * 1.6 + Math.sin(time * 0.35 + c.phase) * 0.55;
      } else {
        c.group.position.y = c.baseY - weather * 1.6;
      }
      for (const m of c.mats) {
        m.color.lerp(targetColor, Math.min(1, weather * 0.85));
      }
    }
  };

  return { group, update };
}

/* ------------------------------------------------------------------ */
/* Scatter: rocks, path, fence, grass tufts, flowers                   */
/* ------------------------------------------------------------------ */

export interface Scatter {
  group: THREE.Group;
  flowerSway: THREE.Group;
  update: (time: number, wind: number, reduceMotion: boolean) => void;
}

function stonePoints(): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const dirMill = new THREE.Vector2(
    WINDMILL_POS.x - HOUSE_POS.x,
    WINDMILL_POS.y - HOUSE_POS.y
  ).normalize();
  const dirPond = new THREE.Vector2(POND_POS.x - HOUSE_POS.x, POND_POS.y - HOUSE_POS.y).normalize();
  const perp = new THREE.Vector2(-dirMill.y, dirMill.x);

  const start = new THREE.Vector2(HOUSE_POS.x, HOUSE_POS.y).addScaledVector(dirMill, 1.9);
  const end = new THREE.Vector2(WINDMILL_POS.x, WINDMILL_POS.y).addScaledVector(
    dirMill.clone().negate(),
    1.5
  );
  const N = 8;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const p = start.clone().lerp(end, t);
    p.addScaledVector(perp, Math.sin(t * Math.PI) * 0.75);
    pts.push([p.x, p.y]);
  }
  const pondStart = new THREE.Vector2(HOUSE_POS.x, HOUSE_POS.y).addScaledVector(dirPond, 1.9);
  const pondEnd = new THREE.Vector2(POND_POS.x, POND_POS.y).addScaledVector(
    dirPond.clone().negate(),
    1.25
  );
  const M = 5;
  for (let i = 0; i < M; i++) {
    const t = i / (M - 1);
    const p = pondStart.clone().lerp(pondEnd, t);
    pts.push([p.x, p.y]);
  }
  return pts;
}

export function createScatter(): Scatter {
  const group = new THREE.Group();
  const rng = mulberry32(777);

  const stones = stonePoints();
  const stoneRadius = 0.3;

  // --- Path stones ------------------------------------------------------------
  const stoneGeo = new THREE.SphereGeometry(stoneRadius, 9, 7);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
  const stoneInst = new THREE.InstancedMesh(stoneGeo, stoneMat, stones.length);
  const dummy = new THREE.Object3D();
  const stoneColors = [new THREE.Color('#c9b593'), new THREE.Color('#b8a387'), new THREE.Color('#d4c2a6')];
  stones.forEach(([x, z], i) => {
    dummy.position.set(x, groundHeightAt(x, z) + stoneRadius * 0.34, z);
    dummy.scale.set(1, 0.36, 1);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    stoneInst.setMatrixAt(i, dummy.matrix);
    stoneInst.setColorAt(i, stoneColors[Math.floor(rng() * stoneColors.length)]);
  });
  stoneInst.instanceMatrix.needsUpdate = true;
  if (stoneInst.instanceColor) stoneInst.instanceColor.needsUpdate = true;
  stoneInst.receiveShadow = true;
  group.add(stoneInst);

  // --- Rim rocks ----------------------------------------------------------------
  const rockMat = new THREE.MeshStandardMaterial({ color: '#8d8074', roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = 5.6 + rng() * 1.1;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (Math.hypot(x - POND_POS.x, z - POND_POS.y) < 2.4) continue;
    const s = 0.3 + rng() * 0.45;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(x, groundHeightAt(x, z) + s * 0.18, z);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    rock.scale.y = 0.62;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // --- Fence along the north-east rim --------------------------------------------
  const postMat = new THREE.MeshStandardMaterial({ color: '#7b5c40', roughness: 0.95 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#8a6a4c', roughness: 0.95 });
  const postGeo = new THREE.BoxGeometry(0.1, 0.55, 0.1);
  const posts: THREE.Vector3[] = [];
  const a0 = -0.35;
  const a1 = 1.15;
  const SEG = 9;
  for (let i = 0; i < SEG; i++) {
    const a = a0 + ((a1 - a0) * i) / (SEG - 1);
    const x = Math.cos(a) * 6.45;
    const z = Math.sin(a) * 6.45;
    posts.push(new THREE.Vector3(x, groundHeightAt(x, z), z));
  }
  for (const p of posts) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(p.x, p.y + 0.27, p.z);
    post.castShadow = true;
    group.add(post);
  }
  for (let i = 0; i < SEG - 1; i++) {
    const a = posts[i];
    const b = posts[i + 1];
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    for (const h of [0.34, 0.52]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.05), railMat);
      rail.position.set(mid.x, mid.y + h, mid.z);
      rail.quaternion.copy(quat);
      rail.castShadow = true;
      group.add(rail);
    }
  }

  // --- Grass tufts ----------------------------------------------------------------
  const tuftColors = [new THREE.Color('#4f8a44'), new THREE.Color('#3f7a3c')];
  const tuftGeo = new THREE.ConeGeometry(0.11, 0.42, 6);
  const tufts: THREE.InstancedMesh[] = [];
  const TUFT_COUNT = 26;
  for (const color of tuftColors) {
    const mesh = new THREE.InstancedMesh(
      tuftGeo,
      new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
      TUFT_COUNT
    );
    group.add(mesh);
    tufts.push(mesh);
  }
  function guardOk(x: number, z: number): boolean {
    if (Math.hypot(x, z) > ISLAND_RADIUS - 0.4) return false;
    if (Math.hypot(x - POND_POS.x, z - POND_POS.y) < POND_RADIUS + 0.9) return false;
    if (Math.hypot(x - HOUSE_POS.x, z - HOUSE_POS.y) < 2.2) return false;
    if (Math.hypot(x - WINDMILL_POS.x, z - WINDMILL_POS.y) < 1.7) return false;
    for (const [sx, sz] of stones) {
      if (Math.hypot(x - sx, z - sz) < 0.65) return false;
    }
    return true;
  }
  for (const mesh of tufts) {
    for (let i = 0; i < TUFT_COUNT; i++) {
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 12; tries++) {
        x = (rng() * 2 - 1) * (ISLAND_RADIUS - 0.6);
        z = (rng() * 2 - 1) * (ISLAND_RADIUS - 0.6);
        if (guardOk(x, z)) break;
      }
      if (!guardOk(x, z)) {
        dummy.scale.setScalar(0.0001);
      } else {
        dummy.scale.set(0.75 + rng() * 0.7, 0.7 + rng() * 0.8, 0.75 + rng() * 0.7);
        dummy.rotation.set(rng() * 0.2, rng() * Math.PI * 2, rng() * 0.2);
      }
      dummy.position.set(x, groundHeightAt(x, z) + 0.16, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
  }

  // --- Flowers ----------------------------------------------------------------------
  const flowerSway = new THREE.Group();
  flowerSway.position.y = 0.85;
  group.add(flowerSway);
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.34, 5);
  const headGeo = new THREE.SphereGeometry(0.075, 7, 6);
  const flowerColors: Array<[string, number]> = [
    ['#f7dfe8', 11],
    ['#fff2cc', 10],
    ['#ffd9a8', 10],
  ];
  for (const [hex, count] of flowerColors) {
    const stem = new THREE.InstancedMesh(
      stemGeo,
      new THREE.MeshStandardMaterial({ color: '#4f8a44', roughness: 1 }),
      count
    );
    const head = new THREE.InstancedMesh(
      headGeo,
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85 }),
      count
    );
    flowerSway.add(stem);
    flowerSway.add(head);
    for (let i = 0; i < count; i++) {
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 12; tries++) {
        x = (rng() * 2 - 1) * (ISLAND_RADIUS - 0.8);
        z = (rng() * 2 - 1) * (ISLAND_RADIUS - 0.8);
        if (guardOk(x, z)) break;
      }
      const y = groundHeightAt(x, z);
      dummy.position.set(x, y + 0.17, z);
      dummy.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5);
      dummy.scale.setScalar(0.7 + rng() * 0.6);
      dummy.updateMatrix();
      stem.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.39;
      dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);
    }
    stem.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
  }

  const update = (time: number, wind: number, reduceMotion: boolean): void => {
    if (reduceMotion) {
      flowerSway.rotation.z = 0;
      return;
    }
    flowerSway.rotation.z = Math.sin(time * 1.1) * wind * 0.04;
  };

  return { group, flowerSway, update };
}