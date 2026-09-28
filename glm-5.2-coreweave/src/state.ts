/**
 * Coherent application state for Pocket World.
 * All scene effects are derived from this single source of truth.
 */

export type Weather = 'clear' | 'rain';

export interface WorldState {
  /** Time of day in hours, range [0, 24). */
  time: number;
  weather: Weather;
  /** Wind strength as a normalized value in [0, 1]. */
  wind: number;
  /** Whether the house interior lights are on. */
  lightsOn: boolean;
}

/** Default state — also what the Reset button restores. */
export const DEFAULT_STATE: Readonly<WorldState> = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  lightsOn: false,
};

export function cloneState(s: WorldState): WorldState {
  return { time: s.time, weather: s.weather, wind: s.wind, lightsOn: s.lightsOn };
}

export function equalState(a: WorldState, b: WorldState): boolean {
  return a.time === b.time && a.weather === b.weather && a.wind === b.wind && a.lightsOn === b.lightsOn;
}

/** Format time (hours, can be fractional) as HH:MM. */
export function formatTime(hours: number): string {
  const h = ((hours % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** A short, qualitative day-phase label derived from the time. */
export function dayPhase(hours: number): string {
  const h = ((hours % 24) + 24) % 24;
  if (h >= 5 && h < 8) return 'Dawn';
  if (h >= 8 && h < 12) return 'Morning';
  if (h >= 12 && h < 16) return 'Afternoon';
  if (h >= 16 && h < 19) return 'Sunset';
  if (h >= 19 && h < 21) return 'Dusk';
  if (h >= 21 || h < 5) return 'Night';
  return 'Day';
}
