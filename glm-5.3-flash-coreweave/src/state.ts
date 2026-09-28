import type { Group, Object3D } from 'three';
import type { DayCycle } from './palette';

export type Weather = 'clear' | 'rain';

export interface AppState {
  /** Minutes since midnight, 0–1440. */
  timeOfDay: number;
  weather: Weather;
  /** 0 = calm … 1 = gusty. */
  wind: number;
  lightsOn: boolean;
}

export const DEFAULT_STATE: Readonly<AppState> = {
  timeOfDay: 960, // 16:00
  weather: 'clear',
  wind: 0.3, // 30%
  lightsOn: false,
};

type Listener = (state: AppState) => void;

class Store {
  private state: AppState = { ...DEFAULT_STATE };
  private listeners = new Set<Listener>();

  get(): AppState {
    return this.state;
  }

  set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}

/** Single source of truth for every control. The UI and the scene both read it. */
export const store = new Store();

/** Values eased toward the store targets every frame — transitions stay interruptible. */
export interface Smooth {
  /** Eased time-of-day in minutes. */
  time: number;
  /** 0 = clear … 1 = full rain. */
  weatherT: number;
  /** Eased wind 0..1. */
  wind: number;
  /** 0..1 house-light level. */
  lightT: number;
}

export interface UpdaterCtx {
  dt: number;
  elapsed: number;
  state: AppState;
  smooth: Smooth;
  cycle: DayCycle;
  reduced: boolean;
}

export interface WorldPiece {
  group: Object3D | Group;
  update?: (ctx: UpdaterCtx) => void;
}
