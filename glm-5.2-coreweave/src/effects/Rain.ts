import * as THREE from 'three';
import { clamp01, damp } from '../utils';

const COUNT = 700;
const REGION_X = 7.2;   // rain box half-extent in X/Z (around the island)
const TOP_Y = 13;
const RECYCLE_Y = 0.32;

/**
 * Rain rendered as a pool of instanced 3D streaks (not a screen-space overlay).
 * Streaks fall, slant with the shared wind, and recycle when they reach the
 * island surface so they never pass through indefinitely.
 */
export class Rain {
  readonly group = new THREE.Group();
  /** Smoothed 0..1 — used by the World to drive pond ripples + sky dimming. */
  intensity = 0;

  private readonly mesh: THREE.InstancedMesh;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array; // per-particle fall speed variation
  private readonly dummy = new THREE.Object3D();
  private curTilt = 0;

  constructor() {
    const geo = new THREE.BoxGeometry(0.03, 0.3, 0.03);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xbcd5f0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, COUNT);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.visible = false;
    this.group.add(this.mesh);

    this.pos = new Float32Array(COUNT * 3);
    this.vel = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      this.pos[i * 3] = (Math.random() * 2 - 1) * REGION_X;
      this.pos[i * 3 + 1] = Math.random() * TOP_Y;
      this.pos[i * 3 + 2] = (Math.random() * 2 - 1) * REGION_X;
      this.vel[i] = 7.5 + Math.random() * 4;
    }
    // initialize all instances invisible (scaled to 0)
    this.dummy.scale.setScalar(0);
    for (let i = 0; i < COUNT; i++) {
      this.dummy.position.set(0, -100, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * @param target   desired 0 (clear) or 1 (rain)
   * @param wind     0..1 (slants the streaks)
   * @param dt       seconds
   */
  update(target: number, wind: number, dt: number): void {
    this.intensity = damp(this.intensity, target, 3.5, dt);
    const w = clamp01(wind);

    // global opacity fades the whole system in/out
    this.mat.opacity = this.intensity * 0.7;
    this.mesh.visible = this.intensity > 0.01;

    // tilt streaks into the wind (fixed prevailing direction: +X)
    const targetTilt = w * 0.5;
    this.curTilt = damp(this.curTilt, targetTilt, 6.0, dt);
    this.dummy.rotation.set(0, 0, this.curTilt);

    const horiz = w * 4.0; // horizontal drift speed
    // how many particles are "active" (scaled in) — ramp with intensity
    const activeCount = Math.floor(COUNT * this.intensity);

    for (let i = 0; i < COUNT; i++) {
      if (i >= activeCount) {
        // park inactive particles offscreen
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      let y = this.pos[i * 3 + 1] - this.vel[i] * dt;
      let x = this.pos[i * 3] + horiz * dt;
      const z = this.pos[i * 3 + 2];

      // recycle when reaching island surface or blown out of the region
      if (y < RECYCLE_Y || x > REGION_X + 1 || x < -REGION_X - 1) {
        y = TOP_Y + Math.random() * 1.5;
        x = (Math.random() * 2 - 1) * REGION_X;
        this.pos[i * 3] = x;
        this.pos[i * 3 + 2] = (Math.random() * 2 - 1) * REGION_X;
      }
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3] = x;

      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
