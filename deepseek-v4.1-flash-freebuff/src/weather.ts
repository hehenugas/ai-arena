import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';
import type { FrameContext } from './state';
import type { IslandInfo } from './terrain';
import { mulberry32 } from './utils';
import type { RipplePool } from './water';

const SPAWN_RADIUS = 11.5;
const SPAWN_TOP = 10;
const SPAWN_SPREAD = 4;

export type Quality = 'high' | 'low';

export interface Weather {
  group: Group;
  update(ctx: FrameContext): void;
}

/**
 * Rain is part of the 3D scene: streaks live in world space, follow the wind
 * and are recycled when they hit the ground, the pond or fall past the island.
 */
export function createWeather(
  info: IslandInfo,
  ripples: RipplePool,
  quality: Quality,
): Weather {
  const dropCount = quality === 'high' ? 1100 : 520;
  const rand = mulberry32(60607);

  const segments = new Float32Array(dropCount * 6);
  const heads = new Float32Array(dropCount * 3);
  const speeds = new Float32Array(dropCount);
  const lengths = new Float32Array(dropCount);

  const respawn = (index: number, initial: boolean): void => {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * SPAWN_RADIUS;
    heads[index * 3] = Math.cos(angle) * radius;
    heads[index * 3 + 2] = Math.sin(angle) * radius;
    heads[index * 3 + 1] = initial
      ? rand() * (SPAWN_TOP + SPAWN_SPREAD)
      : SPAWN_TOP + rand() * SPAWN_SPREAD;
    speeds[index] = 16 + rand() * 9;
    lengths[index] = 0.42 + rand() * 0.5;
  };

  for (let i = 0; i < dropCount; i++) respawn(i, true);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(segments, 3));
  geometry.setDrawRange(0, 0);
  geometry.boundingSphere = null;

  const material = new LineBasicMaterial({
    color: '#bcd9f2',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });

  const rain = new LineSegments(geometry, material);
  rain.frustumCulled = false;
  rain.visible = false;
  rain.renderOrder = 4;

  const group = new Group();
  group.name = 'rain';
  group.add(rain);

  const direction = new Vector3();
  let rippleAccumulator = 0;
  let smoothedWind = 0;

  return {
    group,
    update(ctx: FrameContext) {
      const rainAmount = ctx.rain;
      const visible = rainAmount > 0.015;

      // Ease the wind so a fast slider change cannot visibly snap the rain.
      smoothedWind += (ctx.wind - smoothedWind) * Math.min(1, ctx.dt * 4);

      if (!visible) {
        rain.visible = false;
        material.opacity = 0;
        geometry.setDrawRange(0, 0);
        rippleAccumulator = 0;
        return;
      }

      rain.visible = true;
      material.opacity = 0.16 + 0.34 * rainAmount;

      const activeDrops = Math.max(1, Math.floor(dropCount * rainAmount));
      geometry.setDrawRange(0, activeDrops * 2);

      const driftX = smoothedWind * 3.4;
      const driftZ = smoothedWind * 1.2;
      direction.set(driftX, -1, driftZ).normalize();
      const fallOff = 1 + smoothedWind * 0.45;

      // Clamped so a long dry spell cannot dump a burst of ripples later.
      rippleAccumulator = Math.min(3, rippleAccumulator + ctx.dt * (10 + 16 * rainAmount));

      for (let i = 0; i < activeDrops; i++) {
        const i3 = i * 3;
        let x = heads[i3] + driftX * ctx.dt;
        let y = heads[i3 + 1] - speeds[i] * fallOff * ctx.dt;
        let z = heads[i3 + 2] + driftZ * ctx.dt;

        const groundY = info.surfaceY(x, z);
        if (y <= groundY) {
          if (info.isOverPond(x, z) && rippleAccumulator >= 1) {
            ripples.spawn(x, z);
            rippleAccumulator -= 1;
          }
          respawn(i, false);
          x = heads[i3];
          y = heads[i3 + 1];
          z = heads[i3 + 2];
        }

        heads[i3] = x;
        heads[i3 + 1] = y;
        heads[i3 + 2] = z;

        const length = lengths[i];
        const i6 = i * 6;
        segments[i6] = x;
        segments[i6 + 1] = y;
        segments[i6 + 2] = z;
        segments[i6 + 3] = x - direction.x * length;
        segments[i6 + 4] = y - direction.y * length;
        segments[i6 + 5] = z - direction.z * length;
      }

      (geometry.attributes.position as BufferAttribute).needsUpdate = true;
    },
  };
}
