import * as THREE from 'three';
import type { DayCycle } from '../palette';

/** Sun/moon key light (one light, swapped at the invisible zero crossing), hemi + ambient + fog. */
export function createLighting(scene: THREE.Scene, small: boolean) {
  const sun = new THREE.DirectionalLight('#ffffff', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  sun.shadow.camera.left = -11.5;
  sun.shadow.camera.right = 11.5;
  sun.shadow.camera.top = 11.5;
  sun.shadow.camera.bottom = -11.5;
  sun.shadow.camera.near = 3;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight('#bcd6ea', '#665d4e', 0.5);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight('#c2d2e2', 0.5);
  scene.add(ambient);

  scene.fog = new THREE.Fog('#dcedf6', 30, 95);

  const hemiSky = new THREE.Color();

  return {
    update(cycle: DayCycle) {
      if (cycle.sunElev >= 0) {
        sun.position.copy(cycle.sunDir).multiplyScalar(24);
        sun.color.copy(cycle.sunColor);
        sun.intensity = cycle.sunIntensity;
      } else {
        sun.position.copy(cycle.moonDir).multiplyScalar(24);
        sun.color.copy(cycle.moonColor);
        sun.intensity = cycle.moonIntensity;
      }

      hemiSky.copy(cycle.skyTop).lerp(cycle.skyHorizon, 0.5);
      hemi.color.copy(hemiSky);
      hemi.intensity = cycle.hemiIntensity;

      ambient.color.copy(cycle.ambientColor);
      ambient.intensity = cycle.ambientIntensity;

      const fog = scene.fog as THREE.Fog;
      fog.color.copy(cycle.fogColor);
      fog.near = cycle.fogNear;
      fog.far = cycle.fogFar;
    },
  };
}
