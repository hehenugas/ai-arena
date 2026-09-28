import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { clamp, mulberry32, smoothstep } from '../utils';
import { BASE_HEIGHT, FLAT_SPOTS, POND } from './layout';

export const ISLAND_RADIUS = 5.4;
const SEGMENTS = 128; // around the island — shared by every layer so seams match exactly
const RINGS = 90; // radial rings of the top surface
const SOIL_TOP = -0.3;
const SOIL_BOTTOM = -0.95;
const ROCK_BOTTOM = -5.2;
const UV_SCALE = 0.16;

// Palette (kept muted on purpose)
const GRASS_A = new Color('#7cbd69');
const GRASS_B = new Color('#8ecb77');
const GRASS_DARK = new Color('#5fa157');
const GRASS_EDGE = new Color('#68ab5c');
const SAND = new Color('#dcc89e');
const MUD = new Color('#8d7754');
const SOIL_TOP_C = new Color('#a2774d');
const SOIL_BOTTOM_C = new Color('#84613f');
const ROCK_LIGHT = new Color('#97897b');
const ROCK_DARK = new Color('#6d6157');

const tmpColor = new Color();
const tmpColor2 = new Color();

/** Irregular island silhouette as a pure function of the polar angle. */
export function islandRadius(angle: number): number {
  return (
    ISLAND_RADIUS *
    (1 +
      0.13 * Math.sin(3 * angle + 1.7) +
      0.075 * Math.sin(5 * angle + 0.4) +
      0.05 * Math.sin(7 * angle + 2.9) +
      0.035 * Math.sin(11 * angle + 5.1))
  );
}

/** Surface height anywhere on the island: bumps + pond basin + building pads. */
export function grassHeight(x: number, z: number): number {
  let y =
    BASE_HEIGHT +
    0.1 * Math.sin(x * 0.55 + 0.4) * Math.sin(z * 0.62 - 0.8) +
    0.05 * Math.sin(x * 1.15 - 1.2) * Math.sin(z * 1.05 + 2.0);

  const pd = Math.hypot(x - POND.x, z - POND.z);
  if (pd < POND.radius) {
    const k = pd / POND.radius;
    y -= POND.depth * (1 - k * k);
  }

  for (const spot of FLAT_SPOTS) {
    const d = Math.hypot(x - spot.x, z - spot.z);
    if (d < spot.outer) {
      const t = smoothstep(spot.outer, spot.inner, d) * spot.amount;
      y = y * (1 - t) + BASE_HEIGHT * t;
    }
  }
  return y;
}

export function isInsideIsland(x: number, z: number): boolean {
  const d = Math.hypot(x, z);
  return d < islandRadius(Math.atan2(z, x));
}

function grassTint(x: number, z: number, out: Color): Color {
  const n =
    0.5 +
    0.32 * Math.sin(x * 0.5 + 1.1) * Math.sin(z * 0.42 - 0.6) +
    0.18 * Math.sin(x * 1.4 - 2.0) * Math.sin(z * 1.25 + 0.5);
  out.copy(GRASS_A).lerp(GRASS_B, clamp(n, 0, 1));
  const patch = smoothstep(0.6, 0.95, Math.sin(x * 0.3 + z * 0.27 + 2.2) * 0.5 + 0.5);
  out.lerp(GRASS_DARK, patch * 0.5);
  return out;
}

/** Colour the top surface: grass, sandy shoreline band and pond-bottom mud. */
function surfaceColor(x: number, y: number, z: number, out: Color): Color {
  grassTint(x, z, out);
  const rel = y - POND.waterY;
  const shore = smoothstep(0.03, 0.13, rel) * (1 - smoothstep(0.17, 0.36, rel));
  const mud = 1 - smoothstep(0.0, 0.07, rel);
  out.lerp(SAND, shore);
  out.lerp(MUD, mud);
  return out;
}

function buildTopSurface(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Centre vertex
  positions.push(0, grassHeight(0, 0), 0);
  surfaceColor(0, positions[1], 0, tmpColor);
  colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
  uvs.push(0.5, 0.5);

  for (let i = 1; i <= RINGS; i++) {
    const rho = i / RINGS;
    for (let j = 0; j < SEGMENTS; j++) {
      const a = (j / SEGMENTS) * Math.PI * 2;
      const r = rho * islandRadius(a);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = grassHeight(x, z);
      positions.push(x, y, z);
      surfaceColor(x, y, z, tmpColor);
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
      uvs.push(x * UV_SCALE + 0.5, z * UV_SCALE + 0.5);
    }
  }

  // Centre fan
  for (let j = 0; j < SEGMENTS; j++) {
    const next = (j + 1) % SEGMENTS;
    indices.push(0, 1 + next, 1 + j);
  }
  // Ring quads
  for (let i = 0; i < RINGS - 1; i++) {
    const base = 1 + i * SEGMENTS;
    const nextBase = base + SEGMENTS;
    for (let j = 0; j < SEGMENTS; j++) {
      const next = (j + 1) % SEGMENTS;
      indices.push(base + j, base + next, nextBase + j);
      indices.push(base + next, nextBase + next, nextBase + j);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Green lip that connects the top surface down to the soil layer. */
function buildEdgeWall(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j < SEGMENTS; j++) {
    const a = (j / SEGMENTS) * Math.PI * 2;
    const r = islandRadius(a);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const yTop = grassHeight(x, z);
    grassTint(x, z, tmpColor);
    tmpColor2.copy(GRASS_EDGE);
    positions.push(x, yTop, z);
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    positions.push(x, SOIL_TOP, z);
    colors.push(tmpColor2.r * 0.85, tmpColor2.g * 0.85, tmpColor2.b * 0.85);
  }

  for (let j = 0; j < SEGMENTS; j++) {
    const next = (j + 1) % SEGMENTS;
    const t0 = j * 2;
    const t1 = next * 2;
    indices.push(t0, t1, t0 + 1, t1, t1 + 1, t0 + 1);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Tapered soil band between the grass lip and the rock. */
function buildSoil(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rand = mulberry32(4242);

  for (let j = 0; j < SEGMENTS; j++) {
    const a = (j / SEGMENTS) * Math.PI * 2;
    const rTop = islandRadius(a);
    const jitter = 0.985 + rand() * 0.03;
    const rBottom = islandRadius(a) * 0.93 * jitter;
    const xTop = Math.cos(a) * rTop;
    const zTop = Math.sin(a) * rTop;
    const xBottom = Math.cos(a) * rBottom;
    const zBottom = Math.sin(a) * rBottom;
    const shade = 0.92 + rand() * 0.16;
    positions.push(xTop, SOIL_TOP, zTop);
    colors.push(SOIL_TOP_C.r * shade, SOIL_TOP_C.g * shade, SOIL_TOP_C.b * shade);
    positions.push(xBottom, SOIL_BOTTOM, zBottom);
    colors.push(SOIL_BOTTOM_C.r * shade, SOIL_BOTTOM_C.g * shade, SOIL_BOTTOM_C.b * shade);
  }

  for (let j = 0; j < SEGMENTS; j++) {
    const next = (j + 1) % SEGMENTS;
    const t0 = j * 2;
    const t1 = next * 2;
    indices.push(t0, t0 + 1, t1, t1, t0 + 1, t1 + 1);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted rocky underside: lofted rings with crag noise, tapering to a point.
 * Vertex-coloured strata + flat shading give it a carved, faceted feel.
 */
function buildRock(): BufferGeometry {
  const levels = 9;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rand = mulberry32(777);

  for (let i = 0; i < levels; i++) {
    const t = i / (levels - 1);
    const y = SOIL_BOTTOM + (ROCK_BOTTOM - SOIL_BOTTOM) * t;
    const base = Math.pow(1 - t, 1.32);
    const ledge = 1 + 0.11 * Math.sin(i * 2.1 + 0.6);
    for (let j = 0; j < SEGMENTS; j++) {
      const a = (j / SEGMENTS) * Math.PI * 2;
      const crag =
        1 +
        (0.16 * Math.sin(a * 3 + i * 1.7) + 0.1 * Math.sin(a * 7 - i * 0.9)) * (0.35 + t) +
        (rand() - 0.5) * 0.09 * t;
      const r = islandRadius(a) * 0.93 * base * ledge * crag;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      positions.push(x, y, z);

      const shade = 0.9 + 0.16 * Math.sin(i * 3.1) + (rand() - 0.5) * 0.1;
      tmpColor.copy(ROCK_LIGHT).lerp(ROCK_DARK, smoothstep(0.05, 0.75, t));
      tmpColor2.copy(SOIL_BOTTOM_C).lerp(tmpColor, smoothstep(0.0, 0.22, t));
      colors.push(tmpColor2.r * shade, tmpColor2.g * shade, tmpColor2.b * shade);
    }
  }
  // Tip vertex
  const tipIndex = positions.length / 3;
  positions.push(0.15, ROCK_BOTTOM - 0.35, -0.1);
  colors.push(ROCK_DARK.r, ROCK_DARK.g, ROCK_DARK.b);

  for (let i = 0; i < levels - 1; i++) {
    const base = i * SEGMENTS;
    const nextBase = base + SEGMENTS;
    for (let j = 0; j < SEGMENTS; j++) {
      const next = (j + 1) % SEGMENTS;
      indices.push(base + j, nextBase + j, base + next);
      indices.push(base + next, nextBase + j, nextBase + next);
    }
  }
  const lastBase = (levels - 1) * SEGMENTS;
  for (let j = 0; j < SEGMENTS; j++) {
    const next = (j + 1) % SEGMENTS;
    indices.push(lastBase + j, tipIndex, lastBase + next);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export interface Island {
  group: Group;
}

export function createIsland(grassMap: import('three').Texture | null): Island {
  const group = new Group();
  group.name = 'island';

  const topMat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  });
  if (grassMap) {
    grassMap.repeat.set(3, 3);
    topMat.map = grassMap;
  }
  const top = new Mesh(buildTopSurface(), topMat);
  top.receiveShadow = true;
  top.castShadow = false;
  group.add(top);

  const edgeMat = new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const edge = new Mesh(buildEdgeWall(), edgeMat);
  edge.receiveShadow = true;
  group.add(edge);

  const soil = new Mesh(buildSoil(), edgeMat);
  group.add(soil);

  const rockMat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const rock = new Mesh(buildRock(), rockMat);
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  return { group };
}

/** Small faceted rocks that hover around the underside of the island. */
export function createFloatingRocks(
  specs: Array<{ x: number; y: number; z: number; s: number; seed: number }>,
): { group: Group; rocks: Array<{ mesh: Mesh; baseY: number; phase: number; spin: number }> } {
  const group = new Group();
  group.name = 'floating-rocks';
  const geo = new IcosahedronGeometry(1, 0);
  const mat = new MeshStandardMaterial({ color: '#8a7f74', roughness: 0.95, flatShading: true });
  const rocks = specs.map((spec) => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.scale.setScalar(spec.s);
    mesh.rotation.set(spec.seed * 0.7, spec.seed * 1.3, spec.seed * 0.4);
    mesh.castShadow = true;
    group.add(mesh);
    return { mesh, baseY: spec.y, phase: spec.seed * 0.61, spin: 0.1 + (spec.seed % 5) * 0.03 };
  });
  return { group, rocks };
}

export function updateFloatingRocks(
  rocks: Array<{ mesh: Mesh; baseY: number; phase: number; spin: number }>,
  t: number,
  motion: number,
): void {
  for (const rock of rocks) {
    rock.mesh.position.y = rock.baseY + Math.sin(t * 0.6 + rock.phase) * 0.22 * motion;
    rock.mesh.rotation.y += rock.spin * 0.016 * motion;
  }
}
