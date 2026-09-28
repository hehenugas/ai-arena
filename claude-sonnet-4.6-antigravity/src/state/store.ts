// Central application state — all scene effects derive from this

export interface AppState {
  timeOfDay: number;       // 0–24 hours
  weather: 'clear' | 'rain';
  windStrength: number;    // 0–1
  houseLightsOn: boolean;
}

export const DEFAULT_STATE: AppState = {
  timeOfDay: 16,
  weather: 'clear',
  windStrength: 0.3,
  houseLightsOn: false,
};

type Listener = (state: AppState) => void;

class StateStore {
  private state: AppState = { ...DEFAULT_STATE };
  private listeners: Listener[] = [];

  get(): AppState {
    return { ...this.state };
  }

  set(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  reset(): void {
    this.state = { ...DEFAULT_STATE };
    this.notify();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(): void {
    const snapshot = this.get();
    for (const fn of this.listeners) fn(snapshot);
  }
}

export const store = new StateStore();
