export type WeatherType = 'clear' | 'rain';

export interface AppState {
  time: number;          // 0.0 to 24.0 (hours)
  weather: WeatherType;  // 'clear' | 'rain'
  wind: number;          // 0.0 to 1.0 (strength)
  houseLights: boolean;  // true = on, false = off
  reducedMotion: boolean;
}

export type StateListener = (state: Readonly<AppState>, changedKey?: keyof AppState) => void;
