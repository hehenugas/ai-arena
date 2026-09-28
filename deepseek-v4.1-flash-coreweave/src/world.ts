import * as THREE from 'three';
import { COLORS } from './palette';
import { TAU, clamp, lerp, makeRng, smoothstep } from './math';

export interface SwayRef {
  group: THREE.Group;
  phase: number;
  amp: number;
}

export interface CloudRef {
  group: THREE.Group;
  baseY: number;
  phase: number;
}

export interface SmokePuff {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  life: number;
  speed: number;
  spread: number;
}

export interface FloaterRef {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
}

export interface PondInfo {
  x: number;
  z: number;
  r: number;
  y: number;
}

export interface UpdateEnv {
  wind: number;
  rain: number;
  night: number;
  reducedMotion: boolean;
}

export interface World {
  root: THREE.Group;
  terrainHeight(x: number, z: number): number;
  /** Terrain height in world space (accounts for the island's gentle bob). */
  groundY(x: number, z: number): number;
  radiusAt(theta: number): number;
  isInside(x: number, z: number): boolean;
  house: THREE.Group;
  houseHitTargets: THREE.Object3D[];
  windowMaterial: THREE.MeshStandardMaterial;
  houseLight: THREE.PointLight;
  rotor: THREE.Group;
  trees: SwayRef[];
  flowers: SwayRef[];
  clouds: CloudRef[];
  cloudMaterial: THREE.MeshStandardMaterial;
  water: THREE.Mesh;
  pond: PondInfo;
  update(dt: number, elapsed: number, env: UpdateEnv): void;
}

export interface WorldOptions {
  lowPower?: boolean;
}

/* ------------------------------------------------------------------ */
/* Shared geometry and materials                                       */
/* ------------------------------------------------------------------ */

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  icosa: new THREE.IcosahedronGeometry(1, 0),
  cone: new THREE.ConeGeometry(1, 1, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  disc: new THREE.CircleGeometry(1, 44),
  ring: new THREE.RingGeometry(0.6, 1, 34),
};

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

const M = {
  grass: std({ vertexColors: true, roughness: 0.98, metalness: 0 }),
  rock: std({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true }),
  stone: std({ color: COLORS.stone, roughness: 1, flatShading: true }),
  sand: std({ color: COLORS.sand, roughness: 1 }),
  cream: std({ color: COLORS.cream, roughness: 0.9 }),
  creamShade: std({ color: COLORS.creamShade, roughness: 0.9 }),
  roof: std({ color: COLORS.roof, roughness: 0.85 }),
  roofDark: std({ color: COLORS.roofDark, roughness: 0.9 }),
  wood: std({ color: COLORS.wood, roughness: 0.9 }),
  woodDark: std({ color: COLORS.woodDark, roughness: 0.9 }),
  leafPine: std({ color: COLORS.leafPine, roughness: 1 }),
  leafRound: std({ color: COLORS.leafRound, roughness: 1 }),
  leafLight: std({ color: COLORS.leafLight, roughness: 1 }),
  cloud: std({ color: COLORS.cloud, roughness: 1 }),
  water: std({
    color: COLORS.water,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
  }),
  window: std({
    color: COLORS.window,
    roughness: 0.25,
    metalness: 0,
    emissive: new THREE.Color(COLORS.windowGlow),
    emissiveIntensity: 0,
  }),
  path: std({ color: COLORS.path, roughness: 1 }),
  metal: std({ color: '#5b5f66', roughness: 0.5, metalness: 0.6 }),
};

/* ------------------------------------------------------------------ */
/* Small builders                                                      */
/* ------------------------------------------------------------------ */

function makeMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = makeMesh(GEO.box, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  return mesh;
}

function cylinder(
  material: THREE.Material,
  radius: number,
  height: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = makeMesh(GEO.cyl, material);
  mesh.scale.set(radius, height, radius);
  mesh.position.set(x, y, z);
  return mesh;
}

function sphere(
  material: THREE.Material,
  radius: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = makeMesh(GEO.sphere, material);
  mesh.scale.setScalar(radius);
  mesh.position.set(x, y, z);
  return mesh;
}

function cone(
  material: THREE.Material,
  radius: number,
  height: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = makeMesh(GEO.cone, material);
  mesh.scale.set(radius, height, radius);
  mesh.position.set(x, y, z);
  return mesh;
}

function sampleProfile(
  profile: ReadonlyArray<readonly [number, number]>,
  u: number,
): [number, number] {
  const last = profile.length - 1;
  const f = clamp(u, 0, 1) * last;
  const i0 = Math.floor(f);
  const i1 = Math.min(i0 + 1, last);
  const t = f - i0;
  return [lerp(profile[i0][0], profile[i1][0], t), lerp(profile[i0][1], profile[i1][1], t)];
}

/** Flat ribbon that hugs the terrain, used for the garden path. */
function createPathGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  terrainHeight: (x: number, z: number) => number,
  segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
    tangent.normalize();
    const perpX = -tangent.z;
    const perpZ = tangent.x;
    const taper = 0.75 + 0.25 * Math.sin(Math.PI * u);
    const half = width * 0.5 * taper;

    const lx = p.x + perpX * half;
    const lz = p.z + perpZ * half;
    const rx = p.x - perpX * half;
    const rz = p.z - perpZ * half;

    positions.push(lx, terrainHeight(lx, lz) + 0.022, lz);
    positions.push(rx, terrainHeight(rx, rz) + 0.022, rz);
    normals.push(0, 1, 0, 0, 1, 0);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2 + 1;
    const d = (i + 1) * 2;
    indices.push(a, c, b, a, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

/** Terrain-hugging annulus (used for the sandy shoreline). */
function createAnnulus(
  innerRadius: number,
  outerRadius: number,
  segments: number,
  heightAt: (x: number, z: number) => number,
  lift = 0.012,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const inner = new THREE.Color(COLORS.sand);
  const outer = new THREE.Color(COLORS.soil);
  const tmp = new THREE.Color();

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * TAU;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    for (let r = 0; r < 2; r++) {
      const radius = r === 0 ? innerRadius : outerRadius;
      const x = c * radius;
      const z = s * radius;
      positions.push(x, heightAt(x, z) + lift, z);
      tmp.copy(inner).lerp(outer, r === 0 ? 0 : 1);
      colors.push(tmp.r, tmp.g, tmp.b);
    }
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const a = i * 2;
    const b = next * 2;
    const c = next * 2 + 1;
    const d = i * 2 + 1;
    indices.push(a, b, c, a, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Island                                                              */
/* ------------------------------------------------------------------ */

interface IslandResult {
  group: THREE.Group;
  terrainHeight(x: number, z: number): number;
  radiusAt(theta: number): number;
  pond: PondInfo;
  water: THREE.Mesh;
}

function createIsland(): IslandResult {
  const group = new THREE.Group();
  const R = 3.5;
  const SEG = 56;
  const CAP_RINGS = 14;
  const BODY_RINGS = 16;
  const pond: PondInfo = { x: 0.78, z: 1.62, r: 1.02, y: 0 };

  const radiusAt = (theta: number): number =>
    R *
    (1 +
      0.085 * Math.sin(3 * theta + 0.6) +
      0.05 * Math.sin(5 * theta - 1.3) +
      0.03 * Math.sin(8 * theta + 2.1));

  const terrainHeight = (x: number, z: number): number => {
    const d = Math.hypot(x, z);
    const dome = 0.24 * Math.max(0, 1 - (d / R) * (d / R));
    let h =
      0.05 +
      dome +
      0.032 * Math.sin(x * 1.5 + 0.4) * Math.cos(z * 1.6 - 0.3) +
      0.02 * Math.sin(x * 3.2 - 1.1) * Math.sin(z * 2.8 + 0.7);

    // Carve a shallow basin so the pond sits inside a real shoreline.
    const pd = Math.hypot(x - pond.x, z - pond.z);
    const t = clamp((pond.r - pd) / (pond.r * 0.58), 0, 1);
    h -= 0.42 * (t * t * (3 - 2 * t));
    return h;
  };

  /* --- grassy cap ------------------------------------------------- */
  const capPositions: number[] = [];
  const capColors: number[] = [];
  const capIndices: number[] = [];
  const cGrassLight = new THREE.Color(COLORS.grassLight);
  const cGrassDeep = new THREE.Color(COLORS.grassDeep);
  const cSoil = new THREE.Color(COLORS.soil);
  const tmp = new THREE.Color();

  capPositions.push(0, terrainHeight(0, 0), 0);
  tmp.copy(cGrassLight).lerp(cGrassDeep, 0.35);
  capColors.push(tmp.r, tmp.g, tmp.b);

  const capIndex = (ring: number, i: number) => 1 + (ring - 1) * SEG + (((i % SEG) + SEG) % SEG);

  for (let ring = 1; ring <= CAP_RINGS; ring++) {
    const f = ring / CAP_RINGS;
    for (let i = 0; i < SEG; i++) {
      const theta = (i / SEG) * TAU;
      const radius = radiusAt(theta) * f;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      capPositions.push(x, terrainHeight(x, z), z);

      const wobble = 0.5 + 0.5 * Math.sin(theta * 4 + radius * 1.7);
      tmp.copy(cGrassDeep).lerp(cGrassLight, wobble);
      tmp.lerp(cSoil, smoothstep(0.82, 1, f) * 0.8);
      const pd = Math.hypot(x - pond.x, z - pond.z);
      tmp.lerp(cSoil, smoothstep(pond.r, pond.r * 0.5, pd) * 0.85);
      capColors.push(tmp.r, tmp.g, tmp.b);
    }
  }

  for (let i = 0; i < SEG; i++) {
    capIndices.push(0, capIndex(1, i + 1), capIndex(1, i));
  }
  for (let ring = 1; ring < CAP_RINGS; ring++) {
    for (let i = 0; i < SEG; i++) {
      const a = capIndex(ring, i);
      const b = capIndex(ring, i + 1);
      const c = capIndex(ring + 1, i + 1);
      const d = capIndex(ring + 1, i);
      capIndices.push(a, b, c, a, c, d);
    }
  }

  const capGeometry = new THREE.BufferGeometry();
  capGeometry.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3));
  capGeometry.setAttribute('color', new THREE.Float32BufferAttribute(capColors, 3));
  capGeometry.setIndex(capIndices);
  capGeometry.computeVertexNormals();

  const cap = new THREE.Mesh(capGeometry, M.grass);
  cap.name = 'island-grass';
  cap.receiveShadow = true;
  cap.castShadow = false;
  group.add(cap);

  /* --- rocky underside -------------------------------------------- */
  const profile: ReadonlyArray<readonly [number, number]> = [
    [1.0, 0],
    [1.05, -0.16],
    [0.99, -0.5],
    [0.86, -1.0],
    [0.68, -1.55],
    [0.49, -2.1],
    [0.32, -2.65],
    [0.17, -3.15],
    [0.06, -3.55],
    [0.04, -3.8],
  ];

  const rimY: number[] = [];
  for (let i = 0; i < SEG; i++) {
    const theta = (i / SEG) * TAU;
    const radius = radiusAt(theta);
    rimY.push(terrainHeight(Math.cos(theta) * radius, Math.sin(theta) * radius));
  }

  const bodyPositions: number[] = [];
  const bodyColors: number[] = [];
  const bodyIndices: number[] = [];
  const cRockMid = new THREE.Color(COLORS.rockMid);
  const cRockDark = new THREE.Color(COLORS.rockDark);

  for (let ring = 0; ring <= BODY_RINGS; ring++) {
    const u = ring / BODY_RINGS;
    const [radiusFactor, dy] = sampleProfile(profile, u);
    for (let i = 0; i < SEG; i++) {
      const theta = (i / SEG) * TAU;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      let radius = radiusAt(theta) * radiusFactor;
      let y = rimY[i] + dy;
      if (u > 0.1) {
        // Craggy rock: angular ridges plus vertical jitter.
        radius *= 1 + 0.09 * Math.sin(theta * 5 + u * 7) + 0.05 * Math.sin(theta * 9 - u * 4);
        y += 0.1 * Math.sin(theta * 6 + u * 9) * u;
      }
      bodyPositions.push(c * radius, y, s * radius);

      tmp.copy(cSoil).lerp(cRockMid, smoothstep(0.02, 0.3, u));
      tmp.lerp(cRockDark, smoothstep(0.45, 0.92, u));
      const mottle = 0.5 + 0.5 * Math.sin(theta * 7 + u * 11);
      tmp.offsetHSL(0, 0, (mottle - 0.5) * 0.06);
      bodyColors.push(tmp.r, tmp.g, tmp.b);
    }
  }

  const bodyIndex = (ring: number, i: number) => ring * SEG + (((i % SEG) + SEG) % SEG);
  for (let ring = 0; ring < BODY_RINGS; ring++) {
    for (let i = 0; i < SEG; i++) {
      const a = bodyIndex(ring, i);
      const b = bodyIndex(ring, i + 1);
      const c = bodyIndex(ring + 1, i + 1);
      const d = bodyIndex(ring + 1, i);
      bodyIndices.push(a, b, c, a, c, d);
    }
  }

  // Close the tip with a single apex so the underside is watertight.
  const apexIndex = (BODY_RINGS + 1) * SEG;
  const tipY =
    rimY.reduce((acc, v) => acc + v, 0) / SEG + profile[profile.length - 1][1] - 0.12;
  bodyPositions.push(0, tipY, 0);
  tmp.copy(cRockDark).offsetHSL(0, 0, -0.04);
  bodyColors.push(tmp.r, tmp.g, tmp.b);
  for (let i = 0; i < SEG; i++) {
    bodyIndices.push(apexIndex, bodyIndex(BODY_RINGS, i), bodyIndex(BODY_RINGS, i + 1));
  }

  const bodyGeometry = new THREE.BufferGeometry();
  bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyPositions, 3));
  bodyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bodyColors, 3));
  bodyGeometry.setIndex(bodyIndices);
  bodyGeometry.computeVertexNormals();

  const body = new THREE.Mesh(bodyGeometry, M.rock);
  body.name = 'island-rock';
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  /* --- pond ------------------------------------------------------- */
  let rimMax = -Infinity;
  for (let i = 0; i < 32; i++) {
    const theta = (i / 32) * TAU;
    const rr = pond.r * 0.96;
    rimMax = Math.max(
      rimMax,
      terrainHeight(pond.x + Math.cos(theta) * rr, pond.z + Math.sin(theta) * rr),
    );
  }
  pond.y = rimMax - 0.05;

  const shore = new THREE.Mesh(
    createAnnulus(pond.r * 0.92, pond.r * 1.18, 48, terrainHeight, 0.012),
    M.sand,
  );
  shore.name = 'pond-shore';
  shore.castShadow = false;
  shore.receiveShadow = true;
  shore.position.set(pond.x, 0, pond.z);
  group.add(shore);

  const water = new THREE.Mesh(GEO.disc, M.water);
  water.name = 'pond-water';
  water.scale.setScalar(pond.r * 0.97);
  water.rotation.x = -Math.PI / 2;
  water.position.set(pond.x, pond.y, pond.z);
  water.receiveShadow = true;
  water.castShadow = false;
  group.add(water);

  // A couple of shoreline reeds and pebbles for scale.
  const rng = makeRng(1337);
  for (let i = 0; i < 7; i++) {
    const theta = rng() * TAU;
    const radius = pond.r * (0.82 + rng() * 0.2);
    const x = pond.x + Math.cos(theta) * radius;
    const z = pond.z + Math.sin(theta) * radius;
    const reed = cone(M.leafPine, 0.035, 0.26 + rng() * 0.16, x, terrainHeight(x, z) + 0.13, z);
    reed.rotation.z = (rng() - 0.5) * 0.3;
    group.add(reed);
  }

  return { group, terrainHeight, radiusAt, pond, water };
}

/* ------------------------------------------------------------------ */
/* House                                                               */
/* ------------------------------------------------------------------ */

interface HouseResult {
  group: THREE.Group;
  targets: THREE.Object3D[];
  light: THREE.PointLight;
}

function createHouse(
  terrainHeight: (x: number, z: number) => number,
  x: number,
  z: number,
  rotY: number,
): HouseResult {
  const group = new THREE.Group();
  const wallTop = 1.03;

  // Stone footing that also hides any gap with the rolling terrain.
  group.add(box(M.stone, 1.74, 0.24, 1.32, 0, -0.04, 0));

  // Walls.
  group.add(box(M.cream, 1.5, 0.95, 1.1, 0, 0.555, 0));

  // Timber framing.
  const post = 0.07;
  for (const px of [-0.715, 0.715]) {
    for (const pz of [-0.515, 0.515]) {
      group.add(box(M.woodDark, post, 0.99, post, px, 0.555, pz));
    }
  }
  group.add(box(M.woodDark, 1.56, 0.08, 0.08, 0, 1.0, 0.515));
  group.add(box(M.woodDark, 1.56, 0.08, 0.08, 0, 1.0, -0.515));
  group.add(box(M.woodDark, 0.08, 0.08, 1.15, 0.715, 1.0, 0));
  group.add(box(M.woodDark, 0.08, 0.08, 1.15, -0.715, 1.0, 0));
  group.add(box(M.woodDark, 0.08, 0.08, 1.15, 0.715, 0.16, 0));
  group.add(box(M.woodDark, 0.08, 0.08, 1.15, -0.715, 0.16, 0));

  // Gable roof (extruded triangle) with a ridge beam.
  const shape = new THREE.Shape();
  shape.moveTo(-0.98, 0);
  shape.lineTo(0.98, 0);
  shape.lineTo(0, 0.66);
  shape.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(shape, { depth: 1.36, bevelEnabled: false });
  roofGeometry.translate(0, 0, -0.68);
  const roof = makeMesh(roofGeometry, M.roof);
  roof.position.y = wallTop;
  group.add(roof);
  group.add(box(M.roofDark, 0.1, 0.07, 1.42, 0, wallTop + 0.66, 0));

  // Chimney.
  group.add(box(M.creamShade, 0.2, 0.62, 0.2, 0.42, 0.32, -0.3));
  group.add(box(M.roofDark, 0.27, 0.07, 0.27, 0.42, 0.64, -0.3));

  // Door, frame, step and knob.
  group.add(box(M.wood, 0.34, 0.6, 0.07, -0.34, 0.4, 0.568));
  group.add(box(M.woodDark, 0.46, 0.07, 0.1, -0.34, 0.73, 0.572));
  group.add(box(M.woodDark, 0.06, 0.66, 0.1, -0.58, 0.4, 0.572));
  group.add(box(M.woodDark, 0.06, 0.66, 0.1, -0.1, 0.4, 0.572));
  group.add(sphere(M.metal, 0.028, -0.21, 0.42, 0.612));
  group.add(box(M.stone, 0.52, 0.09, 0.26, -0.34, 0.06, 0.72));

  // Porch roof over the door.
  const porch = box(M.roof, 0.66, 0.05, 0.34, -0.34, 0.9, 0.74);
  porch.rotation.x = -0.32;
  group.add(porch);

  // Windows: shared emissive material keeps the light state unified.
  const addWindow = (wx: number, wy: number, wz: number, w: number, h: number, axis: 'z' | 'x') => {
    const glass = box(
      M.window,
      axis === 'z' ? w : 0.05,
      h,
      axis === 'z' ? 0.05 : w,
      wx,
      wy,
      wz,
    );
    group.add(glass);
    const t = 0.055;
    if (axis === 'z') {
      group.add(box(M.woodDark, w + 0.1, t, 0.07, wx, wy + h / 2 + t / 2, wz + 0.01));
      group.add(box(M.woodDark, w + 0.1, t, 0.07, wx, wy - h / 2 - t / 2, wz + 0.01));
      group.add(box(M.woodDark, t, h + 0.12, 0.07, wx - w / 2 - t / 2, wy, wz + 0.01));
      group.add(box(M.woodDark, t, h + 0.12, 0.07, wx + w / 2 + t / 2, wy, wz + 0.01));
      group.add(box(M.woodDark, 0.03, h, 0.06, wx, wy, wz + 0.015));
      group.add(box(M.creamShade, w + 0.16, 0.05, 0.12, wx, wy - h / 2 - 0.09, wz + 0.03));
    } else {
      group.add(box(M.woodDark, 0.07, t, w + 0.1, wx + 0.01, wy + h / 2 + t / 2, wz));
      group.add(box(M.woodDark, 0.07, t, w + 0.1, wx + 0.01, wy - h / 2 - t / 2, wz));
      group.add(box(M.woodDark, 0.07, h + 0.12, t, wx + 0.01, wy, wz - w / 2 - t / 2));
      group.add(box(M.woodDark, 0.07, h + 0.12, t, wx + 0.01, wy, wz + w / 2 + t / 2));
    }
  };
  addWindow(0.36, 0.62, 0.562, 0.32, 0.3, 'z');
  addWindow(0.715, 0.62, 0.12, 0.3, 0.28, 'x');
  addWindow(-0.715, 0.62, -0.12, 0.28, 0.26, 'x');

  // Shutters.
  group.add(box(M.wood, 0.1, 0.34, 0.05, 0.06, 0.62, 0.568));
  group.add(box(M.wood, 0.1, 0.34, 0.05, 0.66, 0.62, 0.568));

  // Round attic window in the gable.
  const attic = cylinder(M.window, 0.09, 0.05, 0, 1.32, 0.69);
  attic.rotation.x = Math.PI / 2;
  group.add(attic);
  const atticRing = cylinder(M.woodDark, 0.125, 0.04, 0, 1.32, 0.7);
  atticRing.rotation.x = Math.PI / 2;
  group.add(atticRing);

  // A little lantern beside the door.
  group.add(box(M.woodDark, 0.04, 0.42, 0.04, -0.7, 0.55, 0.6));
  group.add(box(M.window, 0.13, 0.16, 0.13, -0.7, 0.82, 0.6));
  group.add(cone(M.roofDark, 0.12, 0.1, -0.7, 0.94, 0.6));

  group.position.set(x, terrainHeight(x, z) - 0.05, z);
  group.rotation.y = rotY;
  group.name = 'house';

  const light = new THREE.PointLight(COLORS.windowGlow, 0, 5.5, 2);
  light.position.set(0, 0.85, 0.35);
  light.castShadow = false;
  group.add(light);

  const targets: THREE.Object3D[] = [];
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) targets.push(object);
  });

  return { group, targets, light };
}

/* ------------------------------------------------------------------ */
/* Windmill                                                            */
/* ------------------------------------------------------------------ */

interface WindmillResult {
  group: THREE.Group;
  rotor: THREE.Group;
}

function createWindmill(
  terrainHeight: (x: number, z: number) => number,
  x: number,
  z: number,
  rotY: number,
): WindmillResult {
  const group = new THREE.Group();

  group.add(cylinder(M.stone, 0.42, 0.22, 0, 0.11, 0));

  const tower = makeMesh(new THREE.CylinderGeometry(0.2, 0.33, 1.35, 14), M.cream);
  tower.position.y = 0.78;
  group.add(tower);

  group.add(cylinder(M.woodDark, 0.31, 0.05, 0, 1.16, 0));
  group.add(box(M.woodDark, 0.2, 0.42, 0.07, 0, 0.3, 0.3));
  group.add(box(M.woodDark, 0.32, 0.4, 0.02, 0, 0.95, 0.29));

  const cap = makeMesh(new THREE.ConeGeometry(0.34, 0.44, 14), M.woodDark);
  cap.position.y = 1.7;
  group.add(cap);
  group.add(sphere(M.metal, 0.04, 0, 1.93, 0));

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.64, 0.32);
  const hub = cylinder(M.woodDark, 0.09, 0.2, 0, 0, 0);
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  rotor.add(sphere(M.metal, 0.055, 0, 0, 0.11));

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    blade.rotation.z = (i * Math.PI) / 2;

    // Leading spar plus a canvas sail framed by crossbars.
    blade.add(box(M.woodDark, 0.05, 0.76, 0.045, 0, 0.42, 0));
    blade.add(box(M.creamShade, 0.29, 0.54, 0.018, 0.155, 0.41, 0.004));
    for (const by of [0.14, 0.41, 0.68]) {
      blade.add(box(M.woodDark, 0.3, 0.024, 0.028, 0.155, by, 0.016));
    }
    rotor.add(blade);
  }

  group.add(rotor);
  group.position.set(x, terrainHeight(x, z) - 0.02, z);
  group.rotation.y = rotY;
  group.name = 'windmill';

  return { group, rotor };
}

/* ------------------------------------------------------------------ */
/* Trees, rocks, clouds, flowers                                       */
/* ------------------------------------------------------------------ */

type TreeKind = 'pine' | 'round' | 'bush';

function createTree(kind: TreeKind, rng: () => number): { group: THREE.Group; amp: number } {
  const group = new THREE.Group();
  const scale = 0.82 + rng() * 0.36;

  if (kind === 'pine') {
    group.add(cylinder(M.woodDark, 0.09, 0.55, 0, 0.25, 0));
    group.add(cone(M.leafPine, 0.5, 0.62, 0, 0.6, 0));
    group.add(cone(M.leafPine, 0.39, 0.56, 0, 0.95, 0));
    group.add(cone(M.leafPine, 0.27, 0.5, 0, 1.26, 0));
  } else if (kind === 'round') {
    group.add(cylinder(M.wood, 0.1, 0.66, 0, 0.32, 0));
    const blobA = makeMesh(GEO.icosa, M.leafRound);
    blobA.scale.set(0.44, 0.38, 0.44);
    blobA.position.set(0, 0.82, 0);
    group.add(blobA);
    const blobB = makeMesh(GEO.icosa, M.leafLight);
    blobB.scale.set(0.3, 0.26, 0.3);
    blobB.position.set(0.3, 0.68, 0.1);
    group.add(blobB);
    const blobC = makeMesh(GEO.icosa, M.leafRound);
    blobC.scale.set(0.27, 0.24, 0.27);
    blobC.position.set(-0.26, 0.72, -0.13);
    group.add(blobC);
  } else {
    const blobA = makeMesh(GEO.icosa, M.leafRound);
    blobA.scale.set(0.36, 0.26, 0.36);
    blobA.position.set(0, 0.24, 0);
    group.add(blobA);
    const blobB = makeMesh(GEO.icosa, M.leafLight);
    blobB.scale.set(0.26, 0.2, 0.26);
    blobB.position.set(0.24, 0.2, 0.08);
    group.add(blobB);
    const blobC = makeMesh(GEO.icosa, M.leafPine);
    blobC.scale.set(0.22, 0.18, 0.22);
    blobC.position.set(-0.2, 0.18, -0.1);
    group.add(blobC);
  }

  group.scale.setScalar(scale);
  group.rotation.y = rng() * TAU;
  group.name = `tree-${kind}`;
  return { group, amp: kind === 'bush' ? 0.035 : 0.06 };
}

function createRockMesh(rng: () => number, radius: number): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const jitter = 0.82 + rng() * 0.36;
    position.setXYZ(
      i,
      position.getX(i) * jitter,
      position.getY(i) * jitter,
      position.getZ(i) * jitter,
    );
  }
  geometry.computeVertexNormals();
  const mesh = makeMesh(geometry, M.stone);
  mesh.scale.set(radius, radius * (0.7 + rng() * 0.4), radius * (0.85 + rng() * 0.3));
  mesh.rotation.set(rng() * TAU, rng() * TAU, rng() * TAU);
  return mesh;
}

function createCloud(rng: () => number): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const puff = makeMesh(GEO.sphere, M.cloud);
    puff.castShadow = false;
    puff.receiveShadow = false;
    puff.scale.set(0.5 + rng() * 0.4, 0.28 + rng() * 0.15, 0.42 + rng() * 0.34);
    puff.position.set((i - 1.5) * 0.5 + (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.3);
    group.add(puff);
  }
  return group;
}

function createFlowerCluster(rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const blossomColors = ['#e8747c', '#f2c14e', '#e9ecf2', '#c98ad1'].map(
    (c) => std({ color: c, roughness: 0.8 }),
  );
  const count = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < count; i++) {
    const ox = (rng() - 0.5) * 0.34;
    const oz = (rng() - 0.5) * 0.34;
    const height = 0.14 + rng() * 0.12;
    const stem = cylinder(M.leafPine, 0.012, height, ox, height / 2, oz);
    stem.castShadow = false;
    group.add(stem);
    const blossom = sphere(
      blossomColors[Math.floor(rng() * blossomColors.length)],
      0.038 + rng() * 0.016,
      ox,
      height,
      oz,
    );
    blossom.castShadow = false;
    group.add(blossom);
  }
  return group;
}

/* ------------------------------------------------------------------ */
/* World assembly                                                      */
/* ------------------------------------------------------------------ */

export function buildWorld(options: WorldOptions = {}): World {
  const lowPower = !!options.lowPower;
  const root = new THREE.Group();
  root.name = 'world';

  const island = createIsland();
  root.add(island.group);

  const terrainHeight = island.terrainHeight;
  const radiusAt = island.radiusAt;

  // Focal point: the house, sitting just off-centre.
  const house = createHouse(terrainHeight, -0.95, 0.3, -0.3);
  root.add(house.group);

  // Windmill opposite the house so the two anchors balance.
  const windmill = createWindmill(terrainHeight, 1.95, -1.15, 0.58);
  root.add(windmill.group);

  // Trees.
  const rng = makeRng(20240924);
  const treePlan: Array<{ kind: TreeKind; x: number; z: number }> = [
    { kind: 'pine', x: -2.0, z: -1.3 },
    { kind: 'pine', x: -2.2, z: 0.5 },
    { kind: 'round', x: 2.3, z: -0.15 },
    { kind: 'round', x: 1.05, z: -2.05 },
    { kind: 'bush', x: -1.1, z: 2.0 },
    { kind: 'round', x: -1.85, z: 1.25 },
    { kind: 'pine', x: 0.0, z: -2.35 },
    { kind: 'bush', x: -0.35, z: 2.25 },
  ];

  const trees: SwayRef[] = [];
  for (const plan of treePlan) {
    const tree = createTree(plan.kind, rng);
    tree.group.position.set(plan.x, terrainHeight(plan.x, plan.z) - 0.03, plan.z);
    root.add(tree.group);
    trees.push({ group: tree.group, phase: rng() * TAU, amp: tree.amp });
  }

  // Rocks, kept clear of the pond and buildings.
  const rockPlan: Array<[number, number, number]> = [
    [1.9, -1.9, 0.26],
    [-1.9, -1.9, 0.22],
    [1.6, 2.1, 0.2],
    [-1.7, 2.0, 0.24],
    [0.4, 2.6, 0.18],
    [-2.4, 0.0, 0.3],
  ];
  for (const [rx, rz, rr] of rockPlan) {
    const rock = createRockMesh(rng, rr);
    rock.position.set(rx, terrainHeight(rx, rz) + rr * 0.3, rz);
    root.add(rock);
  }

  // A few small rocks nestled against the pond shore.
  for (let i = 0; i < 5; i++) {
    const theta = rng() * TAU;
    const radius = island.pond.r * (1.18 + rng() * 0.2);
    const rx = island.pond.x + Math.cos(theta) * radius;
    const rz = island.pond.z + Math.sin(theta) * radius;
    const rock = createRockMesh(rng, 0.12 + rng() * 0.08);
    rock.position.set(rx, terrainHeight(rx, rz) + 0.05, rz);
    root.add(rock);
  }

  // Fence along the open left rim, clear of the pond and the buildings.
  const fenceGroup = new THREE.Group();
  const fenceAngles = [1.95, 2.25, 2.55];
  const posts: THREE.Vector3[] = [];
  for (const angle of fenceAngles) {
    const radius = radiusAt(angle) * 0.88;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    const py = terrainHeight(px, pz);
    posts.push(new THREE.Vector3(px, py, pz));
    const post = cylinder(M.woodDark, 0.05, 0.56, px, py + 0.26, pz);
    fenceGroup.add(post);
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i];
    const b = posts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);
    for (const height of [0.3, 0.48]) {
      const rail = box(M.wood, length, 0.05, 0.035, (a.x + b.x) / 2, (a.y + b.y) / 2 + height, (a.z + b.z) / 2);
      rail.rotation.y = yaw;
      fenceGroup.add(rail);
    }
  }
  fenceGroup.name = 'fence';
  root.add(fenceGroup);

  // Garden path from the door towards the windmill.
  const doorWorld = new THREE.Vector3(-0.34, 0, 0.6).applyEuler(new THREE.Euler(0, -0.3, 0));
  const pathCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.95 + doorWorld.x, 0, 0.3 + doorWorld.z),
    new THREE.Vector3(-0.15, 0, 0.95),
    new THREE.Vector3(0.95, 0, 0.35),
    new THREE.Vector3(1.55, 0, -0.55),
    new THREE.Vector3(1.72, 0, -0.95),
  ]);
  const path = new THREE.Mesh(createPathGeometry(pathCurve, 0.36, terrainHeight, 64), M.path);
  path.name = 'path';
  path.castShadow = false;
  path.receiveShadow = true;
  root.add(path);

  // Flowers.
  const flowers: SwayRef[] = [];
  const flowerPlan: Array<[number, number]> = [
    [-0.15, 1.15],
    [0.5, 0.35],
    [-1.6, -0.15],
    [1.25, 0.8],
    [-1.0, 1.6],
    [0.9, -1.5],
  ];
  for (const [fx, fz] of flowerPlan) {
    const cluster = createFlowerCluster(rng);
    cluster.position.set(fx, terrainHeight(fx, fz) + 0.01, fz);
    root.add(cluster);
    flowers.push({ group: cluster, phase: rng() * TAU, amp: 0.05 });
  }

  // Clouds.
  // Clouds drift in a ring around the island, at heights that stay inside the
  // downward-looking frame so they read as sky around a floating island.
  const clouds: CloudRef[] = [];
  const cloudCount = lowPower ? 5 : 9;
  for (let i = 0; i < cloudCount; i++) {
    const cloud = createCloud(rng);
    const angle = rng() * TAU;
    const distance = 7.5 + rng() * 7;
    const baseY = -1.3 + rng() * 4.2;
    cloud.position.set(Math.cos(angle) * distance, baseY, Math.sin(angle) * distance);
    root.add(cloud);
    clouds.push({ group: cloud, baseY, phase: rng() * TAU });
  }

  // Floating pebbles orbiting the island.
  const floaters: FloaterRef[] = [];
  const floaterPlan: Array<[number, number, number]> = [
    [2.9, -2.4, 0.16],
    [-3.0, -1.8, 0.13],
    [2.6, 2.9, 0.11],
  ];
  for (const [fx, fz, fr] of floaterPlan) {
    const mesh = createRockMesh(rng, fr);
    const baseY = 0.1 + rng() * 0.5;
    mesh.position.set(fx, baseY, fz);
    root.add(mesh);
    floaters.push({ mesh, baseY, phase: rng() * TAU });
  }

  // Chimney smoke.
  const smokeGroup = new THREE.Group();
  root.add(smokeGroup);
  const smokeOrigin = new THREE.Vector3(0.42, 0.78, -0.3).applyEuler(
    new THREE.Euler(0, -0.3, 0),
  );
  smokeOrigin.add(new THREE.Vector3(-0.95, terrainHeight(-0.95, 0.3) - 0.05, 0.3));
  const smoke: SmokePuff[] = [];
  const smokeCount = lowPower ? 5 : 10;
  for (let i = 0; i < smokeCount; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.smoke,
      roughness: 1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(GEO.sphere, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    smokeGroup.add(mesh);
    smoke.push({
      mesh,
      material,
      life: i / smokeCount,
      speed: 0.16 + rng() * 0.1,
      spread: 0.03 + rng() * 0.05,
    });
  }

  /* --- per-frame animation ---------------------------------------- */
  const update = (dt: number, elapsed: number, env: UpdateEnv): void => {
    const wind = clamp(env.wind, 0, 1);
    const motion = env.reducedMotion ? 0.35 : 1;

    // Windmill only turns when the wind blows.
    windmill.rotor.rotation.z -= wind * 3.4 * dt;

    for (const tree of trees) {
      const amp = tree.amp * wind * motion;
      tree.group.rotation.z = Math.sin(elapsed * 1.25 + tree.phase) * amp;
      tree.group.rotation.x = Math.cos(elapsed * 1.05 + tree.phase * 1.3) * amp * 0.7;
    }

    for (const flower of flowers) {
      flower.group.rotation.z = Math.sin(elapsed * 2.1 + flower.phase) * flower.amp * wind * motion;
    }

    // Clouds drift downwind and wrap around the island.
    for (const cloud of clouds) {
      cloud.group.position.x += wind * 1.8 * dt;
      cloud.group.position.y =
        cloud.baseY + Math.sin(elapsed * 0.5 + cloud.phase) * 0.1 * motion;
      if (cloud.group.position.x > 15) {
        cloud.group.position.x = -15;
        cloud.group.position.z = -11 + ((cloud.phase * 53) % 22);
      }
    }

    // Wind-blown smoke.
    for (const puff of smoke) {
      puff.life += dt * puff.speed;
      if (puff.life >= 1) {
        puff.life -= 1;
        puff.mesh.position.set(
          smokeOrigin.x + (Math.random() - 0.5) * 0.1,
          smokeOrigin.y,
          smokeOrigin.z + (Math.random() - 0.5) * 0.1,
        );
      }
      const age = puff.life;
      puff.mesh.position.y = smokeOrigin.y + age * 1.1;
      puff.mesh.position.x += wind * 0.5 * dt;
      puff.mesh.position.z += wind * 0.18 * dt;
      puff.mesh.scale.setScalar(0.03 + age * 0.075 + puff.spread * age);
      puff.material.opacity = 0.22 * Math.sin(age * Math.PI);
    }

    for (const floater of floaters) {
      floater.mesh.position.y =
        floater.baseY + Math.sin(elapsed * 0.8 + floater.phase) * 0.14 * motion;
      floater.mesh.rotation.y += dt * 0.15 * motion;
    }

    // Gentle floating bob.
    root.position.y = env.reducedMotion ? 0 : Math.sin(elapsed * 0.55) * 0.05;

    // Water shimmers subtly.
    island.water.position.y = island.pond.y + Math.sin(elapsed * 1.1) * 0.006;
  };

  return {
    root,
    terrainHeight,
    groundY: (x: number, z: number) => root.position.y + terrainHeight(x, z),
    radiusAt,
    isInside: (x: number, z: number) =>
      Math.hypot(x, z) < radiusAt(Math.atan2(z, x)) * 0.99,
    house: house.group,
    houseHitTargets: house.targets,
    windowMaterial: M.window,
    houseLight: house.light,
    rotor: windmill.rotor,
    trees,
    flowers,
    clouds,
    cloudMaterial: M.cloud,
    water: island.water,
    pond: island.pond,
    update,
  };
}
