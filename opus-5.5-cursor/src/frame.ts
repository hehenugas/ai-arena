import type * as THREE from 'three';

/**
 * Per-frame snapshot of the smoothed environment. Every animated system reads
 * from this one object, so wind, rain and light always agree with each other.
 */
export interface Frame {
  /** Clamped seconds since last frame. */
  dt: number;
  /** Accumulated seconds. */
  elapsed: number;
  /** Smoothed hour of day. */
  hour: number;
  /** Smoothed wind strength 0–1. */
  wind: number;
  /** Unit vector the wind blows toward (XZ plane). */
  windDir: THREE.Vector3;
  /** Smoothed rain amount 0–1. */
  rain: number;
  /** 0 in daylight, 1 in deep night. */
  night: number;
  /** Smoothed house light level 0–1. */
  lights: number;
  /** 1 normally, reduced when the user prefers reduced motion. */
  motion: number;
}
