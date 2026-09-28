import * as THREE from "three";
import { hash2, smoothstep } from "../util";
import type { Materials } from "./materials";

const BASE_RADIUS = 3.22;

export function islandRadius(theta: number): number {
  return (
    BASE_RADIUS +
    0.4 * Math.sin(2 * theta + 0.35) +
    0.24 * Math.sin(3 * theta + 1.55) +
    0.11 * Math.cos(5 * theta + 0.45) +
    0.045 * Math.sin(8 * theta + 2.05)
  );
}

export function surfaceHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const radius = islandRadius(theta);
  const f = dist / Math.max(radius, 0.0001);
  if (f >= 1) {
    return 0.02 - (dist - radius) * 1.7;
  }
  const dome = 0.045 * (1 - f * f);
  const rim = smoothstep(0.8, 1, f);
  const lip = Math.sin(theta * 5 + 0.7) * 0.014 * rim;
  return 0.1 + dome * (1 - rim) - rim * 0.085 + lip;
}

export function insideIsland(x: number, z: number, margin = 0): boolean {
  const theta = Math.atan2(z, x);
  return Math.hypot(x, z) <= islandRadius(theta) - margin;
}

const SEG = 72;
const TOP = 8;
const BOT = 13;

export function createIsland(materials: Materials): THREE.Group {
  const group = new THREE.Group();
  group.name = "island";
  group.add(createLandmesh(materials));
  group.add(createChunks(materials));
  return group;
}

function createLandmesh(materials: Materials): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const ringStart: number[] = [];
  const color = new THREE.Color();
  const grass = new THREE.Color("#7ea85a");
  const grassLight = new THREE.Color("#9dbe74");
  const grassDark = new THREE.Color("#4e7938");
  const sand = new THREE.Color("#c9b48a");
  const dirt = new THREE.Color("#8a5b3c");
  const rock = new THREE.Color("#746556");
  const rockDark = new THREE.Color("#3c332d");
  const moss = new THREE.Color("#5d7346");

  const push = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
  };

  ringStart.push(0);
  color.copy(grassLight);
  push(0, surfaceHeight(0, 0), 0);

  for (let ring = 1; ring <= TOP + BOT; ring += 1) {
    ringStart.push(positions.length / 3);
    for (let s = 0; s < SEG; s += 1) {
      const theta = (s / SEG) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const n = hash2(ring, s);

      if (ring <= TOP) {
        const f = ring / TOP;
        const radius = islandRadius(theta) * f;
        const x = cos * radius;
        const z = sin * radius;
        const y = surfaceHeight(x, z);
        const rim = smoothstep(0.72, 1, f);
        color.copy(grassLight).lerp(grass, Math.min(1, f * 1.15));
        color.lerp(grassDark, rim * 0.65);
        const patch = Math.sin(theta * 4 + f * 9) * Math.sin(theta * 2.2 - 0.6);
        if (patch > 0.25) color.lerp(grassDark, 0.28);
        if (patch < -0.4) color.lerp(grassLight, 0.22);
        if (rim > 0.62) color.lerp(sand, smoothstep(0.62, 1, rim) * 0.72);
        color.multiplyScalar(0.94 + n * 0.12);
        push(x, y, z);
      } else {
        const t = (ring - TOP) / BOT;
        const belly = Math.sin(t * Math.PI) * 0.14;
        const radial = (1 - t) * (0.98 + belly) + t * 0.045;
        const noise = 0.05 * Math.sin(theta * 5 + t * 8.5) + 0.028 * Math.sin(theta * 9 - t * 6.2);
        const radius = islandRadius(theta) * radial * (1 + noise * (0.35 + t));
        const rimX = cos * islandRadius(theta);
        const rimZ = sin * islandRadius(theta);
        const y = surfaceHeight(rimX, rimZ) - Math.pow(t, 0.78) * 1.62 + noise * 0.28;
        if (t < 0.14) {
          color.copy(sand).lerp(dirt, t / 0.14);
        } else if (t < 0.28) {
          color.copy(dirt).lerp(rock, (t - 0.14) / 0.14);
        } else {
          color.copy(rock).lerp(rockDark, Math.pow((t - 0.28) / 0.72, 1.15));
        }
        if (noise > 0.02 && t > 0.18 && t < 0.82) color.lerp(moss, 0.4);
        color.multiplyScalar(0.9 + n * 0.16);
        push(cos * radius, y, sin * radius);
      }
    }
  }

  const tip = positions.length / 3;
  color.copy(rockDark).multiplyScalar(0.85);
  push(0, -1.78, 0);

  const indices: number[] = [];
  for (let s = 0; s < SEG; s += 1) {
    const s1 = (s + 1) % SEG;
    indices.push(0, ringStart[1] + s, ringStart[1] + s1);
  }

  for (let ring = 1; ring < TOP + BOT; ring += 1) {
    const under = ring >= TOP;
    for (let s = 0; s < SEG; s += 1) {
      const s1 = (s + 1) % SEG;
      const a = ringStart[ring] + s;
      const b = ringStart[ring] + s1;
      const c = ringStart[ring + 1] + s;
      const d = ringStart[ring + 1] + s1;
      if (!under) {
        indices.push(a, b, d, a, d, c);
      } else {
        indices.push(a, d, b, a, c, d);
      }
    }
  }

  const last = TOP + BOT;
  for (let s = 0; s < SEG; s += 1) {
    const s1 = (s + 1) % SEG;
    indices.push(tip, ringStart[last] + s1, ringStart[last] + s);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, materials.island);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "island-surface";
  return mesh;
}

function createChunks(materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const specs = [
    { p: [0.95, -0.48, 0.28], s: [0.36, 0.26, 0.3], r: [0.4, 0.2, 0.3] },
    { p: [-0.72, -0.78, -0.18], s: [0.44, 0.32, 0.38], r: [0.2, 1.1, 0.5] },
    { p: [0.12, -1.18, 0.32], s: [0.28, 0.22, 0.24], r: [0.6, 0.4, 0.8] },
    { p: [-0.22, -0.42, 0.82], s: [0.26, 0.18, 0.22], r: [0.3, 0.9, 0.2] },
    { p: [0.48, -0.98, -0.42], s: [0.24, 0.18, 0.2], r: [0.8, 0.3, 0.4] },
  ];
  for (const spec of specs) {
    const mesh = new THREE.Mesh(geometry, materials.rockChunk);
    mesh.position.set(spec.p[0], spec.p[1], spec.p[2]);
    mesh.scale.set(spec.s[0], spec.s[1], spec.s[2]);
    mesh.rotation.set(spec.r[0], spec.r[1], spec.r[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
