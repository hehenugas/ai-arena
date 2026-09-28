// Island geometry: grassy top, rocky sculpted underside
import * as THREE from 'three';

export function createIsland(): THREE.Group {
  const group = new THREE.Group();

  // --- Grassy top ---
  const topGeo = new THREE.CylinderGeometry(7.5, 8.2, 1.4, 14, 3);
  // Deform top surface for organic feel
  const topPos = topGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < topPos.count; i++) {
    const x = topPos.getX(i);
    const y = topPos.getY(i);
    const z = topPos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    // Raise center slightly, lower edges
    const wave = Math.sin(Math.atan2(z, x) * 3) * 0.18 + Math.cos(Math.atan2(z, x) * 5) * 0.1;
    const lift = Math.max(0, 1 - r / 7.5) * 0.4;
    if (y > 0) topPos.setY(i, y + lift + wave * 0.2);
    else topPos.setY(i, y - 0.1 + wave * 0.08);
  }
  topGeo.computeVertexNormals();

  const grassMat = new THREE.MeshLambertMaterial({ color: 0x6aaa4a });
  const topMesh = new THREE.Mesh(topGeo, grassMat);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Dirt band
  const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8b6340 });

  // --- Rocky underside: stacked irregular chunks ---
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a7068 });
  const rockMat2 = new THREE.MeshLambertMaterial({ color: 0x6a6060 });

  // Main rocky body
  const bodyGeo = new THREE.CylinderGeometry(6.8, 3.5, 4.0, 12, 4);
  deformRock(bodyGeo, 0.8);
  const bodyMesh = new THREE.Mesh(bodyGeo, rockMat);
  bodyMesh.position.y = -2.8;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Middle chunk
  const midGeo = new THREE.CylinderGeometry(4.2, 2.8, 2.5, 10, 3);
  deformRock(midGeo, 0.9);
  const midMesh = new THREE.Mesh(midGeo, rockMat2);
  midMesh.position.set(0.3, -5.5, -0.2);
  midMesh.castShadow = true;
  group.add(midMesh);

  // Lower tapered point
  const pointGeo = new THREE.CylinderGeometry(2.0, 0.4, 2.8, 8, 2);
  deformRock(pointGeo, 1.1);
  const pointMesh = new THREE.Mesh(pointGeo, rockMat);
  pointMesh.position.set(-0.2, -7.8, 0.3);
  pointMesh.castShadow = true;
  group.add(pointMesh);

  // Hanging rock blobs for silhouette interest
  const blobPositions: [number, number, number, number][] = [
    [4.5, -3.5, 1.5, 1.2],
    [-4.0, -4.0, -2.0, 1.0],
    [2.0, -5.0, -3.5, 0.9],
    [-2.5, -3.0, 3.0, 0.8],
    [3.5, -6.0, -1.0, 0.7],
  ];
  for (const [bx, by, bz, bs] of blobPositions) {
    const bGeo = new THREE.IcosahedronGeometry(bs, 1);
    deformRock(bGeo, 0.7);
    const bMesh = new THREE.Mesh(bGeo, rockMat2);
    bMesh.position.set(bx, by, bz);
    bMesh.castShadow = true;
    group.add(bMesh);
  }

  // Dirt/soil edge ring at top of island (between grass and rock)
  const dirtGeo = new THREE.CylinderGeometry(7.5, 7.8, 0.5, 14);
  const dirtMesh = new THREE.Mesh(dirtGeo, dirtMat);
  dirtMesh.position.y = -0.95;
  group.add(dirtMesh);

  // Moss/grass patches on upper rocks
  const mossMat = new THREE.MeshLambertMaterial({ color: 0x4a8a30 });
  const mossPositions: [number, number, number][] = [
    [3.5, -1.8, 2.0], [-3.8, -1.5, 1.5], [2.0, -2.2, -3.5],
  ];
  for (const [mx, my, mz] of mossPositions) {
    const mGeo = new THREE.SphereGeometry(0.8, 6, 4);
    const mMesh = new THREE.Mesh(mGeo, mossMat);
    mMesh.position.set(mx, my, mz);
    mMesh.scale.y = 0.4;
    group.add(mMesh);
  }

  return group;
}

function deformRock(geo: THREE.BufferGeometry, strength: number): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = (Math.sin(x * 1.7 + y * 2.3) * Math.cos(z * 1.9 + x * 1.1) * 0.5 + 0.5);
    const offset = (noise - 0.5) * strength;
    pos.setXYZ(i, x + offset * 0.3, y + offset * 0.2, z + offset * 0.3);
  }
  geo.computeVertexNormals();
}
