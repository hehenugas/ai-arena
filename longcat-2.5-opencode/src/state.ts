export interface AppState {
  time: number;
  weather: 'clear' | 'rain';
  wind: number;
  houseLights: boolean;
}

export const DEFAULT_STATE: AppState = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  houseLights: false,
};

export function createState(): AppState {
  return { ...DEFAULT_STATE };
}
