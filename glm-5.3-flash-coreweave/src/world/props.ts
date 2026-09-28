import * as THREE from 'three';
import type { WorldPiece } from '../state';
import { M } from '../materials';
import { rng } from '../util';
import { makeBoulder } from './trees';

/** Stepping-stone path, a fence arc, flower clusters and scattered boulders. */
export function createProps(): WorldPiece {
  const group = new THREE.Group();

  // ---- path: house door → windmill --------------------------------------------
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.05, 0, -0.15),
    new THREE.Vector3(-0.6, 0, 0.35),
    new THREE.Vector3(1.2, 0, -0.2),
    new THREE.Vector3(2.6, 0, -0.9),
    new THREE.Vector3(2.95, 0, -1.2),
  ]);
  const stoneGeo = new THREE.SphereGeometry(1, 7, 6);
  const pts = curve.getSpacedPoints(15);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const stone = new THREE.Mesh(stoneGeo, i % 2 === 0 ? M.stone : M.stoneDark);
    stone.scale.set(0.16 + rng() * 0.09, 0.045, 0.13 + rng() * 0.07);
    stone.position.set(p.x + (rng() - 0.5) * 0.06, 0.02, p.z + (rng() - 0.5) * 0.06);
    stone.rotation.y = rng() * Math.PI;
    stone.receiveShadow = true;
    stone.castShadow = true;
    group.add(stone);
  }

  // ---- fence arc along the north-west rim ---------------------------------------
  const R = 6.35;
  const a0 = 1.95;
  const a1 = 2.85;
  const N = 8;
  const postGeo = new THREE.BoxGeometry(0.075, 0.42, 0.075);
  const railGeo = new THREE.BoxGeometry(1, 0.045, 0.05);
  const posts: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const a = a0 + ((a1 - a0) * i) / (N - 1);
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    posts.push(new THREE.Vector3(x, 0, z));
    const post = new THREE.Mesh(postGeo, M.woodDark);
    post.position.set(x, 0.21, z);
    post.rotation.y = -a;
    post.castShadow = true;
    group.add(post);
  }
  for (let i = 0; i < N - 1; i++) {
    const p0 = posts[i];
    const p1 = posts[i + 1];
    const len = p0.distanceTo(p1);
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    for (const y of [0.14, 0.3]) {
      const rail = new THREE.Mesh(railGeo, M.wood);
      rail.scale.x = len;
      rail.position.set((p0.x + p1.x) / 2, y, (p0.z + p1.z) / 2);
      rail.rotation.y = -Math.atan2(dz, dx);
      rail.castShadow = true;
      group.add(rail);
    }
  }

  // ---- flowers ------------------------------------------------------------------
  const stemGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.16, 5);
  const headGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const headMats = [
    new THREE.MeshStandardMaterial({ color: '#e2688c', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#eec95e', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#e87b4a', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#f2eee2', roughness: 0.8 }),
  ];
  const clusters: Array<[number, number]> = [
    [-1.75, 0.35],
    [0.5, 1.5],
  ];
  for (const [cx, cz] of clusters) {
    for (let i = 0; i < 6; i++) {
      const x = cx + (rng() - 0.5) * 0.9;
      const z = cz + (rng() - 0.5) * 0.9;
      const stem = new THREE.Mesh(stemGeo, M.leaf2);
      stem.position.set(x, 0.08, z);
      const head = new THREE.Mesh(headGeo, headMats[Math.floor(rng() * headMats.length)]);
      head.position.set(x, 0.18, z);
      head.castShadow = true;
      group.add(stem, head);
    }
  }

  // ---- boulders ------------------------------------------------------------------
  const rockSpecs: Array<[number, number, number, number]> = [
    [-5.6, 2.4, 0.5, 71],
    [-2.9, 4.4, 0.65, 73],
    [6.0, 1.5, 0.45, 79],
    [2.9, -4.0, 0.55, 83],
  ];
  for (const [x, z, s, seed] of rockSpecs) {
    const rock = makeBoulder(s, seed);
    rock.position.set(x, s * 0.45, z);
    rock.rotation.y = rng() * Math.PI;
    group.add(rock);
  }

  return { group };
}
