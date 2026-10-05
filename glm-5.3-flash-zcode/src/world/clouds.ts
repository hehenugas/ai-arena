import { Color, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { hash3 } from './noise';

interface Cloud {
  group: Group;
  material: MeshStandardMaterial;
  angle: number;
  radius: number;
  height: number;
  bobPhase: number;
}

const CLEAR_COLOR = new Color(0xf1efe6);
const RAIN_COLOR = new Color(0x8d959e);

export interface Clouds {
  group: Group;
  update(dt: number, elapsed: number, wind: number, rainAmount: number, reducedMotion: boolean): void;
}

export function createClouds(): Clouds {
  const group = new Group();
  const clouds: Cloud[] = [];
  const puffGeo = new SphereGeometry(1, 8, 6);

  const specs: Array<[number, number, number, number]> = [
    // angle, radius, height, overall scale
    [0.4, 8.2, 4.4, 1.15],
    [1.7, 10.4, 4.3, 0.9],
    [2.9, 7.6, 5.1, 0.75],
    [4.1, 9.3, 4.4, 1.05],
    [5.4, 11.2, 4.8, 0.85],
  ];

  for (const [angle, radius, height, scale] of specs) {
    const cloud = new Group();
    const material = new MeshStandardMaterial({
      color: 0xfbfaf4,
      roughness: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.97,
    });
    const puffs = 4 + Math.floor(hash3(angle, radius, height) * 2.9);
    for (let i = 0; i < puffs; i++) {
      const puff = new Mesh(puffGeo, material);
      puff.position.set(
        (i - (puffs - 1) / 2) * 1.15 + (hash3(angle, i, 1) - 0.5) * 0.4,
        (hash3(i, angle, 2) - 0.4) * 0.22,
        (hash3(angle, i, 3) - 0.5) * 0.6
      );
      const s = (0.62 + hash3(i, angle, 4) * 0.5) * scale;
      puff.scale.set(s * 1.45, s * 0.45, s);
      puff.castShadow = true;
      cloud.add(puff);
    }
    group.add(cloud);
    clouds.push({
      group: cloud,
      material,
      angle,
      radius,
      height,
      bobPhase: hash3(radius, height, angle) * Math.PI * 2,
    });
  }

  return {
    group,
    update(dt, elapsed, wind, rainAmount, reducedMotion) {
      const speedScale = reducedMotion ? 0.3 : 1;
      for (const c of clouds) {
        // Nearly still in dead calm, briskly drifting in strong wind.
        c.angle += (0.004 + wind * 0.055) * dt * speedScale;
        c.group.position.set(
          Math.cos(c.angle) * c.radius,
          c.height + Math.sin(elapsed * 0.4 * speedScale + c.bobPhase) * 0.12,
          Math.sin(c.angle) * c.radius
        );
        c.group.rotation.y = -c.angle;
        c.material.color.copy(CLEAR_COLOR).lerp(RAIN_COLOR, rainAmount * 0.9);
      }
    },
  };
}
