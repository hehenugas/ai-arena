export type Weather = 'clear' | 'rain';

export interface WorldState {
  /** Time of day in hours, 0..24. */
  time: number;
  weather: Weather;
  /** Wind strength, 0..1. */
  wind: number;
  lightsOn: boolean;
}

/**
 * The single source of truth for the world. Both the 3D scene and the DOM
 * controls read from and write to this store, which keeps them in sync.
 */
export const DEFAULTS: Readonly<WorldState> = Object.freeze({
  time: 16,
  weather: 'clear' as Weather,
  wind: 0.3,
  lightsOn: false,
});

type Listener = (state: WorldState) => void;

class Store {
  private readonly listeners = new Set<Listener>();
  private current: WorldState = { ...DEFAULTS };

  get state(): Readonly<WorldState> {
    return this.current;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  patch(partial: Partial<WorldState>): void {
    let changed = false;
    for (const key of Object.keys(partial) as (keyof WorldState)[]) {
      const next = partial[key];
      if (next !== undefined && next !== this.current[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    this.current = { ...this.current, ...partial };
    for (const listener of this.listeners) listener(this.current);
  }

  reset(): void {
    this.patch({ ...DEFAULTS });
  }
}

export const store = new Store();
