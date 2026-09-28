import * as THREE from 'three';
import type { Frame } from '../frame';
import { smoothstep } from '../utils/math';
import { createSample, keyLightDirection, samplePalette, sunDirection } from './palette';
import { Sky } from './sky';

const RAIN_KEY = new THREE.Color(0xcfd6e0);
const RAIN_HEMI = new THREE.Color(0xb4bfca);
const WATER_DAY = new THREE.Color(0x5f8fa6);
const WATER_RAIN = new THREE.Color(0x56707e);
const GRASS_DRY = new THREE.Color(0xffffff);
const GRASS_WET = new THREE.Color(0xc9d4c6);
const tmp = new THREE.Color();

function overcast(c: THREE.Color, amount: number) {
  const lum = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  tmp.setRGB(lum * 0.82, lum * 0.86, lum * 0.95);
  c.lerp(tmp, amount);
}

export interface AtmosphereTargets {
  grass: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
}

/** Derives sky, sun/moon and ambient light from the smoothed time and weather. */
export class Atmosphere {
  readonly sky = new Sky();
  readonly key: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  /** Faint moonlit fill so the underside never drops to black at night. */
  private readonly fill: THREE.AmbientLight;
  private readonly sample = createSample();
  private readonly dir = new THREE.Vector3();

  constructor(scene: THREE.Scene, shadowSize: number, private readonly targets: AtmosphereTargets) {
    scene.add(this.sky.group);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.fill = new THREE.AmbientLight(0x8a9ac4, 0);
    scene.add(this.hemi, this.fill);

    this.key = new THREE.DirectionalLight(0xffffff, 2);
    this.key.castShadow = true;
    const cam = this.key.shadow.camera;
    cam.left = cam.bottom = -7.5;
    cam.right = cam.top = 7.5;
    cam.near = 2;
    cam.far = 45;
    this.key.shadow.mapSize.set(shadowSize, shadowSize);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.025;
    this.key.shadow.radius = 3;
    scene.add(this.key, this.key.target);
  }

  update(frame: Frame, camera: THREE.Camera): void {
    const s = samplePalette(frame.hour, this.sample);
    const rain = frame.rain;
    frame.night = s.night;

    overcast(s.skyTop, rain * 0.7);
    overcast(s.horizon, rain * 0.65);
    overcast(s.bottom, rain * 0.6);
    const u = this.sky.uniforms;
    u.uTop.value.copy(s.skyTop).multiplyScalar(1 - rain * 0.15);
    u.uHorizon.value.copy(s.horizon).multiplyScalar(1 - rain * 0.1);
    u.uBottom.value.copy(s.bottom);
    u.uGlowColor.value.copy(s.glowColor);
    u.uGlow.value = s.glow * (1 - rain * 0.8);
    sunDirection(frame.hour, u.uSunDir.value);

    const { isSun } = keyLightDirection(frame.hour, this.dir);
    this.key.position.copy(this.dir).multiplyScalar(20);
    this.key.target.position.set(0, 0, 0);
    this.key.color.copy(s.key).lerp(RAIN_KEY, rain * 0.45);
    this.key.intensity = s.keyI * (1 - rain * 0.62);
    this.key.shadow.intensity = 1 - rain * 0.55;

    this.hemi.color.copy(s.hemiSky).lerp(RAIN_HEMI, rain * 0.3 * (1 - s.night));
    this.hemi.groundColor.copy(s.hemiGround);
    this.hemi.intensity = s.hemiI * (1 + rain * 0.12);
    this.fill.intensity = s.night * 0.35;

    // By night the key light *is* the moon, so the visible moon shares its direction.
    const moonVis = isSun ? 0 : smoothstep(0.45, 0.95, s.night) * (1 - rain * 0.85);
    this.sky.update(camera, s.night * s.night * (1 - rain) * 0.9, this.dir, moonVis);

    this.targets.water.color.copy(WATER_DAY).lerp(WATER_RAIN, rain).lerp(s.horizon, 0.18);
    this.targets.water.roughness = 0.12 + rain * 0.25;
    this.targets.grass.color.copy(GRASS_DRY).lerp(GRASS_WET, rain * 0.7);
  }
}
