import { clamp, damp, shortestAngleDelta } from './utils';

export type Weather = 'clear' | 'rain';

export interface WorldTarget {
  /** Hours, 0..24. */
  time: number;
  weather: Weather;
  /** 0..1 */
  wind: number;
  lights: boolean;
}

/** Values the scene actually renders this frame, eased toward the target. */
export interface WorldLive {
  time: number;
  wind: number;
  lights: number;
  rain: number;
}

export const DEFAULTS: WorldTarget = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  lights: false,
};

type Listener = (target: WorldTarget, live: WorldLive) => void;

/**
 * Single source of truth for environment state. The UI and the 3D scene both
 * talk to this object, so a click on the house and the panel switch can never
 * disagree. Easing happens here (not in the UI) which keeps every transition
 * interruptible: a new target simply replaces the old one.
 */
export class WorldState {
  readonly target: WorldTarget = { ...DEFAULTS };
  readonly live: WorldLive = { time: DEFAULTS.time, wind: DEFAULTS.wind, lights: 0, rain: 0 };

  private listeners: Listener[] = [];
  private timeAccumulator = 0;

  constructor(initial: Partial<WorldTarget> = {}) {
    Object.assign(this.target, initial);
    this.live.time = this.target.time;
    this.live.wind = this.target.wind;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    fn(this.target, this.live);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  setTime(hours: number): void {
    this.target.time = ((hours % 24) + 24) % 24;
    this.emit();
  }

  setWeather(weather: Weather): void {
    if (this.target.weather === weather) return;
    this.target.weather = weather;
    this.emit();
  }

  setWind(normalized: number): void {
    this.target.wind = clamp(normalized, 0, 1);
    this.emit();
  }

  toggleLights(force?: boolean): void {
    const next = force ?? !this.target.lights;
    if (next === this.target.lights) return;
    this.target.lights = next;
    this.emit();
  }

  reset(): void {
    this.target.time = DEFAULTS.time;
    this.target.weather = DEFAULTS.weather;
    this.target.wind = DEFAULTS.wind;
    this.target.lights = DEFAULTS.lights;
    this.emit();
  }

  /** Advance eased values. `dt` is already clamped by the render loop. */
  update(dt: number): void {
    this.live.time =
      (this.live.time + shortestAngleDelta(this.live.time, this.target.time, 24) * (1 - Math.exp(-3.2 * dt)) + 24) %
      24;
    this.live.wind = damp(this.live.wind, this.target.wind, 2.6, dt);
    this.live.lights = damp(this.live.lights, this.target.lights ? 1 : 0, 6, dt);
    this.live.rain = damp(this.live.rain, this.target.weather === 'rain' ? 1 : 0, 1.9, dt);
    this.timeAccumulator += dt;
  }

  /** 0 at midnight, 1 at solar noon — used for cheap day/night checks. */
  get sunHeight(): number {
    return sunHeight(this.live.time);
  }

  /** Seconds since boot, for looping decorative motion. */
  get elapsed(): number {
    return this.timeAccumulator;
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.target, this.live);
  }
}

/**
 * The island sits at a high latitude, so the sun never passes straight overhead.
 * The arc is tilted by SUN_TILT radians: daylight runs roughly 07:30-16:30 and
 * walls always catch a little light, which is what keeps the cottage readable.
 */
export const SUN_TILT = 0.38;
export const SUN_AZIMUTH = (260 * Math.PI) / 180;

/** Sun elevation, -1 at the bottom of the arc through 0 to 1 at its peak. */
export const sunHeight = (hours: number): number =>
  Math.sin(((hours - 6) / 12) * Math.PI - SUN_TILT);


export const formatClock = (hours: number): string => {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatPhase = (hours: number): string => {
  if (hours < 5) return 'Late night';
  if (hours < 8) return 'Dawn';
  if (hours < 11) return 'Morning';
  if (hours < 14) return 'Midday';
  if (hours < 17) return 'Afternoon';
  if (hours < 19.5) return 'Golden hour';
  if (hours < 21) return 'Dusk';
  return 'Night';
};
