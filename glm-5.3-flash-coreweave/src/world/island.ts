import * as THREE from 'three';
import type { WorldPiece, UpdaterCtx } from '../state';
import { M } from '../materials';
import { blobShape, rng, sculptRock } from '../util';

/** Grass cap + sculpted rocky underside + a few floating companion rocks. */
export function createIsland(): WorldPiece {
  const group = new THREE.Group();

  // ---- grass top slab ---------------------------------------------------------
  const shape = blobShape(7, 26, 0.06, 11);
  const topGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.28,
    bevelSegments: 2,
    steps: 1,
  });
  topGeo.rotateX(-Math.PI / 2);
  topGeo.computeBoundingBox();
  const bb = topGeo.boundingBox!;
  topGeo.translate(-(bb.max.x + bb.min.x) / 2, -bb.max.y, -(bb.max.z + bb.min.z) / 2);
  // ExtrudeGeometry groups: 0 = lids (grass), 1 = sides+bevel (dirt).
  const topMesh = new THREE.Mesh(topGeo, [M.grass, M.dirt]);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // ---- sculpted underside -----------------------------------------------------
  // Profile runs tip → rim → axis cap so the lathe closes as a solid.
  const profile = [
    new THREE.Vector2(0.001, -6.0),
    new THREE.Vector2(0.45, -5.9),
    new THREE.Vector2(1.1, -5.65),
    new THREE.Vector2(2.0, -5.25),
    new THREE.Vector2(3.1, -4.7),
    new THREE.Vector2(4.3, -3.95),
    new THREE.Vector2(5.6, -3.1),
    new THREE.Vector2(6.6, -2.2),
    new THREE.Vector2(7.35, -1.3),
    new THREE.Vector2(7.6, -0.6),
    new THREE.Vector2(0.001, -0.55),
  ];
  const underGeo = new THREE.LatheGeometry(profile, 48);
  sculptRock(underGeo, {
    seed: 23,
    radialAmount: 0.12,
    yJitter: 0.1,
    minY: -6.0,
    maxY: -0.6,
    topColor: new THREE.Color('#a08c74'),
    bottomColor: new THREE.Color('#5d5044'),
  });
  const underMesh = new THREE.Mesh(underGeo, M.rock);
  underMesh.castShadow = true;
  underMesh.receiveShadow = true;
  group.add(underMesh);

  // ---- floating companion rocks ------------------------------------------------
  interface Shard {
    mesh: THREE.Mesh;
    baseY: number;
    phase: number;
    spin: number;
  }
  const shards: Shard[] = [];
  const shardSpecs: Array<[number, number, number, number, number]> = [
    // x, y, z, scale, seed
    [8.8, -3.2, 1.8, 0.9, 31],
    [-8.2, -2.0, -3.0, 0.6, 41],
    [6.2, -5.4, -6.2, 0.5, 47],
  ];
  for (const [x, y, z, s, seed] of shardSpecs) {
    const geo = sculptRock(new THREE.DodecahedronGeometry(s, 0), {
      seed,
      radialAmount: 0.2,
      yJitter: 0,
    });
    const mesh = new THREE.Mesh(geo, M.rockGray);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
    mesh.castShadow = true;
    group.add(mesh);
    shards.push({ mesh, baseY: y, phase: rng() * Math.PI * 2, spin: 0.03 + rng() * 0.05 });
  }

  return {
    group,
    update(ctx: UpdaterCtx) {
      const bobAmp = ctx.reduced ? 0.04 : 0.25;
      for (const s of shards) {
        s.mesh.position.y = s.baseY + Math.sin(ctx.elapsed * 0.6 + s.phase) * bobAmp;
        s.mesh.rotation.y += s.spin * ctx.dt * (ctx.reduced ? 0.2 : 1);
      }
    },
  };
}
