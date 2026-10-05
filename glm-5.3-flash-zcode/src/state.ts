export type Weather = 'clear' | 'rain';

export interface WorldState {
  /** Hour of the day, 0..24. */
  time: number;
  weather: Weather;
  /** Wind strength, 0..1. */
  wind: number;
  lightsOn: boolean;
}

export const DEFAULT_STATE: WorldState = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  lightsOn: false,
};

type Listener = (state: WorldState) => void;

/** Single source of truth for time, weather, wind and house lights. */
export class WorldStore {
  private state: WorldState = { ...DEFAULT_STATE };
  private listeners = new Set<Listener>();

  get snapshot(): WorldState {
    return this.state;
  }

  set(patch: Partial<WorldState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  reset(): void {
    this.set({ ...DEFAULT_STATE });
  }

  toggleLights(): void {
    this.set({ lightsOn: !this.state.lightsOn });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export function formatClock(time: number): string {
  const t = ((time % 24) + 24) % 24;
  const h = Math.floor(t);
  const m = Math.floor((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
