import { AppState, StateListener, WeatherType } from './types';

export const DEFAULT_STATE: Readonly<AppState> = {
  time: 16.0,          // 16:00 (late afternoon golden sunlight)
  weather: 'clear',    // Clear weather
  wind: 0.3,           // 30% wind strength
  houseLights: false,  // Off
  reducedMotion: false,
};

class StateStore {
  private state: AppState;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.state = {
      ...DEFAULT_STATE,
      reducedMotion: prefersReducedMotion,
    };

    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.setReducedMotion(e.matches);
      });
    }
  }

  public getState(): Readonly<AppState> {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(changedKey?: keyof AppState) {
    for (const listener of this.listeners) {
      listener(this.state, changedKey);
    }
  }

  public setTime(time: number) {
    const clamped = Math.max(0, Math.min(24, time));
    if (this.state.time !== clamped) {
      this.state.time = clamped;
      this.notify('time');
    }
  }

  public setWeather(weather: WeatherType) {
    if (this.state.weather !== weather) {
      this.state.weather = weather;
      this.notify('weather');
    }
  }

  public toggleWeather() {
    this.setWeather(this.state.weather === 'clear' ? 'rain' : 'clear');
  }

  public setWind(wind: number) {
    const clamped = Math.max(0, Math.min(1.0, wind));
    if (this.state.wind !== clamped) {
      this.state.wind = clamped;
      this.notify('wind');
    }
  }

  public setHouseLights(on: boolean) {
    if (this.state.houseLights !== on) {
      this.state.houseLights = on;
      this.notify('houseLights');
    }
  }

  public toggleHouseLights() {
    this.setHouseLights(!this.state.houseLights);
  }

  public setReducedMotion(reduced: boolean) {
    if (this.state.reducedMotion !== reduced) {
      this.state.reducedMotion = reduced;
      this.notify('reducedMotion');
    }
  }

  public reset() {
    this.state = {
      ...DEFAULT_STATE,
      reducedMotion: this.state.reducedMotion,
    };
    this.notify();
  }
}

export const store = new StateStore();
