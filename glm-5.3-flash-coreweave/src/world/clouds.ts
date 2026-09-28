import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { UpdaterCtx, WorldPiece } from '../state';
import { M } from '../materials';
import { mulberry32 } from '../util';

/** World heading the wind blows toward — shared by clouds, rain and smoke. */
export const WIND_HEADING = new THREE.Vector3(0.93, 0, 0.36).normalize();

const dayCloud = new THREE.Color('#f2efe6');
const nightCloud = new THREE.Color('#46506a');
const stormTint = new THREE.Color('#79848f');
const stormDay = new THREE.Color('#5d6874');
const stormNight = new THREE.Color('#262c36');
const tmp = new THREE.Color();

function makeCloudGeometry(puffCount: number, seed: number): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < puffCount; k++) {
    const mid = 1 - Math.abs(k - (puffCount - 1) / 2) / ((puffCount - 1) / 2 || 1);
    const s = (0.5 + rand() * 0.45) * (0.7 + 0.5 * mid);
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(s, s * 0.6, s);
    g.translate(
      (k - (puffCount - 1) / 2) * 0.85 * (0.8 + rand() * 0.4),
      rand() * 0.25,
      (rand() - 0.5) * 0.7,
    );
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}

interface Cloud {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
}

/** Drifting puff clusters + one big storm cloud that appears when it rains. */
export function createClouds(): WorldPiece {
  const group = new THREE.Group();
  const clouds: Cloud[] = [];

  const rand = mulberry32(501);
  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(makeCloudGeometry(4 + (i % 2), 520 + i * 13), M.cloud);
    const r = 11 + rand() * 6;
    const a = rand() * Math.PI * 2;
    const y = 4.2 + rand() * 3.4;
    mesh.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    mesh.scale.setScalar(0.75 + rand() * 0.75);
    mesh.rotation.y = rand() * Math.PI * 2;
    group.add(mesh);
    clouds.push({ mesh, baseY: y, phase: rand() * Math.PI * 2 });
  }

  const storm = new THREE.Mesh(makeCloudGeometry(9, 733), M.cloudStorm);
  storm.castShadow = true;
  storm.visible = false;
  group.add(storm);

  return {
    group,
    update(ctx: UpdaterCtx) {
      // palette (emissive tracks the tint so undersides never go murky)
      tmp.copy(dayCloud).lerp(nightCloud, ctx.cycle.night);
      M.cloud.color.copy(tmp).lerp(stormTint, ctx.smooth.weatherT * 0.8);
      M.cloud.emissive.copy(M.cloud.color);
      M.cloudStorm.color.copy(stormDay).lerp(stormNight, ctx.cycle.night);
      M.cloudStorm.emissive.copy(M.cloudStorm.color);

      // drift with the shared wind
      const speed = (0.18 + ctx.smooth.wind * 1.3) * (ctx.reduced ? 0.15 : 1);
      for (const c of clouds) {
        c.mesh.position.addScaledVector(WIND_HEADING, speed * ctx.dt);
        const proj = c.mesh.position.dot(WIND_HEADING);
        if (proj > 26) c.mesh.position.addScaledVector(WIND_HEADING, -52);
        const bob = ctx.reduced ? 0.1 : 0.35;
        c.mesh.position.y =
          c.baseY + Math.sin(ctx.elapsed * 0.3 + c.phase) * bob;
      }

      // storm cloud gathers above the island while it rains
      const w = ctx.smooth.weatherT;
      storm.visible = w > 0.02;
      if (storm.visible) {
        const s = 0.55 + 0.75 * w;
        storm.scale.setScalar(s);
        storm.position.set(0, 10.6 - 2.1 * w, 0);
        storm.rotation.y += ctx.dt * 0.02;
      }
    },
  };
}
