export type Weather = 'clear' | 'rain';

export interface AppState {
  timeHours: number; // 0..24
  weather: Weather;
  weatherBlend: number; // 0 = clear, 1 = rain (animated)
  wind: number; // 0..1
  lightsOn: boolean;
  reducedMotion: boolean;
}

export const DEFAULTS: AppState = {
  timeHours: 16,
  weather: 'clear',
  weatherBlend: 0,
  wind: 0.3,
  lightsOn: false,
  reducedMotion: false,
};

export function formatTime(h: number): string {
  const wrapped = ((h % 24) + 24) % 24;
  const hh = Math.floor(wrapped);
  const mm = Math.floor((wrapped - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Damp helper (frame-rate independent lerp). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  const t = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * t;
}
