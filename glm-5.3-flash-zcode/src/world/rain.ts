import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three';
import { ISLAND_RADIUS } from './island';

const FALL_SPEED = 9.5;
const WIND_X = 4.2;
const WIND_Z = 1.6;
const SPAWN_R = 9;

export interface Rain {
  lines: LineSegments;
  update(dt: number, wind: number, rainAmount: number): void;
}

/** Streaks of rain in world space: pooled, recycled, slanted by the wind. */
export function createRain(count: number): Rain {
  const base = new Float32Array(count * 3); // one anchor per drop
  const len = new Float32Array(count);
  const speed = new Float32Array(count);
  const resetY = new Float32Array(count);

  const positions = new Float32Array(count * 6);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));

  const mat = new LineBasicMaterial({
    color: 0xa9c0dc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lines = new LineSegments(geo, mat);
  lines.visible = false;
  lines.frustumCulled = false;

  const respawn = (i: number, top: boolean) => {
    const x = (Math.random() - 0.5) * SPAWN_R * 2;
    const z = (Math.random() - 0.5) * SPAWN_R * 2;
    base[i * 3] = x;
    base[i * 3 + 1] = top ? 6.5 + Math.random() * 4.5 : Math.random() * 11 - 1;
    base[i * 3 + 2] = z;
    len[i] = 0.3 + Math.random() * 0.25;
    speed[i] = FALL_SPEED * (0.85 + Math.random() * 0.3);
    // Drops over the island die on the grass; the rest fall past the underside.
    resetY[i] = Math.hypot(x, z) < ISLAND_RADIUS + 0.55 ? 0.12 : -5.2;
  };
  for (let i = 0; i < count; i++) respawn(i, false);

  return {
    lines,
    update(dt, wind, rainAmount) {
      if (rainAmount <= 0.003) {
        lines.visible = false;
        return;
      }
      lines.visible = true;
      mat.opacity = 0.38 * Math.min(rainAmount * 1.4, 1);

      // One shared slant vector keeps the streaks leaning with the wind.
      const vx = wind * WIND_X;
      const vz = wind * WIND_Z;
      const dirLen = Math.hypot(vx, FALL_SPEED, vz);

      for (let i = 0; i < count; i++) {
        base[i * 3] += vx * dt;
        base[i * 3 + 1] -= speed[i] * dt;
        base[i * 3 + 2] += vz * dt;
        if (
          base[i * 3 + 1] < resetY[i] ||
          Math.abs(base[i * 3]) > SPAWN_R + 3 ||
          Math.abs(base[i * 3 + 2]) > SPAWN_R + 3
        ) {
          respawn(i, true);
        }
        const k = len[i] / dirLen;
        const o = i * 6;
        positions[o] = base[i * 3];
        positions[o + 1] = base[i * 3 + 1];
        positions[o + 2] = base[i * 3 + 2];
        positions[o + 3] = base[i * 3] + vx * k;
        positions[o + 4] = base[i * 3 + 1] - FALL_SPEED * k;
        positions[o + 5] = base[i * 3 + 2] + vz * k;
      }
      (geo.attributes.position as BufferAttribute).needsUpdate = true;
    },
  };
}
