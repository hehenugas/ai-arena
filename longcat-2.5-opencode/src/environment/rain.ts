import * as THREE from 'three';
import { AppState } from '../state';

export class RainSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private velocities: Float32Array;
  private particleCount = 2000;
  private rainIntensity = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      this.velocities[i * 3 + 1] = -10 - Math.random() * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.1,
      transparent: true,
      opacity: 0,
    });

    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }

  update(state: AppState, delta: number, _elapsed: number): void {
    const targetIntensity = state.weather === 'rain' ? 1 : 0;
    this.rainIntensity += (targetIntensity - this.rainIntensity) * delta * 2;

    const material = this.particles.material as THREE.PointsMaterial;
    material.opacity = this.rainIntensity * 0.6;

    if (this.rainIntensity < 0.01) return;

    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    const windX = state.wind * 3;
    const windZ = state.wind * 1.5;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      posArray[idx + 1] += this.velocities[idx + 1] * delta;
      posArray[idx] += windX * delta;
      posArray[idx + 2] += windZ * delta;

      if (posArray[idx + 1] < -5 || Math.abs(posArray[idx]) > 20 || Math.abs(posArray[idx + 2]) > 20) {
        posArray[idx] = (Math.random() - 0.5) * 30;
        posArray[idx + 1] = 15 + Math.random() * 5;
        posArray[idx + 2] = (Math.random() - 0.5) * 30;
      }
    }

    positions.needsUpdate = true;
  }
}
