import * as THREE from 'three';
import { SUN_AZIMUTH, SUN_TILT } from '../core/state';
import type { Mood } from '../core/theme';
import { lerp, smoothstep } from '../core/utils';

const GROUND_BOUNCE = new THREE.Color(0x7d6a48);
const NIGHT_FILL = new THREE.Color(0x33456b);
const WARM_BOUNCE = new THREE.Color(0xc9a887);

export interface Lighting {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  bounce: THREE.DirectionalLight;
  /** Aimed across the rock face rather than straight up; see createLighting. */
  underlight: THREE.DirectionalLight;
  fog: THREE.Fog;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  lightDir: THREE.Vector3;
  /** 1 when the moon is the dominant light source. */
  moonMix: number;
  update(mood: Mood, time: number, rain: number): void;
}

/**
 * One shadow-casting key light stands in for sun by day and moon by night: its
 * direction crosses over the top of the sky during twilight, so dragging the
 * time slider never snaps the shadows from one side of the island to the other.
 * A dim, shadowless bounce light from below keeps the floating rock readable.
 */
export function createLighting(scene: THREE.Scene, shadowSize: number): Lighting {
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  const bounce = new THREE.DirectionalLight(0x9fb6c8, 0.35);
  bounce.position.set(-6, -9, 5);
  scene.add(bounce);

  /**
   * Second underlight, tilted out toward the viewer rather than straight up.
   * The island's underside is a downward-facing cone, so a light directly below
   * grazes every facet at a glancing angle and contributes almost nothing.
   * Aiming this one across the rock face is what keeps the cone from going black.
   */
  const underlight = new THREE.DirectionalLight(0xb9c6d4, 0.6);
  underlight.position.set(0, -8, 16);
  scene.add(underlight);

  const hemi = new THREE.HemisphereLight(0xa8c6e0, GROUND_BOUNCE, 0.9);
  scene.add(hemi);

  const fog = new THREE.Fog(0xc9dbe6, 17, 62);
  scene.fog = fog;

  const sunDir = new THREE.Vector3(0, 1, 0);
  const moonDir = new THREE.Vector3(0, -1, 0);
  const lightDir = new THREE.Vector3(0, 1, 0);

  return {
    sun,
    hemi,
    bounce,
    underlight,
    fog,
    sunDir,
    moonDir,
    lightDir,
    moonMix: 0,
    update(mood, time, rain) {
      const angle = ((time - 6) / 12) * Math.PI - SUN_TILT;
      const horizontal = Math.cos(angle);
      const azX = Math.sin(SUN_AZIMUTH);
      const azZ = Math.cos(SUN_AZIMUTH);

      sunDir.set(azX * horizontal, Math.sin(angle), azZ * horizontal).normalize();
      moonDir.copy(sunDir).negate();

      // Blend across the horizon so twilight has no discontinuity.
      const t = smoothstep(-0.12, 0.12, Math.sin(angle));
      lightDir.copy(moonDir).lerp(sunDir, t).normalize();
      this.moonMix = 1 - t;

      sun.position.copy(lightDir).multiplyScalar(26);
      sun.color.copy(mood.light);
      sun.intensity = mood.lightIntensity;

      // Bounce light sits below and slightly sun-side, so the face of the rock
      // turned towards the viewer is the one that gets filled in.
      bounce.position.set(lightDir.x * 13, -15, lightDir.z * 13);
      bounce.color.copy(mood.fill).lerp(WARM_BOUNCE, 0.55);
      bounce.intensity = 0.5 + mood.night * 0.12 + rain * 0.08;

      underlight.color.copy(mood.fill).lerp(WARM_BOUNCE, 0.35);
      underlight.intensity = 0.62 + mood.night * 0.1 + rain * 0.06;

      hemi.color.copy(mood.fill);
      hemi.groundColor.copy(GROUND_BOUNCE).lerp(NIGHT_FILL, mood.night);
      // The ground term lights downward-facing rock. The sun is already strong on
      // the grass cap, so this stays a modest lift rather than a second key.
      hemi.intensity = mood.fillIntensity * lerp(1.3, 1.42, rain);

      fog.color.copy(mood.fog);
      fog.near = lerp(17, 9, rain);
      fog.far = lerp(62, 27, rain);
    },
  };
}

