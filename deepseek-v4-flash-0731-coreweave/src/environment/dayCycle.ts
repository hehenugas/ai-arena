import * as THREE from 'three';
import { smoothstep } from '../utils/noise';

/**
 * Day/night cycle maths. Sun orbits the island once per 24 h: up at ~6:00,
 * high at noon, down at ~18:00. Everything else (sky, lights, windows) is
 * derived from the values computed here.
 */
export interface DayCycle {
  /** Normalized direction from the island toward the sun. */
  sunDir: THREE.Vector3;
  /** Normalized direction toward the moon (opposite the sun). */
  moonDir: THREE.Vector3;
  /** Sun elevation: 1 = overhead, 0 = horizon, negative = below. */
  elevation: number;
  /** Moon elevation (for the moon disc). */
  moonElevation: number;
  /** 0..1 how "daytime" the light currently is. */
  day: number;
  /** 0..1 how "nighttime" the light currently is. */
  night: number;
  /** 0..1 how strong the sunset/sunrise glow is. */
  twilight: number;
}

function sunPosition(hours: number): THREE.Vector3 {
  // t = 0 at sunrise (06:00), 1 at sunset (18:00); outside that range the
  // sun is below the horizon and elev goes negative.
  const t = (hours - 6) / 12;
  const elev = Math.sin(Math.PI * t);
  // Gentle arc across the sky: rises in the +X/Z quadrant, sets toward -Z.
  const yaw = Math.PI * (0.16 - 0.5 * t);
  const cosElev = Math.sqrt(Math.max(0, 1 - elev * elev));
  return new THREE.Vector3(
    Math.cos(yaw) * cosElev,
    elev,
    Math.sin(yaw) * cosElev
  ).normalize();
}

export function computeDayCycle(hours: number): DayCycle {
  const sunDir = sunPosition(hours);
  const moonDir = sunDir.clone().negate();
  const elevation = sunDir.y;
  const moonElevation = moonDir.y;

  const day = smoothstep(0.02, 0.3, elevation);
  const twilight = Math.exp(-Math.pow(elevation * 7.0, 2));
  const night = 1 - smoothstep(-0.16, 0.14, elevation);

  return { sunDir, moonDir, elevation, moonElevation, day, night, twilight };
}

/** Where the sun light should be placed for a given direction. */
export function sunPositionAt(sunDir: THREE.Vector3, distance: number): THREE.Vector3 {
  return sunDir.clone().multiplyScalar(distance);
}