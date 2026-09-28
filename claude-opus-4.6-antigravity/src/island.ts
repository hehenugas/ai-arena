import * as THREE from 'three';

function seededRandom(seed: number): number {
  return (Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1;
}

function absSeededRandom(seed: number): number {
  return Math.abs(seededRandom(seed));
}

function displaceVertices(
  geometry: THREE.BufferGeometry,
  amount: number,
  seed: number,
  axis?: 'x' | 'y' | 'z' | 'all'
) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const dx = seededRandom(seed + i * 3) * amount;
    const dy = seededRandom(seed + i * 3 + 1) * amount;
    const dz = seededRandom(seed + i * 3 + 2) * amount;
    if (axis === 'x' || axis === 'all' || !axis) pos.setX(i, pos.getX(i) + dx);
    if (axis === 'y' || axis === 'all' || !axis) pos.setY(i, pos.getY(i) + dy);
    if (axis === 'z' || axis === 'all' || !axis) pos.setZ(i, pos.getZ(i) + dz);
  }
  geometry.computeVertexNormals();
}

function createTree(
  height: number,
  trunkRadius: number,
  seed: number
): { mesh: THREE.Group; canopies: THREE.Mesh[] } {
  const tree = new THREE.Group();
  const canopies: THREE.Mesh[] = [];

  const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, height * 0.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = height * 0.2;
  trunk.castShadow = true;
  tree.add(trunk);

  const greens = [0x3d6b2e, 0x4a7a38, 0x5a8c3c];
  const layers = 2 + (seed % 2);
  for (let i = 0; i < layers; i++) {
    const layerRadius = (height * 0.35) * (1 - i * 0.2);
    const layerHeight = height * 0.35;
    const coneGeo = new THREE.ConeGeometry(layerRadius, layerHeight, 7);
    displaceVertices(coneGeo, 0.08, seed + i * 100, 'all');
    const coneMat = new THREE.MeshStandardMaterial({
      color: greens[i % greens.length],
      roughness: 0.85,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = height * 0.4 + i * layerHeight * 0.55;
    cone.castShadow = true;
    tree.add(cone);
    canopies.push(cone);
  }

  return { mesh: tree, canopies };
}

function createWindmill(): { group: THREE.Group; blades: THREE.Group } {
  const group = new THREE.Group();

  // Tower — tapered cylinder
  const towerGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 8);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.8 });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = 1.5;
  tower.castShadow = true;
  group.add(tower);

  // Cap
  const capGeo = new THREE.ConeGeometry(0.35, 0.5, 8);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.8 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 3.25;
  cap.castShadow = true;
  group.add(cap);

  // Blades
  const blades = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd4c9b0, roughness: 0.7 });
  const bladeGeo = new THREE.BoxGeometry(0.15, 1.4, 0.03);

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.75;
    blade.castShadow = true;

    const arm = new THREE.Group();
    arm.add(blade);
    arm.rotation.z = (Math.PI / 2) * i;
    blades.add(arm);
  }

  blades.position.set(0, 2.9, 0.3);
  group.add(blades);

  return { group, blades };
}

export function createIsland(): {
  group: THREE.Group;
  house: THREE.Group;
  windows: THREE.Mesh[];
  pond: THREE.Mesh;
  pondRippleTarget: THREE.Mesh;
} {
  const group = new THREE.Group();

  // --- Island base ---
  const grassGeo = new THREE.CylinderGeometry(8, 7.5, 0.5, 24, 3);
  displaceVertices(grassGeo, 0.3, 42, 'all');
  // Keep the top surface mostly flat for placing objects
  const grassPos = grassGeo.attributes.position;
  for (let i = 0; i < grassPos.count; i++) {
    if (grassPos.getY(i) > 0.15) {
      grassPos.setY(i, 0.25 + absSeededRandom(i * 7) * 0.08);
    }
  }
  grassGeo.computeVertexNormals();
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x5a8c3c, roughness: 0.9 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.receiveShadow = true;
  group.add(grass);

  const rockGeo = new THREE.ConeGeometry(7, 6, 20, 6);
  displaceVertices(rockGeo, 0.6, 137, 'all');
  // Taper the bottom irregularly
  const rockPos = rockGeo.attributes.position;
  for (let i = 0; i < rockPos.count; i++) {
    const y = rockPos.getY(i);
    if (y < -2) {
      const squeeze = 0.3 + absSeededRandom(i * 13) * 0.5;
      rockPos.setX(i, rockPos.getX(i) * squeeze);
      rockPos.setZ(i, rockPos.getZ(i) * squeeze);
    }
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.y = -3;
  rock.rotation.x = Math.PI;
  rock.receiveShadow = true;
  group.add(rock);

  // --- House ---
  const house = new THREE.Group();
  house.position.set(1, 0.25, -0.5);

  const wallGeo = new THREE.BoxGeometry(2.2, 2, 2.2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.8 });
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = 1;
  walls.castShadow = true;
  walls.receiveShadow = true;
  house.add(walls);

  // Pyramid roof — 4 radial segments
  const roofGeo = new THREE.ConeGeometry(1.9, 1.2, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.75 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 2.6;
  roof.rotation.y = Math.PI / 4; // align edges with walls
  roof.castShadow = true;
  house.add(roof);

  // Door
  const doorGeo = new THREE.BoxGeometry(0.5, 0.9, 0.05);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.45, 1.13);
  house.add(door);

  // Windows
  const windows: THREE.Mesh[] = [];
  const windowGeo = new THREE.BoxGeometry(0.4, 0.4, 0.06);
  const windowPositions = [
    { x: 1.13, y: 1.2, z: 0, ry: Math.PI / 2 },   // right side
    { x: -1.13, y: 1.2, z: 0, ry: Math.PI / 2 },   // left side
    { x: 0.45, y: 1.2, z: 1.13, ry: 0 },            // front, beside door
  ];
  for (const wp of windowPositions) {
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x88ccee,
      emissive: 0x000000,
      emissiveIntensity: 1.0,
      roughness: 0.3,
      metalness: 0.1,
    });
    const win = new THREE.Mesh(windowGeo, winMat);
    win.position.set(wp.x, wp.y, wp.z);
    win.rotation.y = wp.ry;
    house.add(win);
    windows.push(win);
  }

  // Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.85 });
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(0.6, 2.9, -0.5);
  chimney.castShadow = true;
  house.add(chimney);

  group.add(house);

  // --- Pond ---
  const pondGeo = new THREE.CircleGeometry(1.5, 24);
  const pondMat = new THREE.MeshStandardMaterial({
    color: 0x4488aa,
    transparent: true,
    opacity: 0.7,
    metalness: 0.3,
    roughness: 0.2,
  });
  const pond = new THREE.Mesh(pondGeo, pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-3, 0.32, 2);
  pond.receiveShadow = true;
  group.add(pond);

  // Shoreline bank beneath
  const bankGeo = new THREE.CircleGeometry(1.8, 24);
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
  const bank = new THREE.Mesh(bankGeo, bankMat);
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(-3, 0.3, 2);
  group.add(bank);

  // Ripple target — slightly above pond for additive rain effects
  const rippleGeo = new THREE.CircleGeometry(1.5, 24);
  const rippleMat = new THREE.MeshStandardMaterial({
    color: 0x4488aa,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const pondRippleTarget = new THREE.Mesh(rippleGeo, rippleMat);
  pondRippleTarget.rotation.x = -Math.PI / 2;
  pondRippleTarget.position.set(-3, 0.34, 2);
  group.add(pondRippleTarget);

  // --- Trees ---
  const treeCanopies: THREE.Mesh[] = [];
  const originalTreePositions = new Map<string, { rx: number; rz: number }>();

  const treeSpots = [
    { x: 4.5, z: 2, h: 3.0, r: 0.14, seed: 10 },
    { x: 5, z: -1.5, h: 2.5, r: 0.12, seed: 20 },
    { x: -5, z: -2, h: 3.5, r: 0.15, seed: 30 },
    { x: -4, z: -0.5, h: 2.0, r: 0.10, seed: 40 },
    { x: 3, z: -4, h: 2.8, r: 0.13, seed: 50 },
    { x: -1, z: 4.5, h: 1.8, r: 0.11, seed: 60 },
    { x: 1, z: 4, h: 2.3, r: 0.12, seed: 70 },
  ];

  for (const spot of treeSpots) {
    const { mesh, canopies } = createTree(spot.h, spot.r, spot.seed);
    mesh.position.set(spot.x, 0.25, spot.z);
    mesh.castShadow = true;
    group.add(mesh);

    for (const c of canopies) {
      treeCanopies.push(c);
      originalTreePositions.set(c.uuid, { rx: c.rotation.x, rz: c.rotation.z });
    }
  }

  // --- Windmill ---
  const windmill = createWindmill();
  windmill.group.position.set(-2, 0.25, -3);
  group.add(windmill.group);

  // --- Path from house to island edge ---
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xc4a873, roughness: 0.9 });
  const pathPoints = [
    { x: 1, z: 0.7 },
    { x: 0.8, z: 1.8 },
    { x: 0.3, z: 2.8 },
    { x: -0.3, z: 3.8 },
    { x: -0.8, z: 4.8 },
    { x: -1.2, z: 5.5 },
  ];
  const pathStoneGeo = new THREE.BoxGeometry(0.6, 0.04, 0.5);
  for (const pp of pathPoints) {
    const stone = new THREE.Mesh(pathStoneGeo, pathMat);
    stone.position.set(pp.x, 0.27, pp.z);
    stone.rotation.y = seededRandom(pp.x * 100 + pp.z) * 0.4;
    stone.receiveShadow = true;
    group.add(stone);
  }

  // --- Fence near house ---
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });
  const postGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
  const railGeo = new THREE.BoxGeometry(0.04, 0.04, 0.9);

  const fencePosts = [
    { x: 2.5, z: 0.5 },
    { x: 2.5, z: 1.4 },
    { x: 2.5, z: 2.3 },
  ];
  for (const fp of fencePosts) {
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(fp.x, 0.5, fp.z);
    post.castShadow = true;
    group.add(post);
  }
  // Top rail
  const rail1 = new THREE.Mesh(railGeo, fenceMat);
  rail1.position.set(2.5, 0.6, 0.95);
  group.add(rail1);
  const rail2 = new THREE.Mesh(railGeo, fenceMat);
  rail2.position.set(2.5, 0.6, 1.85);
  group.add(rail2);
  // Lower rail
  const rail3 = new THREE.Mesh(railGeo, fenceMat);
  rail3.position.set(2.5, 0.4, 0.95);
  group.add(rail3);
  const rail4 = new THREE.Mesh(railGeo, fenceMat);
  rail4.position.set(2.5, 0.4, 1.85);
  group.add(rail4);

  // --- Rocks ---
  const rockScatterMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
  const rockScatterGeo = new THREE.SphereGeometry(0.15, 5, 4);
  const rockSpots = [
    { x: 3, z: 3, sx: 1.2, sy: 0.7, sz: 1, c: 0x888888 },
    { x: -5.5, z: 1, sx: 0.8, sy: 0.6, sz: 1.3, c: 0x777766 },
    { x: 4, z: -3.5, sx: 1.5, sy: 0.5, sz: 0.9, c: 0x888888 },
    { x: -1, z: -4, sx: 1, sy: 0.8, sz: 1.1, c: 0x808070 },
    { x: 2, z: 3.5, sx: 0.7, sy: 0.9, sz: 1.2, c: 0x777766 },
    { x: -4.5, z: 3.5, sx: 1.1, sy: 0.6, sz: 0.8, c: 0x888888 },
    { x: 5.5, z: 0.5, sx: 0.9, sy: 0.7, sz: 1, c: 0x808070 },
    { x: -3, z: -4.5, sx: 1.3, sy: 0.5, sz: 1, c: 0x777766 },
  ];
  for (const rs of rockSpots) {
    const mat = rs.c === 0x888888 ? rockScatterMat :
      new THREE.MeshStandardMaterial({ color: rs.c, roughness: 0.9 });
    const r = new THREE.Mesh(rockScatterGeo, mat);
    r.position.set(rs.x, 0.3, rs.z);
    r.scale.set(rs.sx, rs.sy, rs.sz);
    r.rotation.y = seededRandom(rs.x * 50) * Math.PI;
    r.castShadow = true;
    r.receiveShadow = true;
    group.add(r);
  }

  // --- Flower clusters ---
  const flowerGeo = new THREE.SphereGeometry(0.06, 5, 4);
  const flowerColors = [0xe85577, 0xf0aa33, 0xee77bb, 0xff6644, 0xffcc55];
  const flowerSpots = [
    { x: 2.5, z: 3 },
    { x: -2, z: 3.5 },
    { x: 4, z: -0.5 },
    { x: -5, z: 0 },
    { x: 0, z: -3.5 },
  ];
  for (let fi = 0; fi < flowerSpots.length; fi++) {
    const fs = flowerSpots[fi];
    // Each cluster has 3-4 small spheres
    const clusterCount = 3 + (fi % 2);
    const fMat = new THREE.MeshStandardMaterial({
      color: flowerColors[fi % flowerColors.length],
      roughness: 0.7,
    });
    for (let j = 0; j < clusterCount; j++) {
      const flower = new THREE.Mesh(flowerGeo, fMat);
      const ox = seededRandom(fi * 30 + j * 7) * 0.3;
      const oz = seededRandom(fi * 30 + j * 7 + 1) * 0.3;
      flower.position.set(fs.x + ox, 0.32, fs.z + oz);
      group.add(flower);
    }
  }

  // --- Store animation references ---
  group.userData.windmillBlades = windmill.blades;
  group.userData.treeCanopies = treeCanopies;
  group.userData.windows = windows;
  group.userData.originalTreePositions = originalTreePositions;

  return { group, house, windows, pond, pondRippleTarget };
}
