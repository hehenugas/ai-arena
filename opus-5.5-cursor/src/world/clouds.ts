import * as THREE from 'three';
import type { Frame } from '../frame';
import { mulberry32, smoothstep } from '../utils/math';
import { MAT } from './materials';

const puffGeo = new THREE.IcosahedronGeometry(1, 1);
/** Clouds travel along the wind between these offsets, fading in and out at the ends. */
const START = -4;
const END = 15;
const FADE = 4;

interface Cloud {
  obj: THREE.Group;
  along: number;
  perp: number;
  y: number;
  size: number;
  bob: number;
}

const SPECS: Array<[number, number, number, number]> = [
  // along-wind offset, cross-wind offset, height, size
  [1.5, -3.4, 4.3, 0.62],
  [6.5, 2.8, 3.9, 0.55],
  [11.5, -1.0, 4.1, 0.5],
  [-2.5, 4.2, 4.4, 0.5],
  [4.0, 8.2, -2.2, 0.55],
  [9.0, -8.0, -1.0, 0.45],
];

const DRY = new THREE.Color(0xffffff);
const STORM = new THREE.Color(0x7c8591);
const perp = new THREE.Vector3();

export class Clouds {
  readonly group = new THREE.Group();
  private readonly clouds: Cloud[] = [];

  constructor() {
    this.group.name = 'clouds';
    const rand = mulberry32(99);
    for (const [along, p, y, size] of SPECS) {
      const obj = new THREE.Group();
      const puffs = 4 + Math.floor(rand() * 3);
      for (let i = 0; i < puffs; i++) {
        const m = new THREE.Mesh(puffGeo, MAT.cloud);
        const t = i / (puffs - 1) - 0.5;
        const r = 0.55 + (1 - Math.abs(t) * 1.4) * 0.45 + rand() * 0.15;
        m.scale.set(r, r * 0.78, r * 0.9);
        m.position.set(t * 2.3, (1 - Math.abs(t) * 2) * 0.25 + rand() * 0.1, (rand() - 0.5) * 0.6);
        m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        m.castShadow = y > 0;
        obj.add(m);
      }
      this.group.add(obj);
      this.clouds.push({ obj, along, perp: p, y, size, bob: rand() * 10 });
    }
  }

  update(frame: Frame): void {
    MAT.cloud.color.lerpColors(DRY, STORM, frame.rain * 0.85);
    MAT.cloud.emissiveIntensity = 0.32 * (1 - frame.night * 0.85) * (1 - frame.rain * 0.6);
    perp.set(-frame.windDir.z, 0, frame.windDir.x);
    const speed = frame.wind * 1.1;
    for (const c of this.clouds) {
      c.along += speed * frame.dt;
      if (c.along > END) c.along -= END - START;
      // Shrink to nothing near the ends of the loop so wrapping is never seen.
      const edge = smoothstep(START, START + FADE, c.along) * smoothstep(END, END - FADE, c.along);
      const swell = 1 + frame.rain * 0.3;
      c.obj.scale.setScalar(Math.max(0.001, c.size * edge * swell));
      const bob = Math.sin(frame.elapsed * 0.35 + c.bob) * 0.12 * frame.motion;
      c.obj.position
        .copy(frame.windDir)
        .multiplyScalar(c.along)
        .addScaledVector(perp, c.perp)
        .setY(c.y + bob - frame.rain * (c.y > 0 ? 0.35 : 0));
      c.obj.rotation.y = Math.atan2(frame.windDir.x, frame.windDir.z) + Math.PI / 2;
    }
  }
}
