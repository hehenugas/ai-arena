import * as THREE from 'three';
import { mulberry32 } from '../utils/noise';
import { groundHeightAt } from '../world/island';

const DROPS = 550;
const SPREAD = 16;
const TOP = 16;
const BOTTOM = -7;

interface Drop {
  x: number;
  y: number;
  z: number;
  vy: number;
  /** 0 = falling, 1 = splashed and waiting to respawn. */
  state: number;
  timer: number;
}

export interface Rain {
  object: THREE.LineSegments;
  update: (
    dt: number,
    weather: number,
    wind: number,
    onHit: (x: number, z: number) => void
  ) => void;
}

/**
 * Realtime rain as part of the 3D scene (line segments, not a screen-space
 * overlay). Drops are recycled from a fixed pool, get blown sideways by the
 * same wind state that drives the windmill and trees, and land on the island
 * instead of passing through it forever.
 */
export function createRain(): Rain {
  const rng = mulberry32(2468);
  const drops: Drop[] = [];

  const positions = new Float32Array(DROPS * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));

  const mat = new THREE.LineBasicMaterial({
    color: '#bcd3e8',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;

  for (let i = 0; i < DROPS; i++) {
    drops.push({
      x: (rng() * 2 - 1) * SPREAD,
      y: rng() * (TOP - BOTTOM) + BOTTOM,
      z: (rng() * 2 - 1) * SPREAD,
      vy: -(12 + rng() * 7),
      state: 0,
      timer: 0,
    });
  }

  function respawn(d: Drop): void {
    d.x = (rng() * 2 - 1) * SPREAD;
    d.z = (rng() * 2 - 1) * SPREAD;
    d.y = TOP + rng() * 4;
    d.vy = -(13 + rng() * 6);
    d.state = 0;
    d.timer = 0;
  }

  const update: Rain['update'] = (dt, weather, wind, onHit) => {
    const show = weather > 0.015;
    lines.visible = show;
    if (!show) return;

    mat.opacity = 0.5 * weather;
    const wx = wind * 11;
    const gravity = 42;
    const streak = 0.16;

    for (let i = 0; i < DROPS; i++) {
      const d = drops[i];

      if (d.state === 0) {
        d.vy = Math.max(d.vy - gravity * dt, -26);
        d.x += wx * dt;
        d.y += d.vy * dt;

        const ground = groundHeightAt(d.x, d.z);
        if (d.y <= ground + 0.03) {
          if (ground > -2) {
            // Splashed on the island top.
            d.y = ground + 0.03;
            d.state = 1;
            d.timer = 0.25 + rng() * 0.55;
            onHit(d.x, d.z);
          } else {
            respawn(d); // fell past the underside into the void
          }
        } else if (d.y < BOTTOM) {
          respawn(d);
        }
      } else {
        d.timer -= dt;
        if (d.timer <= 0) respawn(d);
      }

      const idx = i * 6;
      positions[idx] = d.x;
      positions[idx + 1] = d.y;
      positions[idx + 2] = d.z;
      positions[idx + 3] = d.x - wx * streak * 0.06;
      positions[idx + 4] = d.y - d.vy * streak;
      positions[idx + 5] = d.z;
    }
    geo.attributes.position.needsUpdate = true;
  };

  return { object: lines, update };
}