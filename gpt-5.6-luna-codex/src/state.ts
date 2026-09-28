export type Weather = 'clear' | 'rain';

export interface WorldState {
  time: number;
  weather: Weather;
  wind: number;
  houseLights: boolean;
}

export const DEFAULT_STATE: Readonly<WorldState> = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  houseLights: false,
};

export type StateListener = (state: WorldState) => void;

export class StateStore {
  private value: WorldState = { ...DEFAULT_STATE };
  private listeners = new Set<StateListener>();
  private resetListeners = new Set<() => void>();

  get state(): WorldState {
    return this.value;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }

  onReset(listener: () => void): () => void {
    this.resetListeners.add(listener);
    return () => this.resetListeners.delete(listener);
  }

  update(patch: Partial<WorldState>): void {
    this.value = { ...this.value, ...patch };
    this.listeners.forEach((listener) => listener(this.value));
  }

  reset(): void {
    this.value = { ...DEFAULT_STATE };
    this.listeners.forEach((listener) => listener(this.value));
    this.resetListeners.forEach((listener) => listener());
  }
}
