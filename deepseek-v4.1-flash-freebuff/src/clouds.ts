import { Group, Mesh, SphereGeometry } from 'three';
import { materials } from './materials';
import type { FrameContext } from './state';
import { mulberry32 } from './utils';

const BLOB_GEOMETRY = new SphereGeometry(1, 14, 10);
const WRAP_X = 23;

interface Cloud {
  group: Group;
  baseY: number;
  phase: number;
  speed: number;
}

const CLOUD_SPECS = [
  { x: -9, y: 7.4, z: -4.5, scale: 1.5 },
  { x: 6.5, y: 8.6, z: -7.5, scale: 1.1 },
  { x: -14, y: 6.5, z: 6, scale: 1 },
  { x: 14.5, y: 7.9, z: 4, scale: 0.85 },
  { x: 1.5, y: 9.7, z: 9.5, scale: 1.25 },
  { x: -6.5, y: 5.8, z: 11, scale: 0.7 },
];

export interface Clouds {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createClouds(): Clouds {
  const group = new Group();
  group.name = 'clouds';
  const rand = mulberry32(8844);
  const clouds: Cloud[] = [];

  for (const spec of CLOUD_SPECS) {
    const cloudGroup = new Group();
    cloudGroup.position.set(spec.x, spec.y, spec.z);

    const core = new Mesh(BLOB_GEOMETRY, materials.cloud);
    core.scale.set(1.35 * spec.scale, 0.72 * spec.scale, 1.2 * spec.scale);
    core.castShadow = false;
    cloudGroup.add(core);

    const lobes = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < lobes; i++) {
      const angle = (i / lobes) * Math.PI * 2 + rand() * 0.6;
      const distance = (0.55 + rand() * 0.85) * spec.scale;
      const lobe = new Mesh(BLOB_GEOMETRY, materials.cloud);
      lobe.position.set(
        Math.cos(angle) * distance,
        (rand() - 0.35) * 0.42 * spec.scale,
        Math.sin(angle) * distance * 0.7,
      );
      lobe.scale.set(
        (0.6 + rand() * 0.6) * spec.scale,
        (0.45 + rand() * 0.35) * spec.scale,
        (0.6 + rand() * 0.55) * spec.scale,
      );
      cloudGroup.add(lobe);
    }

    group.add(cloudGroup);
    clouds.push({
      group: cloudGroup,
      baseY: spec.y,
      phase: rand() * Math.PI * 2,
      speed: 0.55 + rand() * 0.8,
    });
  }

  return {
    group,
    update(ctx: FrameContext) {
      materials.cloud.color.copy(ctx.palette.cloud);
      const motion = ctx.reducedMotion ? 0.3 : 1;
      // Nearly still on a windless day, brisk when the slider is up.
      const speed = (0.06 + ctx.wind * 2.6) * motion;

      for (const cloud of clouds) {
        cloud.group.position.x += speed * cloud.speed * ctx.dt;
        if (cloud.group.position.x > WRAP_X) {
          cloud.group.position.x = -WRAP_X;
          cloud.group.position.z = (rand() - 0.5) * 22;
        }
        const bob = ctx.reducedMotion ? 0 : Math.sin(ctx.elapsed * 0.32 + cloud.phase) * 0.22;
        cloud.group.position.y = cloud.baseY + bob;
      }
    },
  };
}
