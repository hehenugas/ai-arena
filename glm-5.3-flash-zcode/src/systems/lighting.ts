import {
  AmbientLight,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Scene,
  Vector3,
} from 'three';
import { moonDirection, sunDirection, type SkySample } from '../palette';

const MOON_TINT = 0xaac2ea;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

export interface Lighting {
  update(time: number, rainAmount: number, sample: SkySample): void;
}

export function createLighting(scene: Scene, shadowMapSize: number): Lighting {
  scene.fog = new FogExp2(0xe7dcc2, 0.0075);

  const sun = new DirectionalLight(0xffe6b8, 1.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 12;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // The moon takes over when the sun is below the horizon.
  const moon = new DirectionalLight(MOON_TINT, 0);
  moon.castShadow = false;
  scene.add(moon, moon.target);

  const hemi = new HemisphereLight(0xbcd4ec, 0xa8977c, 0.58);
  scene.add(hemi);

  const ambient = new AmbientLight(0xffffff, 0.28);
  scene.add(ambient);

  const sunDir = new Vector3();
  const moonDir = new Vector3();

  return {
    update(time, rainAmount, sample) {
      sunDirection(time, sunDir);
      moonDirection(time, moonDir);

      // Crossfade sun and moon around the horizon so dusk has no pop.
      const sunFactor = smoothstep(-0.06, 0.02, sunDir.y);
      const moonFactor = smoothstep(-0.06, 0.02, -sunDir.y);

      sun.intensity = sample.sunIntensity * sunFactor;
      sun.color.copy(sample.sunColor);
      sun.position.copy(sunDir).multiplyScalar(30);
      sun.visible = sun.intensity > 0.015;

      moon.intensity = sample.sunIntensity * moonFactor * 0.85;
      moon.position.copy(moonDir).multiplyScalar(30);
      moon.visible = moon.intensity > 0.015;

      hemi.color.copy(sample.hemiSky);
      hemi.groundColor.copy(sample.hemiGround);
      hemi.intensity = sample.hemiIntensity * (1 - 0.15 * rainAmount);
      ambient.intensity = sample.ambientIntensity + 0.04;

      const fog = scene.fog as FogExp2;
      fog.color.copy(sample.fogColor);
      fog.density = 0.0075 + rainAmount * 0.005;
    },
  };
}
