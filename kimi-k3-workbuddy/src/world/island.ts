import * as THREE from 'three';
import { MAT, enableShadows } from './materials';

export const ISLAND_RADIUS = 5;
export const ISLAND_TOP_Y = 0;

/** Deterministic pseudo-noise for organic shapes. */
function n2(x: number, z: number): number {
  return (
    Math.sin(x * 1.7 + z * 2.3) * 0.5 +
    Math.sin(x * 3.1 - z * 1.3) * 0.3 +
    Math.sin(x * 5.7 + z * 4.1) * 0.2
  );
}

/** Height of the grassy surface at (x, z) — used to seat objects on the dome. */
export function groundY(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);
  const dome = 0.35 * (1 - Math.pow(r / ISLAND_RADIUS, 2));
  const pondDip = Math.exp(-((x - 1.9) ** 2 + (z - 1.4) ** 2) / 1.6) * 0.45;
  return dome - pondDip + n2(x, z) * 0.03;
}

export function buildIsland(): THREE.Group {
  const group = new THREE.Group();

  // --- Grassy top: displaced disc with irregular rim ---
  const topGeo = new THREE.CircleGeometry(ISLAND_RADIUS, 64);
  topGeo.rotateX(-Math.PI / 2);
  const pos = topGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    const a = Math.atan2(z, x);
    // wobble the silhouette
    const wobble = 1 + 0.12 * Math.sin(a * 3 + 1.2) + 0.08 * Math.sin(a * 5 - 0.6) + 0.05 * Math.sin(a * 8);
    const rr = Math.min(r, ISLAND_RADIUS) ;
    const scale = r > 0.001 ? (rr * wobble) / r : 1;
    pos.setX(i, x * scale);
    pos.setZ(i, z * scale);
    // gentle doming, slight dip where the pond sits
    const dome = 0.35 * (1 - Math.pow(r / ISLAND_RADIUS, 2));
    const pondDip = Math.exp(-((x - 1.9) ** 2 + (z - 1.4) ** 2) / 1.6) * 0.45;
    pos.setY(i, dome - pondDip + n2(x, z) * 0.03);
  }
  topGeo.computeVertexNormals();
  const top = new THREE.Mesh(topGeo, MAT.grass);
  top.receiveShadow = true;
  group.add(top);

  // --- Dirt layer beneath the grass ---
  const dirtGeo = new THREE.CylinderGeometry(1, 0.86, 0.9, 48, 1, true);
  {
    const p = dirtGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const wobble = 1 + 0.1 * Math.sin(a * 3 + 1.2) + 0.07 * Math.sin(a * 5 - 0.6);
      p.setX(i, x * ISLAND_RADIUS * 0.99 * wobble);
      p.setZ(i, z * ISLAND_RADIUS * 0.99 * wobble);
    }
    dirtGeo.computeVertexNormals();
  }
  const dirt = new THREE.Mesh(dirtGeo, MAT.dirt);
  dirt.position.y = -0.45;
  group.add(dirt);

  // --- Sculpted rocky underside: stacked, displaced cones ---
  const underside = new THREE.Group();
  const layers = 5;
  for (let li = 0; li < layers; li++) {
    const t = li / (layers - 1);
    const radius = THREE.MathUtils.lerp(ISLAND_RADIUS * 0.86, 0.4, Math.pow(t, 0.85));
    const height = THREE.MathUtils.lerp(0.7, 1.15, t);
    const geo = new THREE.CylinderGeometry(radius, radius * 0.82, height, 24, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const jag = 1 + 0.14 * Math.sin(a * 4 + li * 2.1) + 0.1 * Math.sin(a * 7 - li);
      p.setX(i, x * jag + n2(x * 2 + li, z * 2) * 0.12);
      p.setZ(i, z * jag + n2(z * 2, x * 2 - li) * 0.12);
      p.setY(i, y + n2(x + li * 3, z) * 0.08);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, li % 2 === 0 ? MAT.rock : MAT.rockDark);
    mesh.position.y = -0.9 - (li * 1.05 + height / 2 - 0.5);
    mesh.rotation.y = li * 0.7;
    underside.add(mesh);
  }
  // tip rock
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 8), MAT.rockDark);
  tip.rotation.x = Math.PI;
  tip.position.y = -0.9 - layers * 1.05 - 0.5;
  underside.add(tip);
  group.add(underside);

  // A few small floating rocks near the island for charm
  const floaterGeo = new THREE.IcosahedronGeometry(0.35, 0);
  const floaters: { mesh: THREE.Mesh; phase: number; baseY: number }[] = [];
  const floaterDefs: [number, number, number, number][] = [
    [6.4, -2.2, 1.2, 0.9],
    [-6.0, -1.4, -2.0, 0.7],
    [2.2, -3.4, -5.2, 0.55]
  ];
  floaterDefs.forEach(([x, y, z, s], idx) => {
    const m = new THREE.Mesh(floaterGeo, idx % 2 ? MAT.rock : MAT.rockDark);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    m.rotation.set(idx * 1.3, idx * 2.1, idx * 0.7);
    group.add(m);
    floaters.push({ mesh: m, phase: idx * 2.1, baseY: y });
  });
  group.userData.floaters = floaters;

  enableShadows(group);
  return group;
}
