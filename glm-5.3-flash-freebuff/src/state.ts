export type Weather = 'clear' | 'rain';

export interface WorldState {
  /** Minutes since midnight, 0..1440. */
  time: number;
  weather: Weather;
  /** 0..1, shared by windmill, trees, clouds and rain slant. */
  wind: number;
  lightsOn: boolean;
}

export const DEFAULTS: Readonly<WorldState> = Object.freeze({
  time: 960, // 16:00
  weather: 'clear',
  wind: 0.3,
  lightsOn: false,
});

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Minutes → "HH:MM" (24h). */
export function formatTime(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** Rough device capability used to scale pixel ratio / particle counts. */
export function detectQuality(): 'low' | 'high' {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) < 700);
  return cores <= 4 || mobile ? 'low' : 'high';
}

export const QUALITY = detectQuality();
