import * as THREE from 'three';
import { fbm2, hash2, mulberry32 } from '../utils/noise';

/**
 * Shared placement constants — the whole composition lives in one place so
 * nothing overlaps and the scene stays intentional.
 */
export const ISLAND_RADIUS = 7.2;
export const POND_POS = new THREE.Vector2(3.0, -2.4);
export const POND_RADIUS = 1.65;
export const HOUSE_POS = new THREE.Vector2(1.2, 1.7);
export const WINDMILL_POS = new THREE.Vector2(-4.2, 3.3);

/**
 * Height of the grassy surface at a point (matches the actual mesh bumps).
 * Inside the island it returns the soft meadow height; in the void it dips
 * below the underside so falling rain can recycle there.
 */
export function groundHeightAt(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);
  if (r < ISLAND_RADIUS * 0.985) {
    return 0.75 + (fbm2(x * 0.9, z * 0.9, 3) - 0.5) * 0.5;
  }
  return -7.5;
}

export interface IslandHandle {
  group: THREE.Group;
  groundHeightAt: (x: number, z: number) => number;
}

const GRASS_COLORS = [
  new THREE.Color('#5f9e52'),
  new THREE.Color('#79b365'),
  new THREE.Color('#4e8a46'),
  new THREE.Color('#6ba65c'),
];
const SOIL_COLORS = [
  new THREE.Color('#8a6a4c'),
  new THREE.Color('#77573d'),
  new THREE.Color('#977354'),
  new THREE.Color('#5e4634'),
];
const ROCK_COLORS = [
  new THREE.Color('#7d6f63'),
  new THREE.Color('#6b5d52'),
  new THREE.Color('#8d8074'),
  new THREE.Color('#5c5046'),
];

function colorFbm(c: THREE.Color, t: number): THREE.Color {
  const out = c.clone();
  const light = 0.86 + hash2(t * 17.3, t * 9.7) * 0.28;
  out.multiplyScalar(light);
  return out;
}

function displaceRadial(geo: THREE.BufferGeometry, amount: number, seed: number): void {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm2(x * 0.55 + seed, z * 0.55 + seed * 7.3, 3) - 0.5;
    const f = 1 + n * 2 * amount;
    pos.setXYZ(i, x * f, y, z * f);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function createIsland(): IslandHandle {
  const group = new THREE.Group();

  // --- Grassy top -----------------------------------------------------------
  const topGeo = new THREE.CylinderGeometry(
    ISLAND_RADIUS + 0.35,
    ISLAND_RADIUS - 0.4,
    1.5,
    72,
    4,
    false
  );
  {
    const pos = topGeo.attributes.position;
    const norm = topGeo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const rimColor = new THREE.Color('#7a5a3e');
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z) || 0.0001;
      const isCap = norm.getY(i) > 0.5;

      if (isCap) {
        // Top cap: soft meadow bumps, patches of green.
        const bump = fbm2(x * 0.9, z * 0.9, 3);
        pos.setY(i, 0.75 + (bump - 0.5) * 0.5);
        const patch = fbm2(x * 0.32 + 9, z * 0.32 + 4, 3);
        const mixT = Math.min(1, Math.max(0, (patch - 0.38) * 2.4));
        c.copy(GRASS_COLORS[0]).lerp(GRASS_COLORS[1], mixT);
        if (hash2(x * 3.1, z * 3.1) > 0.86) c.lerp(GRASS_COLORS[2], 0.55);
        colorFbm(c, x * 1.7 + z);
      } else if (y > 0.25 && !isCap) {
        // Green overhanging lip at the rim.
        const t = (y - 0.25) / 0.2;
        c.copy(SOIL_COLORS[0]).lerp(GRASS_COLORS[0], t);
      } else {
        // Soil cliff side.
        const iy = (y + 0.75) / 1.0;
        c.copy(SOIL_COLORS[0])
          .lerp(SOIL_COLORS[3], iy * 0.7)
          .lerp(rimColor, Math.min(1, (r - 5.6) / 1.4) * 0.6);
        colorFbm(c, x * 1.3 + z * 0.7);
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    pos.needsUpdate = true;
    topGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    topGeo.computeVertexNormals();
  }
  const topMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // --- Rocky underside ------------------------------------------------------
  const rockGeo = new THREE.ConeGeometry(6.5, 6.9, 44, 3, true);
  rockGeo.rotateX(Math.PI);
  displaceRadial(rockGeo, 0.16, 3.7);
  {
    const pos = rockGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const t = (y + 3.45) / 6.9; // 0 at apex, 1 at base
      c.copy(ROCK_COLORS[0]).lerp(ROCK_COLORS[3], t * 0.8);
      if (fbm2(x * 1.1, z * 1.1, 2) > 0.6) c.lerp(ROCK_COLORS[2], 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    rockGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    rockGeo.computeVertexNormals();
  }
  const rockMesh = new THREE.Mesh(
    rockGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })
  );
  rockMesh.position.y = -2.9; // base tucks under the soil rim
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  group.add(rockMesh);

  // --- Hanging rock spires ---------------------------------------------------
  {
    const rng = mulberry32(987);
    const spireGeo = new THREE.ConeGeometry(1, 1, 9, 1);
    spireGeo.rotateX(Math.PI);
    const spireMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6b5d52'),
      roughness: 0.95,
      flatShading: true,
    });
    for (let i = 0; i < 6; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = 1.6 + rng() * 3.6;
      const s = 0.45 + rng() * 0.5;
      const h = 1.7 + rng() * 2.4;
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.scale.set(s, h, s);
      spire.position.set(Math.cos(ang) * rad, -0.8 - h * 0.25, Math.sin(ang) * rad);
      spire.rotation.z = (rng() - 0.5) * 0.24;
      spire.rotation.x = (rng() - 0.5) * 0.2;
      spire.castShadow = true;
      group.add(spire);
    }
  }

  return { group, groundHeightAt };
}