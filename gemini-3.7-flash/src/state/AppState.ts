export type WeatherType = 'clear' | 'rain';

export interface AppStateData {
  timeOfDay: number; // 0 to 24
  weather: WeatherType;
  windStrength: number; // 0 to 1
  houseLights: boolean;
  reducedMotion: boolean;
}

export type StateListener = (state: AppStateData, changedKey?: keyof AppStateData) => void;

export class AppState {
  private data: AppStateData;
  private listeners: Set<StateListener> = new Set();

  public static readonly DEFAULTS: AppStateData = {
    timeOfDay: 16.0, // 4:00 PM - warm golden afternoon
    weather: 'clear',
    windStrength: 0.3, // 30% breeze
    houseLights: false,
    reducedMotion: false
  };

  constructor() {
    // Detect system reduced motion preference
    const prefersReduced = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.data = {
      ...AppState.DEFAULTS,
      reducedMotion: prefersReduced
    };

    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.setReducedMotion(e.matches);
      });
    }
  }

  public get state(): Readonly<AppStateData> {
    return this.data;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.data);
    return () => this.listeners.delete(listener);
  }

  private notify(changedKey: keyof AppStateData): void {
    for (const listener of this.listeners) {
      listener(this.data, changedKey);
    }
  }

  public setTimeOfDay(time: number): void {
    const clamped = Math.max(0, Math.min(24, time));
    if (this.data.timeOfDay !== clamped) {
      this.data.timeOfDay = clamped;
      this.notify('timeOfDay');
    }
  }

  public setWeather(weather: WeatherType): void {
    if (this.data.weather !== weather) {
      this.data.weather = weather;
      this.notify('weather');
    }
  }

  public setWindStrength(strength: number): void {
    const clamped = Math.max(0, Math.min(1, strength));
    if (this.data.windStrength !== clamped) {
      this.data.windStrength = clamped;
      this.notify('windStrength');
    }
  }

  public setHouseLights(enabled: boolean): void {
    if (this.data.houseLights !== enabled) {
      this.data.houseLights = enabled;
      this.notify('houseLights');
    }
  }

  public toggleHouseLights(): boolean {
    this.setHouseLights(!this.data.houseLights);
    return this.data.houseLights;
  }

  public setReducedMotion(reduced: boolean): void {
    if (this.data.reducedMotion !== reduced) {
      this.data.reducedMotion = reduced;
      this.notify('reducedMotion');
    }
  }

  public reset(): void {
    const currentReduced = this.data.reducedMotion;
    this.data = {
      ...AppState.DEFAULTS,
      reducedMotion: currentReduced
    };
    for (const listener of this.listeners) {
      listener(this.data);
    }
  }

  public static formatTime(time: number): string {
    const hours = Math.floor(time) % 24;
    const minutes = Math.floor((time - Math.floor(time)) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
