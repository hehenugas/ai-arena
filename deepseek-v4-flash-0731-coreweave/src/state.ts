/**
 * Coherent application state for time, weather, wind and house lighting.
 * Every scene effect is derived from this single state object.
 */

export type Weather = 'clear' | 'rain';

export interface AppState {
  /** Hours of the day, 0..24. 12 = noon. */
  timeOfDay: number;
  weather: Weather;
  /** 0..1 wind strength. */
  wind: number;
  houseLights: boolean;
}

export const INITIAL_STATE: AppState = {
  timeOfDay: 16,
  weather: 'clear',
  wind: 0.3,
  houseLights: false,
};

export const state: AppState = { ...INITIAL_STATE };

type Listener = () => void;
const listeners = new Set<Listener>();

export function setState(patch: Partial<AppState>): void {
  Object.assign(state, patch);
  listeners.forEach((l) => l());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const hh = String(h % 24).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}