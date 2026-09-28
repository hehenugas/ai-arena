import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Scene,
} from 'three';
import { POND, HOUSE, WINDMILL } from './objects/layout';
import { grassHeight, isInsideIsland } from './objects/island';
import { clamp, lerp, mulberry32 } from './utils';

const BOX_HALF = 11;
const TOP_Y = 13;
const BOTTOM_Y = -14;
const RIPPLE_POOL = 12;
const RIPPLE_RATE = 15;

/**
 * World-space rain: line segments recycled through a volume around the island,
 * terminating on the terrain / pond / roofs instead of falling forever, plus a
 * fixed pool of expanding ripple rings for the pond.
 */
export class WeatherSystem {
  readonly group: Group;
  private lines: LineSegments;
  private lineMat: LineBasicMaterial;
  private positions: Float32Array;
  private px: Float32Array;
  private py: Float32Array;
  private pz: Float32Array;
  private speed: Float32Array;
  private maxDrops: number;
  private rand: () => number;
  private ripples: Array<{ mesh: Mesh; mat: MeshBasicMaterial; k: number; dur: number; active: boolean }> = [];
  private rippleAccumulator = 0;

  constructor(scene: Scene, maxDrops: number) {
    this.maxDrops = maxDrops;
    this.rand = mulberry32(20260924);
    this.group = new Group();
    this.group.name = 'weather';

    this.positions = new Float32Array(maxDrops * 6);
    this.px = new Float32Array(maxDrops);
    this.py = new Float32Array(maxDrops);
    this.pz = new Float32Array(maxDrops);
    this.speed = new Float32Array(maxDrops);

    for (let i = 0; i < maxDrops; i++) {
      this.px[i] = (this.rand() * 2 - 1) * BOX_HALF;
      this.py[i] = BOTTOM_Y + this.rand() * (TOP_Y - BOTTOM_Y);
      this.pz[i] = (this.rand() * 2 - 1) * BOX_HALF;
      this.speed[i] = 9.5 + this.rand() * 5;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.lineMat = new LineBasicMaterial({
      color: new Color('#dcecf7'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    });
    this.lines = new LineSegments(geo, this.lineMat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 3;
    this.group.add(this.lines);

    // Ripple pool — objects are created once and reused every rain burst.
    const ringGeo = new RingGeometry(0.5, 0.62, 22);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < RIPPLE_POOL; i++) {
      const mat = new MeshBasicMaterial({
        color: new Color('#e8f2f8'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      });
      const mesh = new Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      this.ripples.push({ mesh, mat, k: 0, dur: 1, active: false });
    }

    this.group.visible = false;
    scene.add(this.group);
  }

  /** Height at which a falling drop stops (or a sentinel when it keeps falling). */
  private surfaceHit(x: number, z: number): number {
    // House roof (axis-aligned test in the house's local frame)
    const c = Math.cos(HOUSE.yaw);
    const s = Math.sin(HOUSE.yaw);
    const dx = x - HOUSE.x;
    const dz = z - HOUSE.z;
    const lx = c * dx - s * dz;
    const lz = s * dx + c * dz;
    if (Math.abs(lx) < 1.75 && Math.abs(lz) < 1.43) {
      const ax = Math.abs(lx);
      return ax <= 1.5 ? 3.05 - 0.7 * ax : 1.98;
    }

    // Windmill tower
    const mdx = x - WINDMILL.x;
    const mdz = z - WINDMILL.z;
    const md = Math.hypot(mdx, mdz);
    if (md < 1.06) {
      if (md > 0.92) return 0.35;
      if (md > 0.64) return ((0.92 - md) / 0.28) * 3.6;
      return 4.1;
    }

    if (isInsideIsland(x, z)) {
      const h = grassHeight(x, z);
      return h < POND.waterY ? POND.waterY : h;
    }
    return BOTTOM_Y - 2;
  }

  update(dt: number, rainMix: number, windX: number, windZ: number): void {
    const raining = rainMix > 0.004;
    this.group.visible = raining;
    if (!raining) {
      this.lineMat.opacity = 0;
      for (const r of this.ripples) {
        r.active = false;
        r.mesh.visible = false;
      }
      this.rippleAccumulator = 0;
      return;
    }

    const n = this.maxDrops;
    const p = this.positions;
    for (let i = 0; i < n; i++) {
      const sp = this.speed[i];
      this.py[i] -= sp * dt;
      this.px[i] += windX * dt;
      this.pz[i] += windZ * dt;

      const hit = this.surfaceHit(this.px[i], this.pz[i]);
      if (this.py[i] < hit) {
        this.px[i] = (this.rand() * 2 - 1) * BOX_HALF;
        this.pz[i] = (this.rand() * 2 - 1) * BOX_HALF;
        this.py[i] = 5 + this.rand() * (TOP_Y - 5);
      }

      // Streak: from the drop back along its velocity direction
      const vx = windX;
      const vy = -sp;
      const vz = windZ;
      const invLen = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz);
      const len = 0.34 + sp * 0.022;
      const o = i * 6;
      p[o] = this.px[i];
      p[o + 1] = this.py[i];
      p[o + 2] = this.pz[i];
      p[o + 3] = this.px[i] - vx * invLen * len;
      p[o + 4] = this.py[i] - vy * invLen * len;
      p[o + 5] = this.pz[i] - vz * invLen * len;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    const visibleDrops = Math.max(1, Math.ceil(rainMix * n));
    this.lines.geometry.setDrawRange(0, visibleDrops * 2);
    this.lineMat.opacity = 0.6 * Math.min(1, rainMix * 1.5);

    this.updateRipples(dt, rainMix);
  }

  private updateRipples(dt: number, rainMix: number): void {
    this.rippleAccumulator += RIPPLE_RATE * rainMix * dt;
    while (this.rippleAccumulator >= 1) {
      this.rippleAccumulator -= 1;
      const free = this.ripples.find((r) => !r.active);
      if (!free) break;
      const angle = this.rand() * Math.PI * 2;
      const d = 0.15 + this.rand() * 0.72;
      free.mesh.position.set(
        POND.x + Math.cos(angle) * d,
        POND.waterY + 0.012 + this.rand() * 0.008,
        POND.z + Math.sin(angle) * d,
      );
      free.k = 0;
      free.dur = 0.85 + this.rand() * 0.55;
      free.active = true;
      free.mesh.visible = true;
    }

    for (const r of this.ripples) {
      if (!r.active) continue;
      r.k += dt / r.dur;
      if (r.k >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const scale = lerp(0.32, 1.5, r.k * (2 - r.k));
      r.mesh.scale.setScalar(scale);
      r.mat.opacity = (1 - r.k) * 0.45 * clamp(rainMix * 1.4, 0, 1);
    }
  }
}
