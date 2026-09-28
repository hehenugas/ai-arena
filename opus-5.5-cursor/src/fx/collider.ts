import { LAYOUT } from '../world/layout';
import type { TreeFootprint } from '../world/trees';
import { isOnIsland, pondDistance, terrainHeight, WATER_LEVEL } from '../world/terrain';

const EXTENT = 6.4;
const RES = 110;
const NONE = -1e9;

/**
 * Coarse height field of everything rain can land on (ground, pond, roof, windmill, canopies),
 * so thousands of drops can be tested per frame with a single array lookup each.
 */
export class RainCollider {
  private readonly heights = new Float32Array(RES * RES);
  private readonly pond = new Uint8Array(RES * RES);
  /** Highest surface anywhere; drops above this need no test. */
  readonly ceiling: number;

  constructor(houseGround: number, trees: TreeFootprint[]) {
    let ceiling = 0;
    const { x: hx, z: hz, ry } = LAYOUT.house;
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const wm = LAYOUT.windmill;
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        const x = ((i + 0.5) / RES) * 2 * EXTENT - EXTENT;
        const z = ((j + 0.5) / RES) * 2 * EXTENT - EXTENT;
        const k = j * RES + i;
        if (!isOnIsland(x, z, 0.99)) {
          this.heights[k] = NONE;
          continue;
        }
        let h = terrainHeight(x, z);
        if (pondDistance(x, z) < 0.9) {
          h = Math.max(h, WATER_LEVEL);
          this.pond[k] = 1;
        }
        const dx = x - hx;
        const dz = z - hz;
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        if (Math.abs(lx) < 0.9 && Math.abs(lz) < 0.78) {
          h = Math.max(h, houseGround + 1.18 + 0.62 * (1 - Math.abs(lz) / 0.78));
        }
        if (Math.hypot(x - wm.x, z - wm.z) < 0.5) h = Math.max(h, 2.4);
        for (const t of trees) {
          const d = Math.hypot(x - t.x, z - t.z);
          if (d < t.radius) h = Math.max(h, t.top - 0.35 - (d / t.radius) * 0.4);
        }
        this.heights[k] = h;
        ceiling = Math.max(ceiling, h);
      }
    }
    this.ceiling = ceiling + 0.1;
  }

  private index(x: number, z: number): number {
    const i = Math.floor(((x + EXTENT) / (2 * EXTENT)) * RES);
    const j = Math.floor(((z + EXTENT) / (2 * EXTENT)) * RES);
    if (i < 0 || j < 0 || i >= RES || j >= RES) return -1;
    return j * RES + i;
  }

  /** Surface height at (x, z), or null when the point is off the island. */
  heightAt(x: number, z: number): number | null {
    const k = this.index(x, z);
    if (k < 0) return null;
    const h = this.heights[k];
    return h === NONE ? null : h;
  }

  isPond(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.pond[k] === 1;
  }
}
