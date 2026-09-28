import * as THREE from 'three';
import type { World } from './world';
import { lerp } from './math';

interface Ripple {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  alive: boolean;
  t: number;
  duration: number;
  size: number;
}

/** A reused pool of expanding rings on the pond surface during rain. */
export class RippleSystem {
  private readonly ripples: Ripple[] = [];
  private readonly geometry = new THREE.RingGeometry(0.55, 1, 30);
  private timer = 0;
  private cursor = 0;

  constructor(private readonly scene: THREE.Scene, private readonly world: World, count: number) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: '#dceaf6',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.scene.add(mesh);
      this.ripples.push({ mesh, material, alive: false, t: 0, duration: 1, size: 0.3 });
    }
  }

  private spawn(): void {
    const ripple = this.ripples[this.cursor];
    this.cursor = (this.cursor + 1) % this.ripples.length;

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * this.world.pond.r * 0.82;
    ripple.mesh.position.x = this.world.pond.x + Math.cos(angle) * radius;
    ripple.mesh.position.z = this.world.pond.z + Math.sin(angle) * radius;
    ripple.mesh.visible = true;
    ripple.alive = true;
    ripple.t = 0;
    ripple.duration = 0.9 + Math.random() * 0.7;
    ripple.size = 0.22 + Math.random() * 0.26;
  }

  update(dt: number, rain: number): void {
    if (rain > 0.12) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.spawn();
        this.timer = lerp(0.34, 0.09, rain);
      }
    }

    const surfaceY = this.world.water.position.y + 0.008;
    for (const ripple of this.ripples) {
      if (!ripple.alive) continue;
      ripple.t += dt;
      const p = ripple.t / ripple.duration;
      if (p >= 1) {
        ripple.alive = false;
        ripple.mesh.visible = false;
        continue;
      }
      ripple.mesh.position.y = surfaceY;
      ripple.mesh.scale.setScalar(ripple.size * (0.5 + p * 1.7));
      ripple.material.opacity = 0.7 * Math.min(1, p * 6) * (1 - p);
    }
  }
}
