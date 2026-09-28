import * as THREE from 'three';
import { makeRandom } from '../core/utils';
import { edgeFactor, terrainHeight } from './terrain';

const BOX = 5.6;
const TOP = 7.2;
const BOTTOM = -5.5;

export interface Rain {
  mesh: THREE.LineSegments;
  update(dt: number, rain: number, wind: number, motion: number): void;
}

/**
 * A fixed pool of rain streaks living in world space. Each drop is recycled the
 * moment it lands, so switching rain on and off never allocates anything and
 * never leaves drops falling forever under the island.
 */
export function createRain(count: number): Rain {
  const rand = makeRandom(31337);
  const positions = new Float32Array(count * 6);
  const speeds = new Float32Array(count);
  const streak = 0.17;

  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * BOX * 2;
    const y = rand() * TOP;
    const z = (rand() - 0.5) * BOX * 2;
    speeds[i] = 5.2 + rand() * 2.6;
    writeDrop(positions, i, x, y, z, 0, streak);
  }

  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);

  const material = new THREE.LineBasicMaterial({
    color: 0xc7dbe8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;

  return {
    mesh,
    update(dt, rain, wind, motion) {
      if (rain < 0.01) {
        material.opacity = 0;
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      material.opacity = 0.36 * rain;

      const slantX = wind * 1.5;
      const slantZ = wind * 0.45;
      const step = dt * motion;

      for (let i = 0; i < count; i++) {
        const o = i * 6;
        const speed = speeds[i];
        const x = positions[o] + slantX * speed * step;
        const y = positions[o + 1] - speed * step;
        const z = positions[o + 2] + slantZ * speed * step;

        const onIsland = edgeFactor(x, z) < 1.02;
        const floor = onIsland ? terrainHeight(x, z) : BOTTOM;
        const outOfBounds = x > BOX || x < -BOX || z > BOX || z < -BOX || y > TOP + 1;

        if (y < floor || outOfBounds) {
          writeDrop(positions, i, (rand() - 0.5) * BOX * 2, TOP + rand() * 0.6, (rand() - 0.5) * BOX * 2, slantX, streak);
          continue;
        }
        writeDrop(positions, i, x, y, z, slantX, streak);
      }
      attribute.needsUpdate = true;
    },
  };
}

function writeDrop(
  positions: Float32Array,
  i: number,
  x: number,
  y: number,
  z: number,
  slant: number,
  streak: number,
): void {
  const o = i * 6;
  positions[o] = x;
  positions[o + 1] = y;
  positions[o + 2] = z;
  positions[o + 3] = x - slant * streak;
  positions[o + 4] = y - streak;
  positions[o + 5] = z - streak * 0.3;
}
