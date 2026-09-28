export type Weather = "clear" | "rain";

export const DEFAULTS = {
  hour: 16,
  weather: "clear" as Weather,
  wind: 0.3,
  lightsOn: false,
};

export type AppState = {
  hour: number;
  weather: Weather;
  wind: number;
  lightsOn: boolean;
  reset: () => void;
};

export function createState(): AppState {
  return {
    hour: DEFAULTS.hour,
    weather: DEFAULTS.weather,
    wind: DEFAULTS.wind,
    lightsOn: DEFAULTS.lightsOn,
    reset() {
      this.hour = DEFAULTS.hour;
      this.weather = DEFAULTS.weather;
      this.wind = DEFAULTS.wind;
      this.lightsOn = DEFAULTS.lightsOn;
    },
  };
}

let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
motionQuery.addEventListener("change", () => {
  reducedMotion = motionQuery.matches;
});

export function motionReduced(): boolean {
  return reducedMotion;
}
