import {
  BufferAttribute,
  Color,
  Group,
  InstancedMesh,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  ConeGeometry,
  Object3D,
} from 'three';
import { valueNoise, hash3 } from './noise';

export const ISLAND_RADIUS = 5;

/** World y of the flattened building spots (grass surface). */
export const GROUND_Y = 0;

/** Features that need flat ground: pond, house and windmill footprints. */
const FLAT_SPOTS: Array<[number, number, number]> = [
  [-1.5, 2.0, 2.7],
  [-1.5, -0.9, 2.1],
  [2.7, -1.6, 1.7],
];

/** Gentle roll of the grass surface at a world position (ignores flattening). */
function rawRoll(x: number, z: number, r: number): number {
  return valueNoise(x * 0.5 + 3, 0, z * 0.5) * 0.14 + 0.05 * Math.max(0, 1 - r / ISLAND_RADIUS);
}

/** Ground height including the flatten mask, so props can sit on the terrain. */
export function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let mask = 1;
  for (const [fx, fz, fr] of FLAT_SPOTS) {
    const d = Math.hypot(x - fx, z - fz);
    mask = Math.min(mask, Math.min(1, Math.max(0, (d - fr * 0.55) / (fr * 0.45))));
  }
  return rawRoll(x, z, r) * (0.15 + 0.85 * mask);
}

function radialJitter(angle: number): number {
  return (
    1 +
    0.075 * Math.sin(angle * 3 + 1.7) +
    0.045 * Math.sin(angle * 7 + 0.4) +
    0.03 * Math.sin(angle * 13 + 2.2)
  );
}

interface Vtx {
  x: number;
  y: number;
  z: number;
}

/** Irregular cylinder; `displace` mutates each vertex in place. */
function deformed(
  topR: number,
  bottomR: number,
  height: number,
  radial: number,
  heightSeg: number,
  displace: (v: Vtx, r: number, angle: number) => void
): CylinderGeometry {
  const geo = new CylinderGeometry(topR, bottomR, height, radial, heightSeg, false);
  const pos = geo.attributes.position as BufferAttribute;
  const v: Vtx = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < pos.count; i++) {
    v.x = pos.getX(i);
    v.y = pos.getY(i);
    v.z = pos.getZ(i);
    displace(v, Math.hypot(v.x, v.z), Math.atan2(v.z, v.x));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const GRASS_LIGHT = new Color(0x9cc870);
const GRASS_DEEP = new Color(0x6aa254);
const GRASS_EDGE = new Color(0x4e8244);
const DIRT = new Color(0x8f6a4a);
const DIRT_DEEP = new Color(0x67462f);
const ROCK_HIGH = new Color(0xa39a8d);
const ROCK_DEEP = new Color(0x6f655b);

/** Grass on top, dirt skirt below, then rock; mottled with hash noise. */
function paintBand(mesh: Mesh, dirtTopY: number, rockTopY: number): void {
  const geo = mesh.geometry;
  const pos = geo.attributes.position as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) + mesh.position.y;
    const z = pos.getZ(i);
    const mottle = valueNoise(x * 1.3 + 9, y * 1.3, z * 1.3 + 4);
    if (y >= dirtTopY - 0.02) {
      // Grass cap: brighter toward the centre, darker at the overhanging edge.
      const t = Math.min(1, Math.max(0, (y - dirtTopY) / 0.42));
      c.copy(GRASS_DEEP).lerp(GRASS_LIGHT, 0.3 + 0.55 * t);
      c.lerp(GRASS_EDGE, 0.3 * (1 - t));
    } else if (y >= rockTopY) {
      const t = Math.min(1, (dirtTopY - y) / Math.max(dirtTopY - rockTopY, 0.001));
      c.copy(DIRT).lerp(DIRT_DEEP, t * 0.75);
    } else {
      const t = Math.min(1, Math.max(0, (rockTopY - y) / 3.6));
      c.copy(ROCK_HIGH).lerp(ROCK_DEEP, t);
    }
    c.offsetHSL(0, 0, (mottle - 0.5) * 0.06);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
}

export interface FloatingRock {
  mesh: Mesh;
  baseY: number;
  phase: number;
  spin: number;
}

export interface Island {
  group: Group;
  update(elapsed: number, reducedMotion: boolean): void;
}

export function createIsland(): Island {
  const group = new Group();
  const bandMat = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0,
  });

  // Grass cap. Spans y -0.42..0 in local space; roll is baked into the top.
  const capGeo = deformed(5, 4.55, 0.42, 56, 3, (v, _r, a) => {
    const j = radialJitter(a);
    v.x *= j;
    v.z *= j;
    if (v.y > 0.2) {
      // Grass lip: the top ring overhangs the dirt skirt a touch.
      v.x *= 1.05;
      v.z *= 1.05;
      v.y -= 0.21; // world y == local y for the cap
      v.y += groundHeight(v.x, v.z);
    }
  });
  const cap = new Mesh(capGeo, bandMat);
  cap.position.y = 0;
  cap.castShadow = true;
  cap.receiveShadow = true;
  paintBand(cap, -0.02, -999);

  // Dirt skirt, y -1.1..0.
  const dirtGeo = deformed(4.55, 3.9, 1.1, 56, 2, (v, _r, a) => {
    const j = radialJitter(a);
    v.x *= j;
    v.z *= j;
  });
  const dirt = new Mesh(dirtGeo, bandMat);
  dirt.position.y = -0.55;
  paintBand(dirt, 0, -1.1);

  // Rocky underside tapering to a blunt tip, y -4.8..-1.1.
  const rockGeo = deformed(3.9, 0.45, 3.7, 44, 6, (v, _r, a) => {
    const crag = 0.82 + 0.36 * valueNoise(v.x * 0.55 + 11, v.y * 0.55, v.z * 0.55 + 7);
    const j = 1 + (radialJitter(a) - 1) * (0.4 + 0.3 * (1 - (-v.y - 1.1) / 3.7));
    v.x *= crag * j;
    v.z *= crag * j;
    v.y += (hash3(Math.round(v.x * 3), Math.round(v.y * 3), Math.round(v.z * 3)) - 0.5) * 0.16;
  });
  const rock = new Mesh(rockGeo, bandMat);
  rock.position.y = -2.95;
  rock.castShadow = true;
  // No grass on the underside: dirt tint only on the very top ring, rock below.
  paintBand(rock, 999, -1.1);

  group.add(cap, dirt, rock);

  // Small rocks drifting beneath the island.
  const floaters: FloatingRock[] = [];
  const rockMat = new MeshStandardMaterial({
    color: 0x7b7065,
    flatShading: true,
    roughness: 0.95,
  });
  const floatSpecs: Array<[number, number, number, number]> = [
    [2.2, -5.9, 0.9, 0.55],
    [-1.8, -6.6, -1.4, 0.42],
    [0.6, -7.4, 2.2, 0.34],
    [-2.9, -5.4, 1.2, 0.3],
  ];
  for (const [x, y, z, s] of floatSpecs) {
    const geo = new IcosahedronGeometry(s, 0);
    const m = new Mesh(geo, rockMat);
    m.position.set(x, y, z);
    m.scale.set(1, 0.7 + hash3(x, y, z) * 0.5, 0.85);
    m.rotation.set(hash3(x, y, 1) * 3, hash3(y, z, 1) * 3, hash3(z, x, 1) * 3);
    m.castShadow = false;
    group.add(m);
    floaters.push({ mesh: m, baseY: y, phase: hash3(x, z, y) * Math.PI * 2, spin: 0.08 + hash3(1, x, z) * 0.1 });
  }

  // Tufts of grass scattered over the lawn.
  const tuftGeo = new ConeGeometry(0.045, 0.22, 5);
  tuftGeo.translate(0, 0.11, 0);
  const tuftMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const TUFTS = 90;
  const tufts = new InstancedMesh(tuftGeo, tuftMat, TUFTS);
  const dummy = new Object3D();
  const tuftColor = new Color();
  let placed = 0;
  let guard = 0;
  while (placed < TUFTS && guard++ < 2000) {
    const a = hash3(placed, guard, 7) * Math.PI * 2;
    const r = 0.8 + Math.sqrt(hash3(guard, placed, 13)) * (ISLAND_RADIUS - 1.1);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (
      Math.hypot(x + 1.5, z - 2.0) < 2.0 ||
      Math.hypot(x + 1.5, z + 0.9) < 1.8 ||
      Math.hypot(x - 2.7, z + 1.6) < 1.35
    ) {
      continue; // keep the pond, house and windmill clear
    }
    dummy.position.set(x, groundHeight(x, z) - 0.02, z);
    dummy.rotation.set(0, hash3(x, z, 3) * Math.PI, 0);
    const s = 0.7 + hash3(z, x, 5) * 0.7;
    dummy.scale.set(s, s * (0.8 + hash3(x, 1, z) * 0.6), s);
    dummy.updateMatrix();
    tufts.setMatrixAt(placed, dummy.matrix);
    tuftColor.setHex(hash3(x, z, 9) > 0.5 ? 0x71ab55 : 0x5c9a4b);
    tufts.setColorAt(placed, tuftColor);
    placed++;
  }
  tufts.count = placed;
  tufts.receiveShadow = true;
  group.add(tufts);

  return {
    group,
    update(elapsed, reducedMotion) {
      const speed = reducedMotion ? 0.2 : 1;
      for (const f of floaters) {
        f.mesh.position.y = f.baseY + Math.sin(elapsed * 0.5 * speed + f.phase) * 0.16;
        f.mesh.rotation.y = f.phase + elapsed * f.spin * speed;
      }
    },
  };
}
