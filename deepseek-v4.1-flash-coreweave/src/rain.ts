import * as THREE from 'three';
import type { World } from './world';

interface Drop {
  x: number;
  y: number;
  z: number;
  fall: number;
}

/**
 * Wind-aware rain built from a single `LineSegments` pool. Drops recycle on
 * the island surface (or below it, when they fall past the edge) so they never
 * stream through the terrain.
 */
export class RainSystem {
  readonly object: THREE.LineSegments;

  private readonly drops: Drop[] = [];
  private readonly positions: Float32Array;
  private readonly material: THREE.LineBasicMaterial;
  private readonly area = 6.2;
  private readonly topY = 8.6;
  private readonly bottomY = -3.8;
  private wasActive = false;

  constructor(scene: THREE.Scene, private readonly world: World, count: number) {
    this.positions = new Float32Array(count * 6);
    this.material = new THREE.LineBasicMaterial({
      color: '#c8dcf0',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.object = new THREE.LineSegments(geometry, this.material);
    this.object.name = 'rain';
    this.object.frustumCulled = false;
    this.object.visible = false;
    scene.add(this.object);

    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: (Math.random() * 2 - 1) * this.area,
        y: this.bottomY + Math.random() * (this.topY - this.bottomY),
        z: (Math.random() * 2 - 1) * this.area,
        fall: Math.random() * 4,
      });
    }
  }

  private respawn(drop: Drop): void {
    drop.x = (Math.random() * 2 - 1) * this.area;
    drop.z = (Math.random() * 2 - 1) * this.area;
    drop.y = this.topY * (0.55 + Math.random() * 0.45);
    drop.fall = Math.random() * 4;
  }

  private resetAll(): void {
    for (const drop of this.drops) {
      drop.x = (Math.random() * 2 - 1) * this.area;
      drop.z = (Math.random() * 2 - 1) * this.area;
      drop.y = this.bottomY + Math.random() * (this.topY - this.bottomY);
    }
  }

  /**
   * @param intensity Smoothed rain amount, 0..1 (already interpolated upstream).
   */
  update(dt: number, wind: number, intensity: number): void {
    this.material.opacity = 0.5 * intensity;
    const active = intensity > 0.02;
    this.object.visible = active;

    if (!active) {
      this.wasActive = false;
      return;
    }
    if (!this.wasActive) {
      this.resetAll();
      this.wasActive = true;
    }

    const speedX = wind * 5;
    const speedZ = wind * 1.7;
    const positions = this.positions;

    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      const speedY = -(8 + drop.fall);
      drop.x += speedX * dt;
      drop.z += speedZ * dt;
      drop.y += speedY * dt;

      if (drop.x > this.area) drop.x -= this.area * 2;
      else if (drop.x < -this.area) drop.x += this.area * 2;
      if (drop.z > this.area) drop.z -= this.area * 2;
      else if (drop.z < -this.area) drop.z += this.area * 2;

      const floor = this.world.isInside(drop.x, drop.z)
        ? this.world.groundY(drop.x, drop.z)
        : this.bottomY;
      if (drop.y < floor) this.respawn(drop);

      const length = Math.hypot(speedX, speedY, speedZ);
      const streak = Math.min(0.42, length * 0.028);
      const nx = speedX / length;
      const ny = speedY / length;
      const nz = speedZ / length;

      const o = i * 6;
      positions[o] = drop.x;
      positions[o + 1] = drop.y;
      positions[o + 2] = drop.z;
      positions[o + 3] = drop.x - nx * streak;
      positions[o + 4] = drop.y - ny * streak;
      positions[o + 5] = drop.z - nz * streak;
    }

    (this.object.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
