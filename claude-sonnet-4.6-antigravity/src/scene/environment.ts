// Clouds, rocks, fence, flowers, path — environmental details
import * as THREE from 'three';

export interface CloudObject {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  phase: number;
}

// Reusable material for clouds
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf8f6f2, transparent: true, opacity: 0.88 });

function makeCloudPuff(): THREE.Group {
  const g = new THREE.Group();
  const offsets: [number, number, number, number][] = [
    [0, 0, 0, 1.1],
    [0.9, -0.2, 0.2, 0.85],
    [-0.8, -0.15, 0.1, 0.8],
    [0.4, 0.25, -0.3, 0.72],
    [-0.35, 0.2, 0.4, 0.68],
    [0, -0.1, -0.7, 0.75],
  ];
  for (const [ox, oy, oz, os] of offsets) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(os, 7, 5),
      cloudMat
    );
    sphere.position.set(ox, oy, oz);
    sphere.scale.y = 0.6;
    g.add(sphere);
  }
  return g;
}

export function createClouds(): CloudObject[] {
  const configs: [number, number, number, number, number][] = [
    [12, 14, -5, 0.8, 0.0],
    [-10, 16, 3, 1.0, 1.5],
    [5, 18, -12, 0.7, 3.0],
    [-6, 13, -8, 0.9, 4.5],
    [14, 15, 8, 0.6, 2.2],
  ];
  return configs.map(([x, y, z, speed, phase]) => {
    const cloud = makeCloudPuff();
    cloud.position.set(x, y, z);
    return { group: cloud, baseX: x, baseY: y, baseZ: z, speed, phase };
  });
}

// Decorative rocks on island
export function createRocks(): THREE.Group {
  const g = new THREE.Group();
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a8078 });
  const rockMat2 = new THREE.MeshLambertMaterial({ color: 0x7a7070 });
  const configs: [number, number, number, number, number][] = [
    [3.2, 0.8, -3.5, 0.35, 0.4],
    [-2.5, 0.8, -4.2, 0.28, 0.3],
    [5.5, 0.8, -0.5, 0.22, 0.35],
    [-6.0, 0.8, 0.2, 0.30, 0.4],
    [1.8, 0.8, 5.0, 0.20, 0.25],
  ];
  for (const [rx, ry, rz, rs, ry2] of configs) {
    const geo = new THREE.IcosahedronGeometry(rs, 1);
    const mesh = new THREE.Mesh(geo, Math.random() > 0.5 ? rockMat : rockMat2);
    mesh.position.set(rx, ry, rz);
    mesh.scale.y = ry2 / rs;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.castShadow = true;
    g.add(mesh);
  }
  return g;
}

// Simple wooden fence posts + rails
export function createFence(): THREE.Group {
  const g = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0xc8a870 });

  const posts: [number, number][] = [
    [-5.5, -2.5], [-4.5, -2.8], [-3.5, -3.0], [-2.5, -3.2],
    [-1.5, -3.3], [-0.5, -3.2], [0.5, -3.1], [1.5, -2.9],
    [2.5, -2.6], [3.5, -2.2],
  ];
  for (let i = 0; i < posts.length; i++) {
    const [px, pz] = posts[i];
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.55, 0.1),
      postMat
    );
    post.position.set(px, 1.05, pz);
    post.castShadow = true;
    g.add(post);

    if (i < posts.length - 1) {
      const [nx, nz] = posts[i + 1];
      const dx = nx - px;
      const dz = nz - pz;
      const len = Math.sqrt(dx * dx + dz * dz);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.06, 0.06),
        postMat
      );
      rail.position.set((px + nx) / 2, 1.22, (pz + nz) / 2);
      rail.rotation.y = Math.atan2(dz, dx);
      g.add(rail);

      const rail2 = rail.clone();
      rail2.position.y = 0.98;
      g.add(rail2);
    }
  }
  return g;
}

// Small stone path from house to edge
export function createPath(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xb0a898 });
  const stones: [number, number, number][] = [
    [0, 0.81, 2.1], [0.1, 0.81, 2.8], [-0.15, 0.81, 3.5],
    [0.05, 0.81, 4.2], [-0.1, 0.81, 4.9],
  ];
  for (const [sx, sy, sz] of stones) {
    const geo = new THREE.CylinderGeometry(0.22 + Math.random() * 0.1, 0.2, 0.08, 7);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.set(sx + (Math.random() - 0.5) * 0.2, sy, sz);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

// Tiny flowers scattered around
export function createFlowers(): THREE.Group {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x3a7a20 });
  const petalColors = [0xe85540, 0xf0c030, 0xd060c0, 0xf08030];

  const positions: [number, number][] = [
    [2.5, 1.5], [-3.5, 2.0], [4.0, 0.5], [-2.0, 3.5],
    [1.0, -4.5], [-4.5, -1.5], [3.8, -1.0], [-1.5, 4.8],
    [5.0, 2.5], [-5.2, 1.0],
  ];
  for (const [fx, fz] of positions) {
    const flower = new THREE.Group();
    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5),
      stemMat
    );
    stem.position.y = 0.15;
    flower.add(stem);
    // Petals
    const pColor = petalColors[Math.floor(Math.random() * petalColors.length)];
    const petalMat = new THREE.MeshLambertMaterial({ color: pColor });
    const petals = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 4),
      petalMat
    );
    petals.position.y = 0.32;
    petals.scale.y = 0.6;
    flower.add(petals);

    flower.position.set(fx, 0.81, fz);
    flower.rotation.y = Math.random() * Math.PI;
    g.add(flower);
  }
  return g;
}
