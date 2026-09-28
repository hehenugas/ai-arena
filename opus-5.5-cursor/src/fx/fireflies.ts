import * as THREE from 'three';
import type { Frame } from '../frame';
import { mulberry32 } from '../utils/math';
import { glowTexture } from '../utils/textures';
import { LAYOUT } from '../world/layout';
import { terrainHeight } from '../world/terrain';

const COUNT = 26;

/** A few drifting fireflies around the pond and garden on clear nights. */
export class Fireflies {
  readonly points: THREE.Points;
  private readonly base: Float32Array;
  private readonly pos: Float32Array;
  private readonly mat: THREE.PointsMaterial;

  constructor() {
    const rand = mulberry32(12);
    this.base = new Float32Array(COUNT * 4);
    this.pos = new Float32Array(COUNT * 3);
    const anchors = [
      [LAYOUT.pond.x, LAYOUT.pond.z, 1.6],
      [LAYOUT.garden.x, LAYOUT.garden.z, 0.9],
      [0.2, 2.4, 1.0],
    ];
    for (let i = 0; i < COUNT; i++) {
      const [ax, az, ar] = anchors[i % anchors.length];
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * ar;
      const x = ax + Math.cos(a) * d;
      const z = az + Math.sin(a) * d;
      this.base.set([x, Math.max(terrainHeight(x, z), 0) + 0.25 + rand() * 0.5, z, rand() * 10], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({
      map: glowTexture(),
      color: 0xdcff8a,
      size: 0.16,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.name = 'fireflies';
    this.points.frustumCulled = false;
  }

  update(frame: Frame): void {
    const vis = Math.max(0, frame.night - 0.4) / 0.6 * (1 - frame.rain);
    this.points.visible = vis > 0.01;
    if (!this.points.visible) return;
    const t = frame.elapsed * (0.2 + 0.8 * frame.motion);
    for (let i = 0; i < COUNT; i++) {
      const b = i * 4;
      const s = this.base[b + 3];
      this.pos[i * 3] = this.base[b] + Math.sin(t * 0.5 + s) * 0.25;
      this.pos[i * 3 + 1] = this.base[b + 1] + Math.sin(t * 0.9 + s * 2) * 0.12;
      this.pos[i * 3 + 2] = this.base[b + 2] + Math.cos(t * 0.4 + s) * 0.25;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.mat.opacity = vis * (0.6 + 0.4 * Math.sin(frame.elapsed * 3.1));
  }
}
