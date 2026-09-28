import { Vector2, Vector3 } from 'three';
import { clamp, damp, dampRing } from './utils';

export type Weather = 'clear' | 'rain';

export interface Snapshot {
  timeMinutes: number;
  weather: Weather;
  wind: number;
  houseLights: boolean;
}

export const DEFAULTS: Snapshot = {
  timeMinutes: 16 * 60,
  weather: 'clear',
  wind: 0.3,
  houseLights: false,
};

/**
 * One shared wind state: a single direction + strength in 0..1 that drives the
 * windmill, tree sway, cloud drift and rain slant alike.
 * Wind blows towards +X / +Z (towards the default three-quarter camera).
 */
export const WIND_DIR: Readonly<Vector2> = new Vector2(0.88, 0.47).normalize();

/** Horizontal wind velocity in world units/second for the current strength. */
export function windVector(wind: number, out: Vector3): Vector3 {
  const speed = wind * 3.4;
  return out.set(WIND_DIR.x * speed, 0, WIND_DIR.y * speed);
}

/**
 * Central application state. Targets are what the user asked for; the eased
 * values (effTime / rainMix / windEff) are what the scene renders, so every
 * change — however abrupt — becomes a smooth, interruptible transition.
 */
export class AppState {
  // User-facing targets
  timeMinutes = DEFAULTS.timeMinutes;
  weather: Weather = DEFAULTS.weather;
  wind = DEFAULTS.wind;
  houseLights = DEFAULTS.houseLights;

  // Eased values consumed by the scene
  effTime = DEFAULTS.timeMinutes;
  rainMix = 0;
  windEff = DEFAULTS.wind;

  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  setTime(minutes: number): void {
    this.timeMinutes = ((minutes % 1440) + 1440) % 1440;
    this.emit();
  }

  setWeather(weather: Weather): void {
    if (this.weather === weather) return;
    this.weather = weather;
    this.emit();
  }

  setWind(wind: number): void {
    this.wind = clamp(wind, 0, 1);
    this.emit();
  }

  setHouseLights(on: boolean): void {
    if (this.houseLights === on) return;
    this.houseLights = on;
    this.emit();
  }

  toggleHouseLights(): void {
    this.setHouseLights(!this.houseLights);
  }

  reset(): void {
    this.timeMinutes = DEFAULTS.timeMinutes;
    this.weather = DEFAULTS.weather;
    this.wind = DEFAULTS.wind;
    this.houseLights = DEFAULTS.houseLights;
    this.emit();
  }

  /** Ease the rendered state towards the targets. Clamped dt keeps this stable. */
  update(dt: number): void {
    this.effTime = dampRing(this.effTime, this.timeMinutes, 9, dt, 1440);
    this.rainMix = damp(this.rainMix, this.weather === 'rain' ? 1 : 0, 1.7, dt);
    this.windEff = damp(this.windEff, this.wind, 3.2, dt);
  }
}
