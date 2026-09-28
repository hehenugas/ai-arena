import * as THREE from 'three';
import { store } from './state';
import type { SkyUniforms } from './sky';
import type { World } from './world';
import { angleDamp, clamp, damp, lerp, smoothstep } from './math';

export interface EnvironmentState {
  wind: number;
  rain: number;
  night: number;
  day: number;
  lights: number;
  sunDir: THREE.Vector3;
}

interface PaletteSet {
  top: THREE.Color;
  horizon: THREE.Color;
  bottom: THREE.Color;
  sun: THREE.Color;
  key: THREE.Color;
  keyIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fog: THREE.Color;
}

function palette(p: {
  top: string;
  horizon: string;
  bottom: string;
  sun: string;
  key: string;
  keyIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
}): PaletteSet {
  return {
    top: new THREE.Color(p.top),
    horizon: new THREE.Color(p.horizon),
    bottom: new THREE.Color(p.bottom),
    sun: new THREE.Color(p.sun),
    key: new THREE.Color(p.key),
    keyIntensity: p.keyIntensity,
    hemiSky: new THREE.Color(p.hemiSky),
    hemiGround: new THREE.Color(p.hemiGround),
    hemiIntensity: p.hemiIntensity,
    fog: new THREE.Color(p.fog),
  };
}

const DAY = palette({
  top: '#2f6db6',
  horizon: '#e2ecf4',
  bottom: '#3f6fa6',
  sun: '#fff3d4',
  key: '#fff1d2',
  keyIntensity: 2.15,
  hemiSky: '#cfe6f2',
  hemiGround: '#6f9160',
  hemiIntensity: 0.7,
  fog: '#bcd2e2',
});

const DUSK = palette({
  top: '#2b3a74',
  horizon: '#f2a468',
  bottom: '#4c3552',
  sun: '#ffb066',
  key: '#ff9c56',
  keyIntensity: 1.45,
  hemiSky: '#e8ad7c',
  hemiGround: '#5f5540',
  hemiIntensity: 0.48,
  fog: '#8d6672',
});

const NIGHT = palette({
  top: '#0a1024',
  horizon: '#17273f',
  bottom: '#04070f',
  sun: '#cdd8ff',
  key: '#9db4ff',
  keyIntensity: 0.4,
  hemiSky: '#243352',
  hemiGround: '#18202e',
  hemiIntensity: 0.42,
  fog: '#131c33',
});

const MOON_COLOR = new THREE.Color('#a8bcff');
const RAIN_GRAY = new THREE.Color('#707a88');
const CLOUD_BASE = new THREE.Color('#f5f8fb');

const dayAngle = (time: number): number => ((time - 12) / 12) * Math.PI;

function copyPalette(src: PaletteSet, dst: PaletteSet): void {
  dst.top.copy(src.top);
  dst.horizon.copy(src.horizon);
  dst.bottom.copy(src.bottom);
  dst.sun.copy(src.sun);
  dst.key.copy(src.key);
  dst.keyIntensity = src.keyIntensity;
  dst.hemiSky.copy(src.hemiSky);
  dst.hemiGround.copy(src.hemiGround);
  dst.hemiIntensity = src.hemiIntensity;
  dst.fog.copy(src.fog);
}

function blendPalette(a: PaletteSet, b: PaletteSet, t: number, dst: PaletteSet): void {
  dst.top.copy(a.top).lerp(b.top, t);
  dst.horizon.copy(a.horizon).lerp(b.horizon, t);
  dst.bottom.copy(a.bottom).lerp(b.bottom, t);
  dst.sun.copy(a.sun).lerp(b.sun, t);
  dst.key.copy(a.key).lerp(b.key, t);
  dst.keyIntensity = lerp(a.keyIntensity, b.keyIntensity, t);
  dst.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
  dst.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
  dst.hemiIntensity = lerp(a.hemiIntensity, b.hemiIntensity, t);
  dst.fog.copy(a.fog).lerp(b.fog, t);
}

/**
 * Owns every time-of-day and weather driven value. All targets are derived
 * from smoothed "current" values, so scrubbing the controls never produces
 * competing animations or a desynchronised scene.
 */
export class Environment implements EnvironmentState {
  readonly sun = new THREE.DirectionalLight('#fff1d2', 1);
  readonly moon = new THREE.DirectionalLight('#a8bcff', 0);
  readonly hemi = new THREE.HemisphereLight('#cfe6f2', '#6f9160', 0.7);
  readonly fog = new THREE.Fog('#cfe6f2', 15, 48);
  readonly sunDir = new THREE.Vector3(0.5, 0.5, 0.3).normalize();

  wind = 0.3;
  rain = 0;
  night = 0;
  day = 1;
  lights = 0;

  private angle = dayAngle(store.state.time);
  private readonly work = palette({
    top: '#2f6db6',
    horizon: '#cfe6f2',
    bottom: '#bcd6c6',
    sun: '#fff3d4',
    key: '#fff1d2',
    keyIntensity: 2.15,
    hemiSky: '#cfe6f2',
    hemiGround: '#6f9160',
    hemiIntensity: 0.7,
    fog: '#cfe6f2',
  });

  constructor(
    scene: THREE.Scene,
    private readonly world: World,
    private readonly sky: SkyUniforms,
    shadowMapSize: number,
  ) {
    scene.fog = this.fog;

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.sun.shadow.camera.left = -6.5;
    this.sun.shadow.camera.right = 6.5;
    this.sun.shadow.camera.top = 6.5;
    this.sun.shadow.camera.bottom = -6.5;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 40;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.025;
    this.sun.target.position.set(0, -0.5, 0);

    this.moon.castShadow = false;
    this.moon.target.position.set(0, -0.5, 0);

    scene.add(this.sun, this.sun.target, this.moon, this.moon.target, this.hemi);
  }

  update(dt: number): void {
    const state = store.state;

    this.angle = angleDamp(this.angle, dayAngle(state.time), 3.2, dt);
    this.rain = damp(this.rain, state.weather === 'rain' ? 1 : 0, 1.4, dt);
    this.wind = damp(this.wind, clamp(state.wind, 0, 1), 5, dt);
    this.lights = damp(this.lights, state.lightsOn ? 1 : 0, 7, dt);

    const a = this.angle;
    this.sunDir.set(Math.sin(a) * 0.92, Math.cos(a), Math.sin(a) * 0.36).normalize();
    const elevation = this.sunDir.y;
    this.night = 1 - smoothstep(-0.14, 0.06, elevation);
    this.day = smoothstep(0.02, 0.22, elevation);
    this.night = clamp(this.night, 0, 1);

    // Blend the sky palette across dawn, day and night.
    if (elevation > 0.22) copyPalette(DAY, this.work);
    else if (elevation > -0.02) blendPalette(DUSK, DAY, smoothstep(-0.02, 0.22, elevation), this.work);
    else blendPalette(NIGHT, DUSK, smoothstep(-0.2, -0.02, elevation), this.work);

    const work = this.work;
    if (this.rain > 0.001) {
      work.top.lerp(RAIN_GRAY, this.rain * 0.7);
      work.horizon.lerp(RAIN_GRAY, this.rain * 0.6);
      work.bottom.lerp(RAIN_GRAY, this.rain * 0.5);
      work.sun.lerp(RAIN_GRAY, this.rain * 0.5);
      work.fog.lerp(RAIN_GRAY, this.rain * 0.55);
      work.keyIntensity *= 1 - this.rain * 0.5;
      work.hemiIntensity = work.hemiIntensity * (1 - this.rain * 0.15) + 0.08 * this.rain;
    }

    // Key light: sun by day, a dim blue moon by night.
    this.sun.position.copy(this.sunDir).multiplyScalar(15);
    this.sun.color.copy(work.key);
    this.sun.intensity = work.keyIntensity * smoothstep(-0.03, 0.14, elevation);
    this.sun.castShadow = this.sun.intensity > 0.06;

    this.moon.position.copy(this.sunDir).multiplyScalar(-15);
    this.moon.color.copy(MOON_COLOR);
    this.moon.intensity = this.night * 0.5 * (1 - this.rain * 0.35);
    this.moon.castShadow = !this.sun.castShadow && this.moon.intensity > 0.08;

    this.hemi.color.copy(work.hemiSky);
    this.hemi.groundColor.copy(work.hemiGround);
    this.hemi.intensity = work.hemiIntensity + this.day * 0.05;

    this.fog.color.copy(work.fog);
    this.fog.near = lerp(15, 8, this.rain);
    this.fog.far = lerp(48, 26, this.rain);

    this.sky.uTop.value.copy(work.top);
    this.sky.uHorizon.value.copy(work.horizon);
    this.sky.uBottom.value.copy(work.bottom);
    this.sky.uSunColor.value.copy(work.sun);
    this.sky.uSunDir.value.copy(this.sunDir);
    this.sky.uSunIntensity.value = smoothstep(-0.04, 0.1, elevation) * (1 - this.rain * 0.75);
    this.sky.uNight.value = this.night * (1 - this.rain * 0.7);
    this.sky.uRain.value = this.rain;

    // Lit windows are subtle by day and unmistakable at night.
    const glow = this.lights * (0.45 + 2.0 * this.night);
    this.world.windowMaterial.emissiveIntensity = glow;
    this.world.houseLight.intensity = this.lights * (0.7 + 1.8 * this.night);
    this.world.houseLight.visible = this.lights > 0.02;

    this.world.cloudMaterial.color
      .copy(CLOUD_BASE)
      .lerp(RAIN_GRAY, this.rain * 0.7)
      .multiplyScalar(lerp(1, 0.55, this.night));
  }
}
