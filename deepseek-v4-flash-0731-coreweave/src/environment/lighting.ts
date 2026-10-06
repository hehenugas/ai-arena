import * as THREE from 'three';
import type { DayCycle } from './dayCycle';
import { lerp } from '../utils/noise';

/**
 * Scene lighting: a shadow-casting directional sun, a hemisphere fill light,
 * a cool moonlight directional for readability at night, and the warm point
 * light that glows near the house when its lights are on.
 */
export interface Lighting {
  update: (cycle: DayCycle, weather: number, houseLights: boolean) => void;
}

const SUN_DISTANCE = 70;

export function createLighting(scene: THREE.Scene, housePos: THREE.Vector3): Lighting {
  const sun = new THREE.DirectionalLight('#fff3d8', 1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight('#bfd8ff', '#8a9a6e', 0.55);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight('#8ea8d8', 0);
  moon.position.set(0, 1, 0);
  scene.add(moon);

  // Warm pool of light around the house when its lights are on.
  const houseGlow = new THREE.PointLight('#ffb45e', 0, 13, 2);
  houseGlow.position.set(housePos.x, 2.2, housePos.y);
  scene.add(houseGlow);

  const sunColor = new THREE.Color();
  const hemiSky = new THREE.Color();
  const hemiGround = new THREE.Color();
  const moonColor = new THREE.Color();
  let glowLevel = 0;

  const update: Lighting['update'] = (cycle, weather, houseLights) => {
    const { day, night, twilight, sunDir } = cycle;
    const wet = 1 - weather * 0.62;

    // Sun: warm white at noon, deep orange near the horizon.
    sunColor.set('#fff3d8').lerp(new THREE.Color('#ff9a4d'), twilight * 0.85);
    sun.intensity = (day * 1.15 + twilight * 0.55) * wet + 0.05;
    sun.color.copy(sunColor);
    sun.position.copy(sunDir.clone().multiplyScalar(SUN_DISTANCE));

    // Hemisphere fill follows the palette of the moment.
    hemiSky.set('#bfd8ff')
      .lerp(new THREE.Color('#7a6a8f'), twilight)
      .lerp(new THREE.Color('#101a3a'), night);
    hemiGround.set('#8a9a6e')
      .lerp(new THREE.Color('#5e4a3c'), twilight)
      .lerp(new THREE.Color('#0c1420'), night);
    hemi.intensity = (day * 0.62 + twilight * 0.34 + night * 0.15) * (1 - weather * 0.3);
    hemi.color.copy(hemiSky);
    hemi.groundColor.copy(hemiGround);

    // Moonlight keeps the shape readable but clearly nocturnal.
    moonColor.set('#8ea8d8').lerp(new THREE.Color('#3c4a66'), weather * 0.5);
    moon.intensity = night * (0.32 - weather * 0.14);
    moon.color.copy(moonColor);
    moon.position.copy(cycle.moonDir.clone().multiplyScalar(SUN_DISTANCE));

    // House glow fades in/out smoothly (interruptible by construction).
    const target = houseLights ? 1.6 : 0;
    glowLevel = lerp(glowLevel, target, 0.06);
    houseGlow.intensity = glowLevel * (0.85 + night * 0.6);
    houseGlow.color.copy(new THREE.Color('#ffb45e').lerp(new THREE.Color('#ffcf7a'), night));
  };

  return { update };
}