export type Weather = 'clear' | 'rain';

export interface AppState {
  time: number; // hours, 0..24
  weather: Weather;
  wind: number;  // 0..1
  lights: boolean;
}

export const state: AppState = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  lights: false,
};

type Listener = (s: AppState) => void;
const listeners = new Set<Listener>();

export function setState(patch: Partial<AppState>): void {
  Object.assign(state, patch);
  emit();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return (): void => {
    listeners.delete(fn);
  };
}

export function resetState(): void {
  setState({ time: 16, weather: 'clear', wind: 0.3, lights: false });
}

function emit(): void {
  for (const fn of listeners) fn(state);
}