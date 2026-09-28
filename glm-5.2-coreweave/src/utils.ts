/**
 * Tiny math + color helpers used across the scene builders.
 * Keeping these dependency-free keeps the bundle small and tests trivial.
 */

import * as THREE from 'three';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smooth Hermite interpolation — gives the gentle, eased feel the brief asks for. */
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Map a value from one range to another, clamped to the output range. */
export function remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = (v - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, clamp01(t));
}

/** Periodic value in [min,max) for hours-of-day style inputs. */
export function cycleLerp(v: number, min: number, max: number): number {
  const span = max - min;
  return min + ((v - min) % span + span) % span;
}

/**
 * Smoothly interpolate between two THREE colors. Mutates `out` and returns it,
 * so we avoid allocating a new color every frame.
 */
export function lerpColor(out: THREE.Color, a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  out.r = lerp(a.r, b.r, t);
  out.g = lerp(a.g, b.g, t);
  out.b = lerp(a.b, b.b, t);
  return out;
}

/** Frame-rate independent exponential smoothing toward a target. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function dampV3(
  out: THREE.Vector3,
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number,
): THREE.Vector3 {
  const t = 1 - Math.exp(-lambda * dt);
  out.x = lerp(current.x, target.x, t);
  out.y = lerp(current.y, target.y, t);
  out.z = lerp(current.z, target.z, t);
  return out;
}

export function dampColor(
  out: THREE.Color,
  current: THREE.Color,
  target: THREE.Color,
  lambda: number,
  dt: number,
): THREE.Color {
  const t = 1 - Math.exp(-lambda * dt);
  out.r = lerp(current.r, target.r, t);
  out.g = lerp(current.g, target.g, t);
  out.b = lerp(current.b, target.b, t);
  return out;
}

/** Deterministic pseudo-random generator so the world is identical each load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hex string -> THREE.Color (typed for the color registry). */
export function hex(s: string): THREE.Color {
  return new THREE.Color(s);
}
