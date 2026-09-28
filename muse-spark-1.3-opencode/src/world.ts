import * as THREE from 'three';

export interface TreeRef {
  root: THREE.Group;
  crowns: THREE.Object3D[];
  phase: number;
}

export interface WorldRefs {
  island: THREE.Group;
  house: THREE.Group;
  houseWindows: THREE.MeshStandardMaterial[];
  porchLight: THREE.PointLight;
  porchBulb: THREE.MeshStandardMaterial;
  lanternLight: THREE.PointLight;
  lanternBulb: THREE.MeshStandardMaterial;
  blades: THREE.Group;
  trees: TreeRef[];
  clouds: THREE.Group[];
  cloudMat: THREE.MeshStandardMaterial;
  waterMat: THREE.MeshStandardMaterial;
  rippleRings: THREE.Mesh[];
  lakeCenter: THREE.Vector3;
  lakeRadius: number;
  chimneyTip: THREE.Object3D;
  grassMat: THREE.MeshStandardMaterial;
}

/** Deterministic pseudo-random for stable composition. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAL = {
  grass: 0x7fbf6a,
  grassDark: 0x5f9e4e,
  dirt: 0x8a6b4f,
  rock: 0x7d7469,
  rockDark: 0x5d554e,
  sand: 0xe6d49a,
  water: 0x5fa8c9,
  cream: 0xf5ead2,
  roof: 0xb65c3f,
  wood: 0x8b5e3c,
  woodDark: 0x6f4a2f,
  leafA: 0x5a9e4b,
  leafB: 0x6fb457,
  leafC: 0x4c8a3f,
  trunk: 0x7a5230,
  stone: 0x9a938a,
};

function std(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts });
}

export function buildWorld(scene: THREE.Scene): WorldRefs {
  const rand = mulberry32(20260924);
  const island = new THREE.Group();
  island.name = 'island';
  scene.add(island);

  // ---------- Island top ----------
  const grassMat = std(PAL.grass, { roughness: 1 });
  const topGeo = new THREE.CylinderGeometry(10, 9.2, 2, 48, 1, false);
  {
    const pos = topGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const theta = Math.atan2(z, x);
      const wobble = 1 + 0.07 * Math.sin(theta * 3 + 0.6) + 0.05 * Math.sin(theta * 7 + 1.3) + 0.03 * Math.sin(theta * 11);
      pos.setX(i, x * wobble);
      pos.setZ(i, z * wobble);
    }
    topGeo.computeVertexNormals();
  }
  const top = new THREE.Mesh(topGeo, [std(PAL.dirt), grassMat, std(PAL.dirt)]);
  top.position.y = -1;
  top.receiveShadow = true;
  island.add(top);

  // Soft grass inlay disc (slightly lighter, catches light)
  const inlay = new THREE.Mesh(new THREE.CircleGeometry(9.4, 40), std(0x8ccb74, { roughness: 1 }));
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.012;
  inlay.receiveShadow = true;
  island.add(inlay);

  // ---------- Rocky underside ----------
  const rockGeo = new THREE.ConeGeometry(8.6, 7.5, 28, 5, false);
  {
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = Math.sin(x * 0.9 + y * 0.5) * Math.cos(z * 0.8 - y * 0.4);
      const bulge = 1 + 0.09 * n;
      pos.setX(i, x * bulge);
      pos.setZ(i, z * bulge);
      if (y < 3) pos.setY(i, y + n * 0.35);
    }
    rockGeo.computeVertexNormals();
  }
  const rock = new THREE.Mesh(rockGeo, std(PAL.rock, { roughness: 1, flatShading: true }));
  rock.rotation.x = Math.PI; // point down
  rock.position.y = -5.7;
  island.add(rock);

  const rockTip = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.1, 0),
    std(PAL.rockDark, { flatShading: true }),
  );
  rockTip.position.y = -9.6;
  rockTip.scale.set(1, 1.5, 1);
  island.add(rockTip);

  // Crystal / strata accents on the underside
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28 + rand() * 0.3, 0),
      std(0x9fd8cb, { roughness: 0.4, emissive: 0x1d4a44, emissiveIntensity: 0.25 }),
    );
    const a = rand() * Math.PI * 2;
    const r = 2.5 + rand() * 4.5;
    s.position.set(Math.cos(a) * r, -4.2 - rand() * 2.6, Math.sin(a) * r);
    s.rotation.set(rand() * 3, rand() * 3, 0);
    island.add(s);
  }

  // Rim boulders hugging the grass edge
  const boulderMat = std(PAL.stone, { flatShading: true, roughness: 1 });
  const rimAngles = [0.4, 1.5, 2.5, 3.4, 4.4, 5.5];
  for (const a of rimAngles) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rand() * 0.45, 0), boulderMat);
    const r = 8.6 + rand() * 0.9;
    b.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
    b.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    b.castShadow = true;
    b.receiveShadow = true;
    island.add(b);
  }

  // ---------- Lake ----------
  const lakeCenter = new THREE.Vector3(3.6, 0, 1.7);
  const lakeRadius = 2.15;
  const sandRing = new THREE.Mesh(new THREE.RingGeometry(lakeRadius, lakeRadius + 0.65, 40), std(PAL.sand, { roughness: 1 }));
  sandRing.rotation.x = -Math.PI / 2;
  sandRing.position.set(lakeCenter.x, 0.02, lakeCenter.z);
  sandRing.receiveShadow = true;
  island.add(sandRing);

  const pondFloor = new THREE.Mesh(new THREE.CircleGeometry(lakeRadius, 36), std(0xcbb87e, { roughness: 1 }));
  pondFloor.rotation.x = -Math.PI / 2;
  pondFloor.position.set(lakeCenter.x, -0.12, lakeCenter.z);
  island.add(pondFloor);

  const waterMat = new THREE.MeshStandardMaterial({
    color: PAL.water,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(lakeRadius, 40), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(lakeCenter.x, 0.045, lakeCenter.z);
  water.receiveShadow = true;
  island.add(water);

  // Lily pads + one flower
  const padMat = std(0x4f9e52, { roughness: 0.8 });
  [[3.0, 1.2, 0.34], [4.3, 2.3, 0.28], [3.9, 0.9, 0.24]].forEach(([x, z, r]) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0.4, 5.6), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.07, z);
    island.add(pad);
  });
  const lily = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.13, 0),
    std(0xf6a8c0, { roughness: 0.6, emissive: 0x5a2233, emissiveIntensity: 0.15 }),
  );
  lily.position.set(3.0, 0.16, 1.2);
  island.add(lily);

  // Ripple pool (rain)
  const rippleRings: THREE.Mesh[] = [];
  const rippleGeo = new THREE.RingGeometry(0.85, 1, 26);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(lakeCenter.x, 0.06, lakeCenter.z);
    m.visible = false;
    island.add(m);
    rippleRings.push(m);
  }

  // ---------- House (focal point) ----------
  const house = new THREE.Group();
  house.name = 'house';
  house.position.set(-3.1, 0, -1.2);
  house.rotation.y = 0.42;
  island.add(house);

  const wallMat = std(PAL.cream, { roughness: 0.85 });
  const woodMat = std(PAL.wood, { roughness: 0.8 });
  const woodDark = std(PAL.woodDark, { roughness: 0.85 });
  const roofMat = std(PAL.roof, { roughness: 0.75 });

  const W = 3.3, H = 2.2, D = 2.9, RH = 1.5;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat);
  walls.position.y = H / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  house.add(walls);

  // Timber frame accents
  for (const sx of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, 0.08), woodDark);
    beam.position.set(sx * (W / 2 - 0.08), H / 2, D / 2 + 0.02);
    house.add(beam);
  }
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.15, 0.18, D + 0.15), woodMat);
  trim.position.y = H - 0.05;
  trim.castShadow = true;
  house.add(trim);

  // Gable triangles (front/back along z? walls face +z; ridge along x)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-D / 2, 0);
  gableShape.lineTo(D / 2, 0);
  gableShape.lineTo(0, RH);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  for (const sx of [-1, 1]) {
    const g = new THREE.Mesh(gableGeo, wallMat);
    g.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.position.set(sx * W / 2, H, 0);
    g.castShadow = true;
    house.add(g);
  }

  // Roof panels
  const slopeLen = Math.sqrt((D / 2 + 0.35) ** 2 + RH ** 2);
  const ang = Math.atan2(RH, D / 2 + 0.35);
  for (const sz of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.16, slopeLen), roofMat);
    panel.position.set(0, H + RH / 2 + 0.05, sz * ((D / 4 + 0.08)));
    panel.rotation.x = sz * ang;
    panel.castShadow = true;
    panel.receiveShadow = true;
    house.add(panel);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(W + 0.75, 0.14, 0.3), woodDark);
  ridge.position.set(0, H + RH + 0.06, 0);
  ridge.castShadow = true;
  house.add(ridge);

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), std(0x9c8d7d, { roughness: 1 }));
  chimney.position.set(W / 4, H + RH - 0.25, -D / 5);
  chimney.castShadow = true;
  house.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.66), woodDark);
  chimneyCap.position.set(W / 4, H + RH + 0.55, -D / 5);
  house.add(chimneyCap);
  const chimneyTip = new THREE.Object3D();
  chimneyTip.position.set(W / 4, H + RH + 0.7, -D / 5);
  house.add(chimneyTip);

  // Door + step + knob
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.1), woodDark);
  door.position.set(-0.55, 0.72, D / 2 + 0.03);
  house.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), std(0xffd98a, { roughness: 0.3, metalness: 0.6 }));
  knob.position.set(-0.28, 0.72, D / 2 + 0.1);
  house.add(knob);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.5), std(PAL.stone, { roughness: 1 }));
  step.position.set(-0.55, 0.07, D / 2 + 0.3);
  step.receiveShadow = true;
  house.add(step);

  // Windows (front x2, sides x1 each) — shared emissive material instances
  const houseWindows: THREE.MeshStandardMaterial[] = [];
  function makeWindow(x: number, y: number, z: number, ry = 0) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), woodMat);
    frame.castShadow = true;
    g.add(frame);
    const paneMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0xffb84d,
      emissiveIntensity: 0.06,
    });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.1), paneMat);
    g.add(pane);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.12), woodMat);
    g.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.12), woodMat);
    g.add(crossH);
    // Flower box under front windows
    g.position.set(x, y, z);
    g.rotation.y = ry;
    house.add(g);
    houseWindows.push(paneMat);
    return g;
  }
  makeWindow(0.85, 1.25, D / 2 + 0.02);
  makeWindow(-1.2, 1.25, D / 2 + 0.02);
  const sideWin = makeWindow(W / 2 + 0.02, 1.25, 0.2, Math.PI / 2);
  sideWin.position.set(W / 2 + 0.02, 1.25, 0.2);
  void sideWin;

  // Porch lamp: tiny glowing bulb + point light
  const porchBulb = new THREE.MeshStandardMaterial({ color: 0x554422, emissive: 0xffc46b, emissiveIntensity: 0.1 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), porchBulb);
  bulb.position.set(0.05, 1.55, D / 2 + 0.18);
  house.add(bulb);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.24), woodDark);
  bracket.position.set(0.05, 1.62, D / 2 + 0.08);
  house.add(bracket);
  const porchLight = new THREE.PointLight(0xffb45e, 0, 9, 2);
  porchLight.position.set(0.05, 1.6, D / 2 + 0.55);
  house.add(porchLight);

  // ---------- Windmill ----------
  const mill = new THREE.Group();
  mill.position.set(4.7, 0, -3.7);
  mill.rotation.y = -0.5;
  island.add(mill);
  const millCream = std(0xefe3c8, { roughness: 0.9 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 4.2, 12), millCream);
  tower.position.y = 2.1;
  tower.castShadow = true;
  tower.receiveShadow = true;
  mill.add(tower);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.0 - i * 0.1, 1.04 - i * 0.1, 0.16, 12), woodMat);
    band.position.y = 0.9 + i * 1.1;
    mill.add(band);
  }
  const millRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.1, 12), std(PAL.roof, { roughness: 0.8 }));
  millRoof.position.y = 4.75;
  millRoof.castShadow = true;
  mill.add(millRoof);
  const millDoor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.1), woodDark);
  millDoor.position.set(0, 0.55, 1.12);
  mill.add(millDoor);
  const millWinMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, emissive: 0xffb84d, emissiveIntensity: 0.06, roughness: 0.3 });
  const millWin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.1), millWinMat);
  millWin.position.set(0, 2.6, 1.0);
  mill.add(millWin);
  houseWindows.push(millWinMat);

  const hub = new THREE.Group();
  hub.position.set(0, 3.9, 1.15);
  mill.add(hub);
  const blades = new THREE.Group();
  hub.add(blades);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), woodDark);
  nose.position.z = 0.12;
  hub.add(nose);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.08), woodDark);
    arm.position.y = 1.25;
    arm.castShadow = true;
    blade.add(arm);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.04), millCream);
    sail.position.set(0.32, 1.55, 0);
    sail.castShadow = true;
    blade.add(sail);
    blade.rotation.z = (i * Math.PI) / 2;
    blades.add(blade);
  }

  // ---------- Trees ----------
  const trees: TreeRef[] = [];
  function makeTree(x: number, z: number, s: number, leaf: number, phase: number) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 1.4 * s, 8), std(PAL.trunk, { roughness: 1 }));
    trunk.position.y = 0.7 * s;
    trunk.castShadow = true;
    root.add(trunk);
    const crowns: THREE.Object3D[] = [];
    const leafMat = std(leaf, { roughness: 0.9, flatShading: true });
    const blobs: Array<[number, number, number, number]> = [
      [0, 1.9, 0, 1.05],
      [0.55, 1.45, 0.2, 0.7],
      [-0.5, 1.5, -0.15, 0.75],
    ];
    for (const [bx, by, bz, br] of blobs) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(br * s, 1), leafMat);
      c.position.set(bx * s, by * s, bz * s);
      c.castShadow = true;
      root.add(c);
      crowns.push(c);
    }
    island.add(root);
    trees.push({ root, crowns, phase });
  }
  makeTree(-6.1, 2.3, 1.35, PAL.leafA, 0);
  makeTree(-4.7, 4.0, 0.95, PAL.leafB, 1.7);
  makeTree(0.9, -5.3, 1.1, PAL.leafC, 3.1);
  makeTree(6.6, 0.7, 0.8, PAL.leafB, 4.4);
  makeTree(-1.1, 4.9, 0.7, PAL.leafA, 5.5);
  makeTree(1.8, 4.4, 1.0, PAL.leafC, 2.3);

  // ---------- Path stones ----------
  const stoneMat = std(0xd9cba3, { roughness: 1 });
  const pathPts = [
    [-2.6, 0.6], [-1.6, 1.1], [-0.5, 1.4], [0.7, 1.5], [1.8, 1.5], [2.6, 1.5],
    [-1.9, -0.6], [-0.9, -1.6], [0.3, -2.4], [1.8, -3.0], [3.2, -3.4],
  ];
  for (const [x, z] of pathPts) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.32 + rand() * 0.12, 0.36 + rand() * 0.12, 0.09, 9), stoneMat);
    st.position.set(x, 0.045, z);
    st.rotation.y = rand() * Math.PI;
    st.receiveShadow = true;
    island.add(st);
  }

  // ---------- Fence ----------
  const fence = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(postGeo, woodMat);
    p.position.set(-6.4 + i * 0.85, 0.35, -1.6 - i * 0.12);
    p.castShadow = true;
    fence.add(p);
  }
  for (const h of [0.35, 0.58]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 0.08), woodMat);
    rail.position.set(-4.3, h, -2.1);
    rail.rotation.y = 0.14;
    fence.add(rail);
  }
  island.add(fence);

  // ---------- Flowers & grass tufts ----------
  const flowerCols = [0xe86a7a, 0xffd166, 0xf4f1de, 0xc77dff];
  const clearOf = (x: number, z: number) => {
    const dLake = Math.hypot(x - lakeCenter.x, z - lakeCenter.z);
    const dHouse = Math.hypot(x + 3.1, z + 1.2);
    const dMill = Math.hypot(x - 4.7, z + 3.7);
    return dLake > 3.1 && dHouse > 2.8 && dMill > 2.0 && Math.hypot(x, z) < 8.2;
  };
  let placed = 0;
  let guard = 0;
  while (placed < 26 && guard++ < 300) {
    const x = (rand() * 2 - 1) * 8;
    const z = (rand() * 2 - 1) * 8;
    if (!clearOf(x, z)) continue;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), std(PAL.leafC));
    stem.position.set(x, 0.15, z);
    island.add(stem);
    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.09, 0),
      std(flowerCols[placed % flowerCols.length], { roughness: 0.6 }),
    );
    head.position.set(x, 0.34, z);
    island.add(head);
    placed++;
  }
  const tuftMat = std(PAL.grassDark, { roughness: 1 });
  for (let i = 0; i < 30; i++) {
    const x = (rand() * 2 - 1) * 8.4;
    const z = (rand() * 2 - 1) * 8.4;
    if (!clearOf(x, z)) continue;
    const tuft = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3 + rand() * 0.15, 5), tuftMat);
      c.position.set((rand() - 0.5) * 0.18, 0.15, (rand() - 0.5) * 0.18);
      c.rotation.z = (rand() - 0.5) * 0.4;
      tuft.add(c);
    }
    tuft.position.set(x, 0, z);
    island.add(tuft);
  }

  // Lantern by the path (glows with house lights)
  const lantern = new THREE.Group();
  lantern.position.set(0.7, 0, 2.1);
  island.add(lantern);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 8), woodDark);
  pole.position.y = 0.55;
  pole.castShadow = true;
  lantern.add(pole);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), woodDark);
  cage.position.y = 1.2;
  lantern.add(cage);
  const lanternBulb = new THREE.MeshStandardMaterial({ color: 0x554422, emissive: 0xffc46b, emissiveIntensity: 0.1 });
  const lampGlass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), lanternBulb);
  lampGlass.position.y = 1.2;
  lantern.add(lampGlass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 4), woodDark);
  cap.position.y = 1.43;
  cap.rotation.y = Math.PI / 4;
  lantern.add(cap);
  const lanternLight = new THREE.PointLight(0xffb45e, 0, 7, 2);
  lanternLight.position.y = 1.25;
  lantern.add(lanternLight);

  // ---------- Clouds ----------
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const clouds: THREE.Group[] = [];
  const cloudDefs: Array<[number, number, number, number]> = [
    [-11, 9.2, -5, 1.25], [9, 10.4, -8, 1.5], [12, 8.6, 5, 1.0], [-9, 10.8, 8, 1.35],
  ];
  for (const [x, y, z, s] of cloudDefs) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const r = (0.7 + rand() * 0.7) * s;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat);
      puff.position.set((i - n / 2) * 0.95 * s + (rand() - 0.5), (rand() - 0.5) * 0.5, (rand() - 0.5) * 1.1);
      puff.scale.y = 0.72;
      g.add(puff);
    }
    g.position.set(x, y, z);
    scene.add(g);
    clouds.push(g);
  }

  // Tiny orbiting rock shards (sell the "floating" idea)
  const shardMat = std(PAL.rockDark, { flatShading: true });
  [[11.5, -3, 2], [-11, -4.5, -3], [2, -6.5, 10]].forEach(([x, y, z], i) => {
    const sh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + i * 0.12, 0), shardMat);
    sh.position.set(x, y, z);
    sh.userData.orbit = { r: Math.hypot(x, z), speed: 0.05 + i * 0.02, a: Math.atan2(z, x), y };
    island.add(sh);
  });

  return {
    island, house, houseWindows, porchLight, porchBulb,
    lanternLight, lanternBulb, blades, trees, clouds, cloudMat,
    waterMat, rippleRings, lakeCenter, lakeRadius, chimneyTip, grassMat,
  };
}
