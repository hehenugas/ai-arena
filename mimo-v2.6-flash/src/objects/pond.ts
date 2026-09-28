import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector2,
} from 'three';
import { POND } from './layout';
import { grassHeight } from './island';
import { getTextures } from '../textureSet';
import type { Env } from '../environment/environment';

const REED_ANGLES = [0.45, 1.35, 2.5, 3.9, 4.8, 5.6];
const BASE_NORMAL = 0.32;

export interface Pond {
  group: Group;
  update(env: Env, dt: number, wind: number, rainMix: number): void;
}

export function createPond(): Pond {
  const { waterNormal } = getTextures();
  waterNormal.repeat.set(2.4, 2.4);

  const group = new Group();
  group.name = 'pond';

  const waterMat = new MeshStandardMaterial({
    color: new Color('#4e8fb5'),
    roughness: 0.12,
    metalness: 0.04,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    normalMap: waterNormal,
    normalScale: new Vector2(BASE_NORMAL, BASE_NORMAL),
  });

  const water = new Mesh(new CircleGeometry(POND.radius * 1.04, 64), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND.x, POND.waterY, POND.z);
  water.receiveShadow = true;
  water.renderOrder = 1;
  group.add(water);

  // Cattails at the waterline
  const stemMat = new MeshStandardMaterial({ color: '#6f8f5a', roughness: 0.9 });
  const headMat = new MeshStandardMaterial({ color: '#6b4c33', roughness: 0.95 });
  const stemGeo = new CylinderGeometry(0.016, 0.022, 0.5, 5);
  const headGeo = new CylinderGeometry(0.045, 0.04, 0.15, 7);
  for (const a of REED_ANGLES) {
    const r = POND.radius * 0.66;
    const x = POND.x + Math.cos(a) * r;
    const z = POND.z + Math.sin(a) * r;
    const y = Math.max(grassHeight(x, z), POND.waterY - 0.06);
    const stem = new Mesh(stemGeo, stemMat);
    stem.position.set(x, y + 0.25, z);
    stem.rotation.z = (a % 1) * 0.16 - 0.08;
    group.add(stem);
    const head = new Mesh(headGeo, headMat);
    head.position.set(x, y + 0.55, z);
    group.add(head);
  }

  let currentNormal = BASE_NORMAL;

  const update = (env: Env, dt: number, wind: number, rainMix: number): void => {
    waterMat.color.copy(env.waterColor);
    waterMat.roughness = env.waterRoughness;
    waterMat.opacity = env.waterOpacity;

    // Rain roughens the surface into visible chop; wind drifts the pattern.
    const wanted = BASE_NORMAL + 0.45 * rainMix;
    currentNormal += (wanted - currentNormal) * (1 - Math.exp(-2.5 * dt));
    waterMat.normalScale.set(currentNormal, currentNormal);

    waterNormal.offset.x = (waterNormal.offset.x + (0.006 + wind * 0.02 + rainMix * 0.03) * dt) % 1;
    waterNormal.offset.y = (waterNormal.offset.y - (0.004 + wind * 0.014 + rainMix * 0.02) * dt) % 1;
  };

  return { group, update };
}
