import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  Vector2,
} from 'three';
import { CLOUDS } from './layout';
import { WIND_DIR } from '../state';
import { mulberry32 } from '../utils';

const CLOUD_WHITE = new Color('#f6f8fb');
const CLOUD_RAIN = new Color('#6d7684');
const WRAP_DISTANCE = 26;

export interface Clouds {
  group: Group;
  update(dt: number, wind: number, rainMix: number, daylight: number): void;
}

export function createClouds(scene: Scene): Clouds {
  const group = new Group();
  group.name = 'clouds';

  const mat = new MeshStandardMaterial({
    color: CLOUD_WHITE.clone(),
    roughness: 1,
    metalness: 0,
    flatShading: false,
    // Puffy fake bounce: cloud undersides never see the sun directly, so without
    // a little emissive lift they read as dark storm clouds even in clear weather.
    emissive: new Color('#ffffff'),
    emissiveIntensity: 0,
  });
  const puffGeo = new SphereGeometry(1, 12, 9);
  const driftDir = new Vector2(WIND_DIR.x, WIND_DIR.y);

  const cloudNodes = CLOUDS.map((spec) => {
    const rand = mulberry32(spec.seed);
    const cloud = new Group();
    cloud.position.set(spec.x, spec.y, spec.z);
    const puffs = 4 + Math.floor(rand() * 3);
    for (let i = 0; i < puffs; i++) {
      const puff = new Mesh(puffGeo, mat);
      const px = (i - (puffs - 1) / 2) * 1.15 + (rand() - 0.5) * 0.5;
      puff.position.set(px, (rand() - 0.4) * 0.55, (rand() - 0.5) * 1.3);
      const s = 0.75 + rand() * 0.75;
      puff.scale.set(s * 1.35, s * 0.72, s);
      cloud.add(puff);
    }
    cloud.scale.setScalar(spec.s * 0.62);
    group.add(cloud);
    return { cloud, baseY: spec.y, phase: rand() * 10 };
  });

  scene.add(group);

  const tmpColor = new Color();
  let rainDarken = 0;

  const update = (dt: number, wind: number, rainMix: number, daylight: number): void => {
    // Even at zero wind the clouds creep almost imperceptibly.
    const speed = 0.03 + wind * 2.1;
    for (const node of cloudNodes) {
      const pos = node.cloud.position;
      pos.x += driftDir.x * speed * dt;
      pos.z += driftDir.y * speed * dt;

      // Wrap along the wind axis so the field never runs away.
      const along = pos.x * driftDir.x + pos.z * driftDir.y;
      if (along > WRAP_DISTANCE) {
        pos.x -= driftDir.x * WRAP_DISTANCE * 2;
        pos.z -= driftDir.y * WRAP_DISTANCE * 2;
      } else if (along < -WRAP_DISTANCE) {
        pos.x += driftDir.x * WRAP_DISTANCE * 2;
        pos.z += driftDir.y * WRAP_DISTANCE * 2;
      }
      pos.y = node.baseY - rainMix * 0.7;
    }

    rainDarken += (rainMix - rainDarken) * (1 - Math.exp(-2 * dt));
    mat.color.copy(tmpColor.copy(CLOUD_WHITE).lerp(CLOUD_RAIN, rainDarken * 0.85));
    // Bounce fades out at night (no sky light to bounce) and under rain clouds.
    mat.emissiveIntensity = Math.max(0, daylight) * (0.3 - 0.24 * rainDarken);
  };

  return { group, update };
}
