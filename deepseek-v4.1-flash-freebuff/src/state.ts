import type { SkyPalette } from './palette';
import type { Vector3 } from 'three';

export type Weather = 'clear' | 'rain';

/** Single source of truth for everything the UI and the scene share. */
export interface AppState {
  /** 0-24 hours, fractional. */
  time: number;
  weather: Weather;
  /** 0-1 (the slider shows it as a percentage). */
  wind: number;
  houseLights: boolean;
}

export const DEFAULTS: AppState = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  houseLights: false,
};

export type StateListener = (state: Readonly<AppState>, previous: Readonly<AppState>) => void;

export class Store {
  private state: AppState = { ...DEFAULTS };
  private readonly listeners = new Set<StateListener>();

  get value(): Readonly<AppState> {
    return this.state;
  }

  set(patch: Partial<AppState>): void {
    const previous = this.state;
    const next: AppState = { ...previous, ...patch };
    if (
      next.time === previous.time &&
      next.weather === previous.weather &&
      next.wind === previous.wind &&
      next.houseLights === previous.houseLights
    ) {
      return;
    }
    this.state = next;
    for (const listener of this.listeners) listener(this.state, previous);
  }

  toggleLights(): void {
    this.set({ houseLights: !this.state.houseLights });
  }

  reset(): void {
    this.set({ ...DEFAULTS });
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Everything a scene module needs for one frame. Built once per frame by the
 * world, so modules never reach back into the store or duplicate derived values.
 */
export interface FrameContext {
  /** Clamped delta time in seconds. */
  dt: number;
  /** Seconds since the world was created (decorative motion phase). */
  elapsed: number;
  state: Readonly<AppState>;
  /** 0-1 where 1 is deep night. */
  night: number;
  /** Smoothed rain amount, 0-1 (interruptible transition of the weather). */
  rain: number;
  /** Direction of the sun itself (below the horizon at night), normalised. */
  sunDir: Vector3;
  /**
   * Direction the key light shines from. It follows the sun but never drops
   * below the horizon, so lighting and shadows stay sensible through dusk and
   * across the switch to moonlight.
   */
  lightDir: Vector3;
  /** Fraction of the frame that is driven by wind, 0-1. */
  wind: number;
  palette: SkyPalette;
  reducedMotion: boolean;
}
