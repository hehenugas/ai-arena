import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { clamp, fbm, makeRandom, smoothstep } from '../core/utils';
import { ISLAND_DEPTH, POND, rimRadius, terrainHeight } from './terrain';

const SEG = 132;
const TOP_RINGS = 16;
const SIDE_RINGS = 20;

const grass = new THREE.Color(PALETTE.grass);
const grassDry = new THREE.Color(PALETTE.grassDry);
const grassDeep = new THREE.Color(PALETTE.grassDeep);
const dirt = new THREE.Color(PALETTE.dirt);
const rock = new THREE.Color(PALETTE.rock);
const rockDark = new THREE.Color(PALETTE.rockDark);
/** Lighter mineral band that keeps the shaded underside from going flat. */
const rockWarm = new THREE.Color(0x8f8172);
const sand = new THREE.Color(PALETTE.sand);
const wetSilt = new THREE.Color(0x4d5a44);
const tmp = new THREE.Color();

function grassColor(x: number, z: number, h: number, out: THREE.Color): THREE.Color {
  const patch = fbm(x * 0.75 + 41, z * 0.75 + 17, 3);
  const patch2 = fbm(x * 1.9 + 3, z * 1.9 + 71, 2);
  out.copy(grass).lerp(grassDry, smoothstep(0.46, 0.84, patch) * 0.9);
  out.lerp(grassDeep, smoothstep(0.46, 0.14, patch2) * 0.55);
  out.lerp(grassDeep, smoothstep(0.4, 0.05, h) * 0.35);

  const d = Math.hypot(x - POND.x, z - POND.z);
  if (d < POND.shelf) {
    const above = h - POND.level;
    // Wet silt in the deep part, dry sand in a narrow band at the waterline.
    if (above < 0) {
      out.lerp(wetSilt, clamp(-above / 0.3, 0, 1) * 0.85);
    } else {
      out.lerp(sand, (1 - smoothstep(0.005, 0.07, above)) * 0.9);
    }
  }
  return out;
}

function rockColor(theta: number, v: number, y: number, out: THREE.Color): THREE.Color {
  const streak = fbm(theta * 3.1 + 5.5, y * 1.7, 3);
  const band = fbm(theta * 0.7 + 19, y * 0.9 + 4, 2);
  out.copy(dirt).lerp(rock, smoothstep(0.0, 0.16, v));
  // Stop short of black: the underside faces away from the key light, so any
  // extra darkening here collapses the whole rock into a flat silhouette.
  out.lerp(rockDark, smoothstep(0.18, 0.95, v) * 0.42);
  out.lerp(rockWarm, smoothstep(0.35, 0.75, band) * 0.3);
  out.offsetHSL(0, 0, (streak - 0.5) * 0.12 + 0.03);
  return out;
}


function buildGeometry(): THREE.BufferGeometry {
  const topCount = (TOP_RINGS + 1) * SEG;
  const total = topCount + (SIDE_RINGS + 1) * SEG;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const indices: number[] = [];

  const push = (i: number, x: number, y: number, z: number, c: THREE.Color) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  };

  // --- grass cap -------------------------------------------------------
  for (let i = 0; i <= TOP_RINGS; i++) {
    const t = i / TOP_RINGS;
    for (let j = 0; j < SEG; j++) {
      const theta = (j / SEG) * Math.PI * 2;
      const r = rimRadius(theta) * t;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = terrainHeight(x, z);
      push(i * SEG + j, x, y, z, grassColor(x, z, y, tmp));
    }
  }
  for (let i = 0; i < TOP_RINGS; i++) {
    for (let j = 0; j < SEG; j++) {
      const j1 = (j + 1) % SEG;
      const a = i * SEG + j;
      const b = i * SEG + j1;
      const c = (i + 1) * SEG + j1;
      const d = (i + 1) * SEG + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  // --- sculpted underside ---------------------------------------------
  const sideBase = (SIDE_RINGS + 1) * SEG;
  for (let j = 0; j <= SIDE_RINGS; j++) {
    const v = j / SIDE_RINGS;
    const taper = Math.pow(v, 0.78);
    for (let i = 0; i < SEG; i++) {
      const theta = (i / SEG) * Math.PI * 2;
      const crag = 0.42 * (fbm(Math.cos(theta) * 2.4 + 13, Math.sin(theta) * 2.4 + v * 6.1, 3) - 0.5);
      const lobe = 0.3 * (fbm(Math.cos(theta) * 0.9 + 51, Math.sin(theta) * 0.9 - v * 2.2, 2) - 0.5);
      const fluting = 0.08 * Math.sin(9 * theta + v * 5.2) + 0.05 * Math.sin(14 * theta - v * 3.1);
      let r = rimRadius(theta) * (1 - taper) * (1 + (crag + lobe) * v + fluting * v);
      if (j <= 2) r *= 1.012; // the grass lip overhangs the dirt a touch
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const jag = j === SIDE_RINGS ? 0 : (fbm(theta * 5.3 + 2.2, v * 9.1, 3) - 0.5) * 1.5 * v;
      const y = j === SIDE_RINGS ? -ISLAND_DEPTH : -ISLAND_DEPTH * Math.pow(v, 1.22) + jag;
      push(sideBase + j * SEG + i, x, y, z, rockColor(theta, v, y, tmp));
    }
  }
  for (let j = 0; j < SIDE_RINGS; j++) {
    for (let i = 0; i < SEG; i++) {
      const i1 = (i + 1) % SEG;
      const a = sideBase + j * SEG + i;
      const b = sideBase + j * SEG + i1;
      const c = sideBase + (j + 1) * SEG + i1;
      const d = sideBase + (j + 1) * SEG + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}


export interface Island {
  group: THREE.Group;
  mesh: THREE.Mesh;
  update(elapsed: number, motion: number): void;
}

/** The floating rock itself: a grassy cap over a craggy, tapering underside. */
export function createIsland(): Island {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(buildGeometry(), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Chunks of rock drifting just below the island, so it reads as floating.
  const rand = makeRandom(90210);
  const chunkGeo = new THREE.IcosahedronGeometry(1, 0);
  const chunkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    flatShading: true,
    roughness: 1,
  });
  const chunks: { mesh: THREE.Mesh; base: number; phase: number; spin: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const theta = rand() * Math.PI * 2;
    const dist = 0.9 + rand() * 2.6;
    const scale = 0.16 + rand() * 0.34;
    const chunk = new THREE.Mesh(chunkGeo, chunkMat);
    chunk.scale.set(
      scale * (0.7 + rand() * 0.6),
      scale * (0.8 + rand() * 0.8),
      scale * (0.7 + rand() * 0.6),
    );
    const baseY = -0.7 - rand() * 2.6;
    chunk.position.set(Math.cos(theta) * dist, baseY, Math.sin(theta) * dist);
    chunk.castShadow = true;
    group.add(chunk);
    chunks.push({ mesh: chunk, base: baseY, phase: rand() * 6.28, spin: (rand() - 0.5) * 0.06 });
  }

  return {
    group,
    mesh,
    update(elapsed, motion) {
      for (const c of chunks) {
        c.mesh.position.y = c.base + Math.sin(elapsed * 0.5 + c.phase) * 0.1 * motion;
        c.mesh.rotation.x = c.phase + elapsed * c.spin * motion;
      }
    },
  };
}
