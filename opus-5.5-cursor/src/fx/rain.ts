import * as THREE from 'three';
import type { Frame } from '../frame';
import type { RainCollider } from './collider';
import type { Ripples } from './ripples';

const SPAWN_TOP = 5.6;
const FLOOR = -7.5;
const AREA = 6.8;
const STREAK = 0.32;
const WIND_PUSH = 5.8;

const DAY = new THREE.Color(0xd4dde8);
const NIGHT = new THREE.Color(0x8497b8);

/**
 * World-space rain streaks. A fixed buffer of drops is simulated on the CPU; drops that
 * land (or fall past the island) are respawned above, so nothing is ever allocated per frame.
 */
export class Rain {
  readonly lines: THREE.LineSegments;
  private readonly heads: Float32Array;
  private readonly speed: Float32Array;
  private readonly positions: Float32Array;
  private readonly attr: THREE.BufferAttribute;
  private readonly mat: THREE.LineBasicMaterial;

  constructor(
    private readonly count: number,
    private readonly collider: RainCollider,
    private readonly ripples: Ripples,
  ) {
    this.heads = new Float32Array(count * 3);
    this.speed = new Float32Array(count);
    this.positions = new Float32Array(count * 6);
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.positions, 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    geo.setDrawRange(0, 0);
    this.mat = new THREE.LineBasicMaterial({
      color: DAY.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geo, this.mat);
    this.lines.name = 'rain';
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    for (let i = 0; i < count; i++) this.respawn(i, true, 0, 0);
  }

  private respawn(i: number, anywhere: boolean, vx: number, vz: number): void {
    const vy = 8 + Math.random() * 2.5;
    this.speed[i] = vy;
    const y = anywhere ? FLOOR * 0.3 + Math.random() * (SPAWN_TOP - FLOOR * 0.3) : SPAWN_TOP + Math.random() * 1.2;
    const r = AREA * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    // Start upwind so the drop drifts onto the target spot by the time it reaches the ground.
    const fall = Math.max(y, 0) / vy;
    this.heads[i * 3] = Math.cos(a) * r - vx * fall;
    this.heads[i * 3 + 1] = y;
    this.heads[i * 3 + 2] = Math.sin(a) * r - vz * fall;
  }

  update(frame: Frame): void {
    const amount = frame.rain;
    const active = Math.floor(this.count * amount);
    this.lines.visible = active > 0;
    if (!this.lines.visible) return;

    const vx = frame.windDir.x * frame.wind * WIND_PUSH;
    const vz = frame.windDir.z * frame.wind * WIND_PUSH;
    const dt = frame.dt;
    const h = this.heads;
    const p = this.positions;
    const ceiling = this.collider.ceiling;

    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      const vy = this.speed[i];
      let x = h[k] + vx * dt;
      let y = h[k + 1] - vy * dt;
      let z = h[k + 2] + vz * dt;
      let landed = y < FLOOR;
      if (!landed && y < ceiling) {
        const ground = this.collider.heightAt(x, z);
        if (ground !== null && y <= ground) {
          landed = true;
          if (i < active && this.collider.isPond(x, z)) this.ripples.spawn(x, z);
        }
      }
      if (landed) {
        this.respawn(i, false, vx, vz);
        x = h[k];
        y = h[k + 1];
        z = h[k + 2];
      } else {
        h[k] = x;
        h[k + 1] = y;
        h[k + 2] = z;
      }
      const inv = STREAK / Math.hypot(vx, vy, vz);
      const o = i * 6;
      p[o] = x;
      p[o + 1] = y;
      p[o + 2] = z;
      p[o + 3] = x - vx * inv;
      p[o + 4] = y + vy * inv;
      p[o + 5] = z - vz * inv;
    }
    this.attr.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, active * 2);
    this.mat.opacity = 0.55 * Math.min(1, amount * 1.6);
    this.mat.color.lerpColors(DAY, NIGHT, frame.night);
  }
}
