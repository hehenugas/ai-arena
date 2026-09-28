export type Weather = 'clear' | 'rain';

export interface WorldState {
  /** Hour of day, 0–24. */
  time: number;
  weather: Weather;
  /** Wind strength, 0–1. */
  wind: number;
  lights: boolean;
}

export const DEFAULT_STATE: Readonly<WorldState> = Object.freeze({
  time: 16,
  weather: 'clear',
  wind: 0.3,
  lights: false,
});

export type ChangeSource = 'ui' | 'scene' | 'reset';
type Listener = (state: Readonly<WorldState>, source: ChangeSource) => void;

/** Single source of truth for the environment. The scene derives everything from it each frame. */
export class Store {
  private current: WorldState = { ...DEFAULT_STATE };
  private listeners = new Set<Listener>();

  get state(): Readonly<WorldState> {
    return this.current;
  }

  set(patch: Partial<WorldState>, source: ChangeSource = 'ui'): void {
    const next = { ...this.current, ...patch };
    next.time = Math.min(24, Math.max(0, next.time));
    next.wind = Math.min(1, Math.max(0, next.wind));
    this.current = next;
    this.listeners.forEach((fn) => fn(this.current, source));
  }

  reset(): void {
    this.set({ ...DEFAULT_STATE }, 'reset');
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export function formatTime(hours: number): string {
  const total = Math.round(hours * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function describeTime(hours: number): string {
  if (hours < 5) return 'Night';
  if (hours < 7) return 'Dawn';
  if (hours < 11) return 'Morning';
  if (hours < 14) return 'Midday';
  if (hours < 17.25) return 'Afternoon';
  if (hours < 19) return 'Sunset';
  if (hours < 20.5) return 'Dusk';
  return 'Night';
}

export function describeWind(wind: number): string {
  if (wind < 0.02) return 'Still';
  if (wind < 0.25) return 'Light air';
  if (wind < 0.5) return 'Breeze';
  if (wind < 0.75) return 'Blustery';
  return 'Gale';
}
