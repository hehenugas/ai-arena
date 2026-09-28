import * as THREE from 'three';
import type { UpdaterCtx, WorldPiece } from '../state';
import { M } from '../materials';
import { blobShape, mulberry32 } from '../util';

const POND_X = 3.1;
const POND_Z = 2.5;
const WATER_R = 2.1;

const dayWater = new THREE.Color('#6fa8c9');
const nightWater = new THREE.Color('#2c4258');
const stormWater = new THREE.Color('#66727c');
const tmp = new THREE.Color();

interface Ripple {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number; // 0 = idle, >0 = running
  dur: number;
  size: number;
}

/**
 * Muted-blue pond with a sandy shoreline, plus a pooled ripple system:
 * rain drives dense ripples, light wind leaves occasional small ones.
 */
export function createPond(): WorldPiece {
  const group = new THREE.Group();

  // shoreline (slightly larger blob, sits just above the grass)
  const shoreGeo = new THREE.ShapeGeometry(blobShape(WATER_R + 0.34, 18, 0.085, 61), 18);
  shoreGeo.rotateX(-Math.PI / 2);
  const shore = new THREE.Mesh(shoreGeo, M.shore);
  shore.position.set(POND_X, 0.02, POND_Z);
  shore.receiveShadow = true;
  group.add(shore);

  // water surface — vertex colors fake depth (dark center → lighter shore)
  const waterGeo = new THREE.ShapeGeometry(blobShape(WATER_R, 18, 0.09, 62), 18);
  waterGeo.rotateX(-Math.PI / 2);
  {
    const pos = waterGeo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const deep = new THREE.Color('#3f7fa8');
    const shallow = new THREE.Color('#7fb3cf');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const t = Math.min(Math.hypot(x, z) / WATER_R, 1);
      c.copy(deep).lerp(shallow, Math.pow(t, 0.8));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    waterGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  const waterMat = M.water.clone();
  waterMat.vertexColors = true;
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(POND_X, 0.05, POND_Z);
  water.receiveShadow = true;
  group.add(water);

  // ripple pool (round-robin, never reallocated)
  const ringGeo = new THREE.RingGeometry(0.8, 1, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const POOL = 26;
  const ripples: Ripple[] = [];
  for (let i = 0; i < POOL; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: '#cfe3ee',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.position.set(POND_X, 0.075, POND_Z);
    mesh.visible = false;
    group.add(mesh);
    ripples.push({ mesh, mat, life: 0, dur: 1, size: 0.4 });
  }
  let cursor = 0;
  let acc = 0;
  const rand = mulberry32(97);

  return {
    group,
    update(ctx: UpdaterCtx) {
      // water mood follows time + weather
      tmp.copy(dayWater).lerp(nightWater, ctx.cycle.night);
      tmp.lerp(stormWater, ctx.smooth.weatherT * 0.7);
      waterMat.color.copy(tmp);
      water.position.y = 0.05 + Math.sin(ctx.elapsed * 1.2) * 0.006;

      // spawn rate: rain dominates, light wind leaves a gentle trail
      const rate = ctx.smooth.weatherT * 13 + ctx.smooth.wind * 1.2;
      if (rate < 0.05) return;
      acc += rate * ctx.dt;
      while (acc >= 1) {
        acc -= 1;
        const r = ripples[cursor];
        cursor = (cursor + 1) % POOL;
        const heavy = ctx.smooth.weatherT > 0.35;
        r.size = (heavy ? 0.34 : 0.2) * (0.8 + rand() * 0.5);
        r.dur = 0.7 + rand() * 0.5;
        r.life = 0.0001;
        const a = rand() * Math.PI * 2;
        const rad = Math.sqrt(rand()) * (WATER_R - 0.4);
        r.mesh.position.set(POND_X + Math.cos(a) * rad, 0.075, POND_Z + Math.sin(a) * rad);
        r.mesh.visible = true;
      }

      for (const r of ripples) {
        if (r.life <= 0) continue;
        r.life += ctx.dt / r.dur;
        if (r.life >= 1) {
          r.life = 0;
          r.mesh.visible = false;
          r.mat.opacity = 0;
          continue;
        }
        const s = r.size * (0.18 + 1.25 * Math.pow(r.life, 0.65));
        r.mesh.scale.setScalar(Math.max(s, 0.001));
        r.mat.opacity = (1 - r.life) * (0.12 + 0.25 * ctx.smooth.weatherT);
      }
    },
  };
}
