import * as THREE from 'three';
import type { UpdaterCtx } from '../state';
import { WIND_HEADING } from '../world/clouds';
import { mulberry32 } from '../util';

const COUNT = 320;
const UP = new THREE.Vector3(0, 1, 0);
const dayRain = new THREE.Color('#b9cfdf');
const nightRain = new THREE.Color('#6e8093');

/**
 * Instanced rain streaks in world space (not a screen overlay). The pool is
 * fixed; streaks respawn above the island when they hit the ground/island or
 * fall past the underside, and the active count follows the weather blend.
 */
export function createRain(scene: THREE.Scene) {
  const geo = new THREE.BoxGeometry(0.014, 0.38, 0.014);
  const mat = new THREE.MeshBasicMaterial({
    color: dayRain.clone(),
    transparent: true,
    opacity: 0.3,
    toneMapped: false,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; // instances move every frame
  mesh.count = 0;
  mesh.visible = false;
  scene.add(mesh);

  const rand = mulberry32(909);
  const px = new Float32Array(COUNT);
  const py = new Float32Array(COUNT);
  const pz = new Float32Array(COUNT);
  const vy = new Float32Array(COUNT);
  const len = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = 8.5 * Math.sqrt(rand());
    const a = rand() * Math.PI * 2;
    px[i] = Math.cos(a) * r;
    pz[i] = Math.sin(a) * r;
    py[i] = rand() * 10;
    vy[i] = 5.5 + rand() * 3;
    len[i] = 0.7 + rand() * 0.6;
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const fall = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const v3s = new THREE.Vector3();

  return {
    update(ctx: UpdaterCtx) {
      const w = ctx.smooth.weatherT;
      mat.opacity = 0.18 + 0.18 * w;
      mat.color.copy(dayRain).lerp(nightRain, ctx.cycle.night * 0.55);

      mesh.visible = w > 0.02;
      if (!mesh.visible) {
        mesh.count = 0;
        return;
      }
      const active = Math.max(1, Math.floor(COUNT * w));
      mesh.count = active;

      // slant follows the shared wind heading
      const vx = WIND_HEADING.x * ctx.smooth.wind * 3.4;
      const vz = WIND_HEADING.z * ctx.smooth.wind * 3.4;
      fall.set(vx, -6.5, vz).normalize();
      q.setFromUnitVectors(UP, fall);

      for (let i = 0; i < active; i++) {
        py[i] -= vy[i] * ctx.dt;
        px[i] += vx * ctx.dt;
        pz[i] += vz * ctx.dt;
        const onIsland = px[i] * px[i] + pz[i] * pz[i] < 55;
        const floor = onIsland ? 0 : -7.5;
        if (py[i] < floor) {
          const r = 8.5 * Math.sqrt(rand());
          const a = rand() * Math.PI * 2;
          px[i] = Math.cos(a) * r;
          pz[i] = Math.sin(a) * r;
          py[i] = 5.5 + rand() * 3;
        }
        v3.set(px[i], py[i], pz[i]);
        v3s.set(1, len[i], 1);
        m4.compose(v3, q, v3s);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
