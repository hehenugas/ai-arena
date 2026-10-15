export type Weather = 'clear' | 'rain';

export interface WorldState {
  /** minutes since midnight, 0..1439 */
  timeOfDay: number;
  weather: Weather;
  /** 0..1 */
  wind: number;
  houseLights: boolean;
}

export const DEFAULT_STATE: WorldState = {
  timeOfDay: 16 * 60,
  weather: 'clear',
  wind: 0.3,
  houseLights: false
};

type Listener = (state: WorldState) => void;

export class Store {
  private state: WorldState = { ...DEFAULT_STATE };
  private listeners = new Set<Listener>();

  get(): Readonly<WorldState> {
    return this.state;
  }

  set(patch: Partial<WorldState>): void {
    const next = { ...this.state, ...patch };
    const changed = (Object.keys(patch) as (keyof WorldState)[]).some(
      (k) => next[k] !== this.state[k]
    );
    if (!changed) return;
    this.state = next;
    this.listeners.forEach((fn) => fn(this.state));
  }

  reset(): void {
    this.state = { ...DEFAULT_STATE };
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
