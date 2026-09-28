import * as THREE from 'three';
import { AppState } from '../state';

export class RippleSystem {
  private waterMaterial: THREE.ShaderMaterial;

  constructor(pond: THREE.Group) {
    this.waterMaterial = pond.userData.waterMaterial;
  }

  update(state: AppState, delta: number): void {
    this.waterMaterial.uniforms.uTime.value += delta;
    const targetRain = state.weather === 'rain' ? 1 : 0;
    const currentRain = this.waterMaterial.uniforms.uRainIntensity.value;
    this.waterMaterial.uniforms.uRainIntensity.value = currentRain + (targetRain - currentRain) * delta * 2;
  }
}
