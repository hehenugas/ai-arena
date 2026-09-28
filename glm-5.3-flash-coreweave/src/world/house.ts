import * as THREE from 'three';
import type { UpdaterCtx, WorldPiece } from '../state';
import { M, makeSmokeMaterial } from '../materials';
import { rng } from '../util';

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A window: frame + emissive glass + muntins + sill. Faces local +Z. */
function makeWindow(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const frame = box(w + 0.08, h + 0.08, 0.08, M.woodDark, 0, 0, 0);
  const glass = box(w - 0.06, h - 0.06, 0.02, M.glass, 0, 0, 0.045);
  const muntinV = box(0.035, h - 0.06, 0.014, M.woodDark, 0, 0, 0.06);
  const muntinH = box(w - 0.06, 0.035, 0.014, M.woodDark, 0, 0, 0.06);
  const sill = box(w + 0.18, 0.06, 0.13, M.trim, 0, -(h / 2 + 0.05), 0.05);
  g.add(frame, glass, muntinV, muntinH, sill);
  return g;
}

interface Puff {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  age: number;
  active: boolean;
}

/**
 * Cream cottage: stone base, gabled terracotta roof, chimney with drifting
 * smoke, door, sash windows and a round gable window. Lights toggle via the
 * shared glass material + a warm porch point light.
 */
export function createHouse(): WorldPiece {
  const g = new THREE.Group();

  // foundation + walls
  g.add(box(2.7, 0.24, 2.2, M.stoneDark, 0, 0.12, 0));
  g.add(box(2.5, 1.5, 2.0, M.wall, 0, 0.99, 0));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.1, 1.5, 0.1, M.woodDark, sx * 1.2, 0.99, sz * 0.92));
    }
  }

  // gabled roof: triangle prism, ridge along X after a quarter turn
  const tri = new THREE.Shape();
  tri.moveTo(-1.45, 0);
  tri.lineTo(1.45, 0);
  tri.lineTo(0, 0.95);
  tri.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 2.7, bevelEnabled: false });
  roofGeo.translate(0, 0, -1.35);
  const roof = new THREE.Mesh(roofGeo, M.roof);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 1.74;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  g.add(box(2.8, 0.09, 0.14, M.roofDark, 0, 2.72, 0)); // ridge beam

  // chimney + cap
  g.add(box(0.32, 1.05, 0.32, M.stoneDark, 0.78, 2.02, -0.4));
  g.add(box(0.44, 0.09, 0.44, M.stone, 0.78, 2.58, -0.4));
  const chimneyTop = new THREE.Vector3(0.78, 2.66, -0.4);

  // door + step + knob
  g.add(box(0.66, 1.04, 0.07, M.woodDark, 0, 0.76, 1.0));
  g.add(box(0.54, 0.94, 0.055, M.wood, 0, 0.71, 1.035));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), M.metal);
  knob.position.set(0.17, 0.86, 1.075);
  knob.castShadow = true;
  g.add(knob);
  g.add(box(0.78, 0.1, 0.34, M.stone, 0, 0.05, 1.28));

  // windows: two front, one side, one round in the gable
  for (const x of [-0.75, 0.75]) {
    const w = makeWindow(0.5, 0.58);
    w.position.set(x, 1.1, 1.0);
    g.add(w);
  }
  const sideWin = makeWindow(0.5, 0.58);
  sideWin.rotation.y = Math.PI / 2;
  sideWin.position.set(1.25, 1.1, 0.1);
  g.add(sideWin);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.036, 10, 20), M.woodDark);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(1.35, 2.15, 0);
  ring.castShadow = true;
  g.add(ring);
  const roundGlass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), M.glass);
  roundGlass.rotation.y = Math.PI / 2;
  roundGlass.position.set(1.36, 2.15, 0);
  g.add(roundGlass);

  // potted plant by the door
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.13, 8), M.roof);
  pot.position.set(0.95, 0.075, 1.15);
  pot.castShadow = true;
  g.add(pot);
  const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), M.leaf2);
  plant.position.set(0.95, 0.19, 1.15);
  plant.castShadow = true;
  g.add(plant);

  // warm porch light driven by the house-light state
  const porch = new THREE.PointLight('#ffb35c', 0, 9, 2);
  porch.position.set(0, 1.35, 1.1);
  g.add(porch);

  // ---- smoke puffs (pooled, reused; drift with the shared wind) -----------------
  const puffGeo = new THREE.SphereGeometry(1, 7, 6);
  const puffs: Puff[] = [];
  for (let i = 0; i < 7; i++) {
    const mat = makeSmokeMaterial();
    const mesh = new THREE.Mesh(puffGeo, mat);
    mesh.visible = false;
    g.add(mesh);
    puffs.push({ mesh, mat, age: 0, active: false });
  }
  let spawnAcc = 0;
  let cursor = 0;

  g.position.set(-2.7, 0, -1.5);
  g.rotation.y = 0.52;

  return {
    group: g,
    update(ctx: UpdaterCtx) {
      const t = ctx.smooth.lightT;
      M.glass.emissiveIntensity = t * (1.5 + 1.3 * ctx.cycle.night);
      porch.intensity = t * (1.2 + 2.2 * ctx.cycle.night);

      // smoke
      const windX = 0.93;
      const windZ = 0.36;
      const drift = 0.35 + ctx.smooth.wind * 1.9;
      if (ctx.reduced) {
        for (const p of puffs) {
          p.mesh.visible = false;
          p.active = false;
        }
      } else {
        spawnAcc += ctx.dt / 0.55;
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          const p = puffs[cursor];
          cursor = (cursor + 1) % puffs.length;
          p.active = true;
          p.age = 0;
        }
        for (const p of puffs) {
          if (!p.active) continue;
          p.age += ctx.dt / 2.6;
          if (p.age >= 1) {
            p.active = false;
            p.mesh.visible = false;
            continue;
          }
          const a = p.age;
          p.mesh.visible = true;
          p.mesh.position.set(
            chimneyTop.x + windX * a * a * drift,
            chimneyTop.y + a * 1.25,
            chimneyTop.z + windZ * a * a * drift,
          );
          const s = 0.05 + a * 0.26;
          p.mesh.scale.setScalar(s);
          p.mesh.rotation.y = rng() * 0.2;
          p.mat.opacity = 0.36 * Math.min(a / 0.15, 1) * (1 - a);
        }
      }
    },
  };
}
