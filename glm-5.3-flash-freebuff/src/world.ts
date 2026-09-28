import * as THREE from 'three';
import { TINTS } from './palette';
import { makeNoise2D, makeRng, disposeObject } from './geometry';

export const ISLAND_R = 22;

export interface Tree {
  group: THREE.Group;
  phase: number;
  stiffness: number;
  headPivot: THREE.Group;
}

export interface WorldParts {
  group: THREE.Group;
  /** Clickable proxy mesh covering the house body + roof. */
  houseHitbox: THREE.Mesh;
  setHouseLights(on: boolean, duskiness: number): void;
  setWindmillSpeed(f: number): void;
  update(dt: number, elapsed: number, wind: number, reducedMotion: boolean): void;
  updateMaterials(duskiness: number, rainDim: number): void;
  dispose(): void;
}

interface Mat {
  mat: THREE.MeshLambertMaterial;
  key: keyof typeof TINTS;
}

/** Collect every tintable material so the palette can follow time of day. */
export function createMaterialSet(): Mat[] {
  const list: Mat[] = [];
  const add = (
    key: keyof typeof TINTS,
    opts: Partial<THREE.MeshLambertMaterialParameters> = {},
  ): THREE.MeshLambertMaterial => {
    const mat = new THREE.MeshLambertMaterial({ color: TINTS[key][0], ...opts });
    list.push({ mat, key });
    return mat;
  };
  void add;
  return list;
}

export function buildWorld(): WorldParts {
  const group = new THREE.Group();
  const mats: Mat[] = [];
  const M = (key: keyof typeof TINTS, opts: Partial<THREE.MeshLambertMaterialParameters> = {}): THREE.MeshLambertMaterial => {
    const mat = new THREE.MeshLambertMaterial({ color: TINTS[key][0], ...opts });
    mats.push({ mat, key });
    return mat;
  };

  const rng = makeRng(4242);
  const noise = makeNoise2D(1337);

  /* ================= terrain ================= */

  // Island silhouette: radial profile with noise for irregular shape.
  const radialNoise = (ang: number, k = 1): number =>
    1 + (noise(Math.cos(ang) * 1.8 + 4.2, Math.sin(ang) * 1.8 + 2.6) - 0.5) * 0.42 * k;

  const topR = (ang: number): number => ISLAND_R * radialNoise(ang, 1);

  // ---- grass top (slightly domed disc with irregular rim) ----
  const topSeg = 96;
  const topPos: number[] = [];
  const topIdx: number[] = [];
  const topH = (x: number, z: number): number => {
    const r = Math.hypot(x, z);
    const dome = Math.cos((r / ISLAND_R) * Math.PI * 0.5) * 0.5;
    return dome + (noise(x * 0.12 + 9, z * 0.12 + 7) - 0.5) * 0.4;
  };
  for (let i = 0; i <= topSeg; i++) {
    const ang = (i / topSeg) * Math.PI * 2;
    const r = topR(ang);
    for (let j = 0; j <= 8; j++) {
      const rr = (j / 8) * r;
      const x = Math.cos(ang) * rr;
      const z = Math.sin(ang) * rr;
      topPos.push(x, topH(x, z), z);
    }
  }
  for (let i = 0; i < topSeg; i++) {
    for (let j = 0; j < 8; j++) {
      const a = i * 9 + j;
      const b = a + 9;
      // winding chosen so faces point +y (visible from above)
      topIdx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
  topGeo.setIndex(topIdx);
  topGeo.computeVertexNormals();
  const grassMat = M('grassTop', { side: THREE.DoubleSide });
  const grassTop = new THREE.Mesh(topGeo, grassMat);
  grassTop.receiveShadow = true;
  group.add(grassTop);

  // ---- cliff skirt: dark earth/rock band under the rim ----
  const skirtGeo = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true);
  // scale each top vertex pair to the island's noisy radius
  {
    const pos = skirtGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ang = Math.atan2(v.z, v.x);
      const r = topR(ang);
      const y = v.y; // -0.5..0.5
      pos.setXYZ(i, Math.cos(ang) * r, y * 2.4 - 1.15, Math.sin(ang) * r);
    }
    skirtGeo.computeVertexNormals();
  }
  const skirtMat = M('dirt');
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = 0.05;
  group.add(skirt);

  // ---- sculpted rocky underside (cone of stacked noisy shells) ----
  const underMat = M('rock');
  const underDarkMat = M('rockDark');
  const underside = new THREE.Group();

  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const t0 = i / layers;
    const t1 = (i + 1) / layers;
    const r0 = ISLAND_R * radialNoise(i * 2.3 + 1, 1.4) * (0.94 - t0 * 0.84);
    const r1 = ISLAND_R * radialNoise(i * 2.3 + 2, 1.4) * (0.94 - t1 * 0.84);
    const y0 = -2.35 - t0 * 16.5;
    const y1 = -2.35 - t1 * 16.5;
    const h = y0 - y1;
    // open-ended so caps never poke through the grass top
    const geo = new THREE.CylinderGeometry(r0, r1, h, 22 + i * 3, 1, true);
    // jitter vertices for rocky irregularity
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let vi = 0; vi < pos.count; vi++) {
      v.fromBufferAttribute(pos, vi);
      const ang = Math.atan2(v.z, v.x);
      const rr = Math.hypot(v.x, v.z);
      if (rr > 0.05) {
        const n = noise(Math.cos(ang) * 2.2 + i * 5, Math.sin(ang) * 2.2 + i * 3);
        const k = 0.9 + n * 0.18; // stay close to the silhouette
        pos.setXYZ(vi, v.x * k, v.y + (noise(vi * 0.7 + i, 3.3) - 0.5) * h * 0.24, v.z * k);
      }
    }
    geo.translate(0, (y0 + y1) / 2, 0); // stack at its depth, not origin!
    geo.computeVertexNormals();
    const layer = new THREE.Mesh(geo, i % 2 === 0 ? underMat : underDarkMat);
    layer.castShadow = true;
    layer.receiveShadow = true;
    underside.add(layer);
  }
  // bottom tip
  const tipGeo = new THREE.ConeGeometry(
    ISLAND_R * radialNoise(layers * 2.3 + 2, 1.4) * 0.13,
    4.2,
    14,
  );
  const tip = new THREE.Mesh(tipGeo, underDarkMat);
  tip.rotation.x = Math.PI;
  tip.position.y = -2.35 - 16.5 - 2.1;
  underside.add(tip);

  // floating rock shards around the island
  const shardGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 7; i++) {
    const s = 0.5 + rng() * 1.5;
    const m = new THREE.Mesh(shardGeo, i % 2 ? underMat : underDarkMat);
    const ang = rng() * Math.PI * 2;
    const rad = ISLAND_R + 7 + rng() * 16;
    m.position.set(Math.cos(ang) * rad, -4 - rng() * 15, Math.sin(ang) * rad);
    m.scale.set(s, s * (0.7 + rng() * 0.5), s * (0.8 + rng() * 0.4));
    m.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    m.castShadow = false;
    underside.add(m);
  }
  group.add(underside);

  /* ================= pond ================= */

  const pondGroup = new THREE.Group();
  const POND_X = 9.5;
  const POND_Z = 7.5;
  const POND_R = 5.6;

  const pondMat = new THREE.MeshPhongMaterial({
    color: TINTS.water[0],
    transparent: true,
    opacity: 0.88,
    shininess: 90,
    specular: 0x99ccee,
  });
  const pondGeo = new THREE.CircleGeometry(POND_R, 48);
  // organic outline
  {
    const pos = pondGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector2();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i));
      const ang = Math.atan2(v.y, v.x);
      const k = 1 + (noise(Math.cos(ang) * 1.6 + 31, Math.sin(ang) * 1.6 + 17) - 0.5) * 0.3;
      pos.setXY(i, v.x * k, v.y * k);
    }
    pondGeo.computeVertexNormals();
  }
  const pond = new THREE.Mesh(pondGeo, pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(POND_X, 0.62, POND_Z);
  pondGroup.add(pond);

  // sandy shore ring slightly above grass
  const shoreMat = M('path');
  const shoreGeo = new THREE.RingGeometry(POND_R * 0.92, POND_R * 1.28, 48, 1);
  {
    const pos = shoreGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector2();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i));
      const ang = Math.atan2(v.y, v.x);
      const k = 1 + (noise(Math.cos(ang) * 1.6 + 31, Math.sin(ang) * 1.6 + 17) - 0.5) * 0.3;
      pos.setXY(i, v.x * k, v.y * k);
    }
    shoreGeo.computeVertexNormals();
  }
  const shore = new THREE.Mesh(shoreGeo, shoreMat);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(POND_X, 0.66, POND_Z);
  shore.receiveShadow = true;
  pondGroup.add(shore);

  // reeds around the shore
  const reedMat = M('foliageDark');
  const reedGeo = new THREE.ConeGeometry(0.09, 1.5, 5);
  for (let i = 0; i < 14; i++) {
    const ang = rng() * Math.PI * 2;
    const rr = POND_R * (1.05 + rng() * 0.22);
    const reed = new THREE.Mesh(reedGeo, reedMat);
    reed.position.set(POND_X + Math.cos(ang) * rr, 1.2, POND_Z + Math.sin(ang) * rr);
    reed.rotation.z = (rng() - 0.5) * 0.3;
    pondGroup.add(reed);
  }
  group.add(pondGroup);

  /* ================= house ================= */

  const house = new THREE.Group();
  const HX = -5.2;
  const HZ = -3.4;

  const wallMat = M('wall');
  const woodMat = M('wood');
  const woodDarkMat = M('woodDark');
  const roofMat = M('roof');
  const roofCapMat = M('roofCap');

  const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 5), wallMat);
  body.position.y = 1.7;
  body.castShadow = true;
  body.receiveShadow = true;
  house.add(body);

  // stone plinth
  const plinthMat = M('rockDark');
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.55, 5.5), plinthMat);
  plinth.position.y = 0.28;
  plinth.receiveShadow = true;
  house.add(plinth);

  // roof: two slabs + gable fills
  const roofLen = 7.4;
  const roofW = 3.6;
  const roofH = 2.4;
  const slabGeo = new THREE.BoxGeometry(roofLen, 0.28, Math.hypot(roofW, roofH) + 0.25);
  const slabL = new THREE.Mesh(slabGeo, roofMat);
  slabL.position.set(0, 3.4 + roofH / 2, roofW / 2 - 0.3);
  slabL.rotation.x = Math.atan2(roofW, roofH);
  slabL.castShadow = true;
  house.add(slabL);
  const slabR = slabL.clone();
  slabR.position.z = -roofW / 2 + 0.3;
  slabR.rotation.x = -slabL.rotation.x;
  house.add(slabR);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.2, 0);
  gableShape.lineTo(3.2, 0);
  gableShape.lineTo(0, roofH);
  gableShape.closePath();
  const gableGeo2 = new THREE.ExtrudeGeometry(gableShape, { depth: 0.24, bevelEnabled: false });
  const gableMat = wallMat;
  const gable1 = new THREE.Mesh(gableGeo2, gableMat);
  gable1.position.set(0, 3.4, 2.26);
  house.add(gable1);
  const gable2 = gable1.clone();
  gable2.position.z = -2.5;
  house.add(gable2);

  // roof ridge beam
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(roofLen + 0.4, 0.24, 0.5), roofCapMat);
  ridge.position.y = 3.4 + roofH + 0.1;
  house.add(ridge);

  // door + frame on the front (facing camera +x/+z quadrant)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.1, 0.18), woodDarkMat);
  door.position.set(1.1, 1.05, 2.56);
  house.add(door);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.3, 0.12), woodMat);
  doorFrame.position.set(1.1, 1.15, 2.52);
  house.add(doorFrame);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshLambertMaterial({ color: 0xf2c14e }));
  knob.position.set(1.55, 1.0, 2.68);
  house.add(knob);

  // windows (emissive when lit)
  const winGlassMat = new THREE.MeshLambertMaterial({
    color: 0x223a52,
    emissive: 0x000000,
  });
  const winGlassMat2 = winGlassMat.clone();
  const mkWindow = (x: number, y: number, z: number, ry: number, mat: THREE.Material): THREE.Group => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.16), woodMat);
    g.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.96, 0.1), mat);
    glass.position.z = 0.06;
    g.add(glass);
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.96, 0.14), woodDarkMat);
    barV.position.z = 0.08;
    g.add(barV);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.09, 0.14), woodDarkMat);
    barH.position.z = 0.08;
    g.add(barH);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.3), woodMat);
    sill.position.set(0, -0.72, 0.05);
    g.add(sill);
    g.position.set(x, y, z);
    g.rotation.y = ry;
    return g;
  };
  house.add(mkWindow(-1.6, 1.9, 2.56, 0, winGlassMat));
  house.add(mkWindow(-1.6, 1.9, -2.56, Math.PI, winGlassMat2));
  house.add(mkWindow(3.26, 1.9, 0, Math.PI / 2, winGlassMat.clone()));
  // round attic window on gable
  const attic = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), winGlassMat.clone());
  attic.position.set(0, 4.6, 2.42);
  house.add(attic);
  const atticRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 20), woodDarkMat);
  atticRing.position.copy(attic.position);
  house.add(atticRing);

  // chimney with brick cap
  const chimneyMat = M('rock');
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.5, 0.95), chimneyMat);
  chimney.position.set(-1.9, 5.0, -1.0);
  chimney.castShadow = true;
  house.add(chimney);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.2), roofCapMat);
  cap.position.set(-1.9, 6.3, -1.0);
  house.add(cap);

  // little awning over the door
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.9), roofMat);
  awning.position.set(1.1, 2.45, 2.9);
  awning.rotation.x = 0.28;
  house.add(awning);

  house.position.set(HX, 0.5, HZ); // settle onto the grass dome
  group.add(house);

  // ---- house lights ----
  const windowLight = new THREE.PointLight(0xffb85c, 0, 16, 1.8);
  windowLight.position.set(HX, 2.2, HZ + 1.2);
  group.add(windowLight);

  // Materials that get an emissive amber wash when the house is lit. The side
  // window uses a third clone, so collect them explicitly.
  const glowMats: THREE.MeshLambertMaterial[] = [
    winGlassMat,
    winGlassMat2,
    attic.material as THREE.MeshLambertMaterial,
  ];

  /* ================= windmill ================= */

  const mill = new THREE.Group();
  const MX = 13.5;
  const MZ = -8.5;

  const towerPoints: THREE.Vector2[] = [];
  towerPoints.push(new THREE.Vector2(1.1, 0));
  towerPoints.push(new THREE.Vector2(1.35, 1.2));
  towerPoints.push(new THREE.Vector2(1.5, 2.8));
  towerPoints.push(new THREE.Vector2(1.15, 4.4));
  towerPoints.push(new THREE.Vector2(0.75, 5.2));
  const tower = new THREE.Mesh(new THREE.LatheGeometry(towerPoints, 20), wallMat);
  tower.castShadow = true;
  tower.receiveShadow = true;
  mill.add(tower);

  const millCap = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.3, 16), roofMat);
  millCap.position.y = 5.2 + 0.6;
  millCap.castShadow = true;
  mill.add(millCap);

  const millDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.15), woodDarkMat);
  millDoor.position.set(0, 0.65, 1.12);
  mill.add(millDoor);

  const millWin = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), winGlassMat.clone());
  millWin.position.set(0, 3.1, 1.28);
  mill.add(millWin);
  const millWinRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 14), woodDarkMat);
  millWinRing.position.copy(millWin.position);
  mill.add(millWinRing);

  // blades assembly
  const blades = new THREE.Group();
  const hubMat = woodDarkMat;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12), hubMat);
  hub.rotation.x = Math.PI / 2;
  blades.add(hub);
  const armMat = woodMat;
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xf5ecd7 });
  mats.push({ mat: sailMat, key: 'wall' });

  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.6, 0.12), armMat);
    shaft.position.y = 2.8;
    arm.add(shaft);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.4, 0.06), sailMat);
    sail.position.set(0.52, 2.9, 0);
    sail.rotation.z = 0.06;
    arm.add(sail);
    const lattice = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.05), armMat);
    lattice.position.set(0.5, 3.4, 0.03);
    arm.add(lattice);
    const lattice2 = lattice.clone();
    lattice2.position.y = 1.9;
    arm.add(lattice2);
    arm.rotation.z = (i / 4) * Math.PI * 2;
    blades.add(arm);
  }
  blades.position.set(0, 4.6, 1.35);
  blades.rotation.x = -0.12;
  mill.add(blades);

  mill.position.set(MX, 0, MZ);
  mill.rotation.y = 0.72; // blades face the default three-quarter camera
  group.add(mill);

  // windmill yard: paving circle
  const paving = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), shoreMat);
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(MX, 0.67, MZ);
  paving.receiveShadow = true;
  group.add(paving);

  /* ================= path ================= */

  const pathMat = shoreMat;
  const pathGroup = new THREE.Group();
  const pathPts: THREE.Vector3[] = [];
  // from house door to windmill, with a branch to the pond
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // quadratic bezier: door (HX+1.1, HZ+2.6) → mid (-1, 6.5) → mill (MX-1.2, MZ+1.6)
    const p0 = new THREE.Vector3(HX + 1.1, 0, HZ + 2.6);
    const p1 = new THREE.Vector3(-2.5, 0, 8.5);
    const p2 = new THREE.Vector3(MX - 1.4, 0, MZ + 1.7);
    const p = new THREE.Vector3();
    pbez(p0, p1, p2, t, p);
    p.x += (noise(i * 0.6 + 3, 8.8) - 0.5) * 1.6;
    p.z += (noise(i * 0.6 + 3, 15.2) - 0.5) * 1.6;
    pathPts.push(p);
  }
  const slabGeo2 = new THREE.CircleGeometry(0.42, 7);
  for (let i = 0; i < pathPts.length; i++) {
    const p = pathPts[i];
    const n = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const slab = new THREE.Mesh(slabGeo2, pathMat);
      slab.rotation.x = -Math.PI / 2;
      slab.rotation.z = rng() * Math.PI;
      slab.position.set(p.x + (rng() - 0.5) * 0.8, 0.67 + rng() * 0.02, p.z + (rng() - 0.5) * 0.8);
      slab.scale.setScalar(0.7 + rng() * 0.5);
      slab.receiveShadow = true;
      pathGroup.add(slab);
    }
  }
  // branch to pond
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const a = new THREE.Vector3(-1.2, 0, 6.0);
    const b = new THREE.Vector3(POND_X - 3.4, 0, POND_Z + 2.0);
    const p = a.clone().lerp(b, t);
    p.x += (noise(i + 21, 5) - 0.5) * 0.8;
    const slab = new THREE.Mesh(slabGeo2, pathMat);
    slab.rotation.x = -Math.PI / 2;
    slab.rotation.z = rng() * Math.PI;
    slab.position.set(p.x, 0.67, p.z);
    slab.scale.setScalar(0.6 + rng() * 0.4);
    slab.receiveShadow = true;
    pathGroup.add(slab);
  }
  group.add(pathGroup);

  /* ================= fence around house yard ================= */

  const fenceMat = M('fence');
  const postGeo = new THREE.BoxGeometry(0.14, 0.85, 0.14);
  const railGeo = new THREE.BoxGeometry(1.6, 0.09, 0.07);
  const fence = new THREE.Group();
  const fenceSeg = (x1: number, z1: number, x2: number, z2: number): void => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const n = Math.max(2, Math.round(len / 1.6));
    const ang = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(x1 + dx * t, 0.42, z1 + dz * t);
      post.castShadow = true;
      fence.add(post);
    }
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      for (const yy of [0.32, 0.62]) {
        const rail = new THREE.Mesh(railGeo, fenceMat);
        rail.position.set(x1 + dx * t, yy, z1 + dz * t);
        rail.rotation.y = ang;
        rail.scale.x = len / n / 1.6;
        fence.add(rail);
      }
    }
  };
  // yard on two sides, leaving path + view open
  fenceSeg(HX - 4.6, HZ + 3.4, HX - 4.6, HZ - 4.2);
  fenceSeg(HX - 4.6, HZ - 4.2, HX + 4.4, HZ - 4.2);
  group.add(fence);

  /* ================= trees ================= */

  const trees: Tree[] = [];
  const trunkMat = M('trunk');
  const foliageMats = [M('foliage'), M('foliageDark')];

  const mkTree = (x: number, z: number, scale: number, kind: 0 | 1): Tree => {
    const g = new THREE.Group();
    const head = new THREE.Group();

    const trunkH = 2.2 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const fm = foliageMats[kind];
    if (kind === 0) {
      // fluffy blob tree: clustered spheres
      const blob = new THREE.Group();
      const blobs = 6;
      for (let i = 0; i < blobs; i++) {
        const s = scale * (0.95 + rng() * 0.75);
        const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), fm);
        const a = (i / blobs) * Math.PI * 2;
        const rr = scale * 0.75;
        b.position.set(Math.cos(a) * rr, trunkH + scale * (0.9 + rng() * 0.9), Math.sin(a) * rr);
        b.castShadow = true;
        blob.add(b);
      }
      const crown = new THREE.Mesh(new THREE.SphereGeometry(scale * 1.5, 12, 10), fm);
      crown.position.y = trunkH + scale * 1.6;
      crown.scale.y = 0.85;
      crown.castShadow = true;
      blob.add(crown);
      head.add(blob);
    } else {
      // conifer: stacked cones
      const tiers = 3;
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        const r = scale * (1.5 - t * 0.85);
        const h = scale * 1.9;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), fm);
        cone.position.y = trunkH + i * scale * 1.05 + h * 0.32;
        cone.castShadow = true;
        head.add(cone);
      }
    }

    g.add(head);
    g.position.set(x, 0.45, z);
    g.rotation.y = rng() * Math.PI * 2;
    group.add(g);
    const tree: Tree = { group: g, phase: rng() * Math.PI * 2, stiffness: 0.55 + rng() * 0.5, headPivot: head };
    trees.push(tree);
    return tree;
  };

  // composition: big tree behind house, pair near pond, conifers at the back edge
  mkTree(HX - 6.0, HZ + 1.5, 1.5, 0);
  mkTree(HX + 4.6, HZ - 5.6, 1.1, 0);
  mkTree(-9, 11.5, 1.25, 0);
  mkTree(2.5, 14.0, 0.95, 1);
  mkTree(-16.5, -2.5, 1.05, 1);
  mkTree(16.5, 6.5, 1.3, 0);
  mkTree(6.5, -13.5, 1.15, 1);
  mkTree(-4.5, -13.0, 0.9, 1);
  mkTree(17.5, -2.0, 0.8, 0);
  mkTree(-13.0, 7.0, 0.85, 0);

  /* ================= rocks, flowers, bushes ================= */

  const rockMat = underMat;
  const rockGeoSm = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 9; i++) {
    const ang = rng() * Math.PI * 2;
    const rr = 8 + rng() * 12;
    const x = Math.cos(ang) * rr;
    const z = Math.sin(ang) * rr;
    if (Math.hypot(x - POND_X, z - POND_Z) < POND_R + 1.4) continue;
    const s = 0.28 + rng() * 0.7;
    const rock = new THREE.Mesh(rockGeoSm, rockMat);
    rock.position.set(x, 0.45 + s * 0.3, z);
    rock.scale.set(s, s * 0.7, s);
    rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    rock.castShadow = true;
    group.add(rock);
  }

  // flower dots: tiny instanced crosses of color
  const flowerColors = [0xf27d9d, 0xf7d154, 0xffffff, 0xd88ef5];
  const flowerGeo = new THREE.SphereGeometry(0.09, 6, 5);
  const flowerGeos: THREE.InstancedMesh[] = [];
  for (let ci = 0; ci < flowerColors.length; ci++) {
    const mat = new THREE.MeshLambertMaterial({ color: flowerColors[ci] });
    mats.push({ mat, key: 'flower' });
    const im = new THREE.InstancedMesh(flowerGeo, mat, 26);
    im.count = 26;
    flowerGeos.push(im);
    group.add(im);
  }
  {
    const m4 = new THREE.Matrix4();
    let placed = 0;
    let guard = 0;
    while (placed < flowerColors.length * 26 && guard < 2000) {
      guard++;
      const x = (rng() - 0.5) * 2 * (ISLAND_R - 2);
      const z = (rng() - 0.5) * 2 * (ISLAND_R - 2);
      if (Math.hypot(x, z) > ISLAND_R - 2.2) continue;
      if (Math.hypot(x - POND_X, z - POND_Z) < POND_R + 1.1) continue;
      if (Math.abs(x - HX) < 4.6 && Math.abs(z - HZ) < 4.0) continue;
      if (Math.hypot(x - MX, z - MZ) < 3.2) continue;
      // keep off the path corridor (rough check)
      let onPath = false;
      for (const p of pathPts) {
        if (Math.hypot(x - p.x, z - p.z) < 1.15) {
          onPath = true;
          break;
        }
      }
      if (onPath) continue;
      const ci = placed % flowerColors.length;
      const im = flowerGeos[ci];
      const idx = Math.floor(placed / flowerColors.length);
      m4.makeTranslation(x, 0.66, z);
      im.setMatrixAt(idx, m4);
      placed++;
    }
    for (const im of flowerGeos) im.instanceMatrix.needsUpdate = true;
  }

  /* ================= bridge over pond inlet + dock ================= */
  const dockMat = woodMat;
  const dock = new THREE.Group();
  const plankGeo = new THREE.BoxGeometry(1.7, 0.12, 0.5);
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(plankGeo, dockMat);
    plank.position.set(POND_X - POND_R - 1.1 + i * 0.55, 0.78, POND_Z - 1.6);
    plank.rotation.y = 0.12;
    dock.add(plank);
  }
  const dockLegGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
  for (const lx of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(dockLegGeo, dockMat);
    leg.position.set(POND_X - POND_R - 0.2 + lx * 0.4, 0.45, POND_Z - 1.6);
    dock.add(leg);
  }
  group.add(dock);

  /* ================= hitbox + lights API ================= */

  const houseHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 7.6, 6.8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  houseHitbox.position.set(HX, 3.6, HZ);
  houseHitbox.userData.isHouse = true;
  group.add(houseHitbox);

  const warmHex = new THREE.Color(0xffca6e);

  const setHouseLights = (on: boolean, duskiness: number): void => {
    // emissive windows: stronger when dark outside, softly visible by day
    const e = (on ? 1 : 0) * (0.55 + 0.45 * duskiness);
    for (const m of glowMats) {
      m.emissive.copy(warmHex).multiplyScalar(e * 1.4);
    }
    windowLight.intensity = on ? 1.1 + duskiness * 1.6 : 0;
  };

  /* ================= per-frame updates ================= */

  const update = (dt: number, elapsed: number, wind: number, reducedMotion: boolean): void => {
    // windmill: speed follows wind with inertia
    const targetSpeed = wind * 2.6;
    millSpeed += (targetSpeed - millSpeed) * Math.min(1, dt * 1.6);
    if (!reducedMotion) blades.rotation.z -= millSpeed * dt;
    else blades.rotation.z -= millSpeed * dt * 0.35;

    // trees sway
    if (!reducedMotion) {
      for (const t of trees) {
        const sway = Math.sin(elapsed * (1.1 + wind * 1.6) + t.phase) * (0.012 + wind * 0.075);
        const gust = Math.sin(elapsed * 0.7 + t.phase * 0.5) * wind * 0.03;
        t.headPivot.rotation.x = sway * t.stiffness + gust * 0.4;
        t.headPivot.rotation.z = -sway * t.stiffness * 1.2 + gust;
      }
    }
  };

  let millSpeed = 0;

  const updateMaterials = (duskiness: number, rainDim: number): void => {
    for (const { mat, key } of mats) {
      mat.color.setHex(tintHex2(key, duskiness, rainDim));
    }
    // water & special materials handled here too
    pondMat.color.setHex(tintHex2('water', duskiness, rainDim));
    sailMat.color.setHex(tintHex2('wall', duskiness, rainDim));
  };

  function tintHex2(key: keyof typeof TINTS, dusk: number, rain: number): number {
    const [day, night] = TINTS[key];
    const c = tmpColor.setHex(day).lerp(tmpColor2.setHex(night), Math.min(1, dusk));
    if (rain > 0) c.lerp(tmpColor3.setHex(0x46506a), rain * 0.45);
    return c.getHex();
  }
  const tmpColor = new THREE.Color();
  const tmpColor2 = new THREE.Color();
  const tmpColor3 = new THREE.Color();

  return {
    group,
    houseHitbox,
    setHouseLights,
    setWindmillSpeed: (f: number) => {
      millSpeed = f;
    },
    update,
    updateMaterials,
    dispose: () => disposeObject(group),
  };
}

function pbez(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number, out: THREE.Vector3): void {
  const it = 1 - t;
  out.set(
    it * it * p0.x + 2 * it * t * p1.x + t * t * p2.x,
    0,
    it * it * p0.z + 2 * it * t * p1.z + t * t * p2.z,
  );
}
