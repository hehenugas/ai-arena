import * as THREE from 'three';
import { clamp01 } from '../utils';

/**
 * Restrained environmental details coordinated with the World layout:
 * a stepping-stone path from the house, a small front-edge fence, a few
 * flowers and rocks. Flowers sway gently with the wind.
 */
export class Decorations {
  readonly group = new THREE.Group();
  private readonly flowers: THREE.Group[] = [];
  private readonly flowerPhase: number[] = [];

  constructor() {
    this.buildPath();
    this.buildFence();
    this.buildFlowers();
    this.buildRocks();
  }

  /** Stepping stones from the house door (≈2.0, 1.1) curving to the front-left. */
  private buildPath(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcdbb93, roughness: 1 });
    const stones: Array<[number, number, number]> = [
      [1.95, 0, 1.15],
      [1.5, 0, 1.6],
      [0.95, 0, 2.0],
      [0.3, 0, 2.35],
      [-0.4, 0, 2.6],
      [-1.1, 0, 2.78],
      [-1.75, 0, 2.85],
    ];
    for (const [x, , z] of stones) {
      const s = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.045, 10),
        stoneMat,
      );
      s.position.set(x, 0.025, z);
      s.rotation.y = (Math.sin(x * 3.1 + z) * 0.5);
      s.receiveShadow = true;
      this.group.add(s);
    }
  }

  /** A short picket fence along the front edge of the island. */
  private buildFence(): void {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xb88a55, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xa9743f, roughness: 0.9 });
    const xStart = -1.0;
    const xEnd = 0.9;
    const z = 3.05;
    const posts = 6;
    for (let i = 0; i < posts; i++) {
      const t = i / (posts - 1);
      const x = xStart + (xEnd - xStart) * t;
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.034, 0.32, 6),
        postMat,
      );
      p.position.set(x, 0.16, z);
      p.castShadow = true;
      this.group.add(p);
    }
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(xEnd - xStart, 0.02, 0.02), railMat);
    railTop.position.set((xStart + xEnd) / 2, 0.2, z);
    this.group.add(railTop);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(xEnd - xStart, 0.02, 0.02), railMat);
    railBot.position.set((xStart + xEnd) / 2, 0.08, z);
    this.group.add(railBot);
  }

  private buildFlowers(): void {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.9 });
    const bloomColors = [0xe0667a, 0xf2c84b, 0xe8924a, 0xd986d4, 0xf0f0f0];
    // positions chosen to avoid the path, house, pond and windmill
    const spots: Array<[number, number, number]> = [
      [-2.6, 0, 0.7],
      [-3.0, 0, -0.2],
      [2.9, 0, 1.8],
      [3.5, 0, 0.5],
      [-2.2, 0, 2.4],
      [0.6, 0, -2.6],
      [-0.6, 0, -2.8],
      [3.0, 0, -2.2],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [x, , z] = spots[i];
      const g = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, 0.18, 5),
        stemMat,
      );
      stem.position.y = 0.09;
      g.add(stem);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 6),
        new THREE.MeshStandardMaterial({
          color: bloomColors[i % bloomColors.length],
          roughness: 0.7,
        }),
      );
      bloom.position.y = 0.2;
      bloom.castShadow = true;
      g.add(bloom);
      g.position.set(x, 0, z);
      this.group.add(g);
      this.flowers.push(g);
      this.flowerPhase.push(i * 1.7);
    }
  }

  private buildRocks(): void {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8a7e6c,
      roughness: 1,
      flatShading: true,
    });
    const spots: Array<[number, number, number, number]> = [
      [3.5, 0, -0.6, 0.26],
      [-3.7, 0, -1.6, 0.28],
      [-1.0, 0, 1.3, 0.18],
      [0.9, 0, -1.0, 0.16],
    ];
    for (const [x, , z, s] of spots) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
      r.position.set(x, s * 0.4, z);
      r.rotation.set(Math.sin(x) * 2, Math.cos(z) * 2, 0.4);
      r.scale.y = 0.7;
      r.castShadow = true;
      r.receiveShadow = true;
      this.group.add(r);
    }
  }

  update(wind: number, time: number): void {
    const w = clamp01(wind);
    if (w < 0.001) {
      for (const f of this.flowers) f.rotation.z = 0;
      return;
    }
    for (let i = 0; i < this.flowers.length; i++) {
      const amp = 0.12 * w;
      this.flowers[i].rotation.z = Math.sin(time * 2.2 + this.flowerPhase[i]) * amp;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material).dispose();
      }
    });
  }
}
