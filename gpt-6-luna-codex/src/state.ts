export type Weather = 'clear' | 'rain';

export interface WorldState {
  hour: number;
  weather: Weather;
  wind: number;
  lights: boolean;
}

export const INITIAL_STATE: Readonly<WorldState> = {
  hour: 16,
  weather: 'clear',
  wind: 0.3,
  lights: false,
};

export function createInitialState(): WorldState {
  return { ...INITIAL_STATE };
}

export function formatTime(hour: number): string {
  const wholeHour = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60 / 5) * 5;
  const normalizedHour = minutes >= 60 ? (wholeHour + 1) % 24 : wholeHour;
  const normalizedMinutes = minutes >= 60 ? 0 : minutes;
  return `${String(normalizedHour).padStart(2, '0')}:${String(normalizedMinutes).padStart(2, '0')}`;
}
