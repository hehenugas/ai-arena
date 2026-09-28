export type WeatherKind = 'clear' | 'rain';

/** Defaults double as the values the reset button restores. */
export const DEFAULTS = {
  timeHour: 16,
  weather: 'clear' as WeatherKind,
  wind: 0.3,
  lightsOn: false,
};

/**
 * One source of truth for the simulation. `target` holds what the interface asks
 * for, `current` holds what the scene renders. Everything else derives from these,
 * which keeps rapid control changes interruptible instead of fighting tweens.
 */
export class WorldState {
  readonly target = {
    timeHour: DEFAULTS.timeHour,
    weather: DEFAULTS.weather,
    wind: DEFAULTS.wind,
    lightsOn: DEFAULTS.lightsOn,
  };

  /** True while rain should be drawn at all. */
  rainActive = DEFAULTS.weather === 'rain';

  readonly current = {
    timeHour: DEFAULTS.timeHour,
    wind: DEFAULTS.wind,
    rainAmount: DEFAULTS.weather === 'rain' ? 1 : 0,
    lights: DEFAULTS.lightsOn ? 1 : 0,
  };

  setTimeHour(hour: number): void {
    // Wrapping on a 24 h dial, so 23:59 -> 00:00 does not spin the sun backwards.
    this.current.timeHour = this.target.timeHour = wrapHour(hour);
  }

  setWeather(kind: WeatherKind): void {
    this.target.weather = kind;
    this.rainActive = kind === 'rain';
  }

  setWind(value: number): void {
    this.target.wind = Math.min(1, Math.max(0, value));
  }

  setLights(on: boolean): void {
    this.target.lightsOn = on;
  }

  toggleLights(): boolean {
    this.setLights(!this.target.lightsOn);
    return this.target.lightsOn;
  }

  get lightsOn(): boolean {
    return this.target.lightsOn;
  }

  /** Rain drops keep falling at zero wind, only the full weather switch silences them. */
  get rainIntensity(): number {
    return this.rainActive ? this.current.rainAmount : 0;
  }

  reset(): void {
    this.target.timeHour = DEFAULTS.timeHour;
    this.target.weather = DEFAULTS.weather;
    this.target.wind = DEFAULTS.wind;
    this.target.lightsOn = DEFAULTS.lightsOn;
    this.current.timeHour = DEFAULTS.timeHour;
    this.rainActive = false;
  }

  /** dt is already clamped by the render loop. */
  update(dt: number): void {
    this.current.wind += (this.target.wind - this.current.wind) * (1 - Math.exp(-5 * dt));
    const rainTarget = this.rainActive ? 1 : 0;
    const rate = rainTarget > this.current.rainAmount ? 0.55 : 0.4;
    const next = this.current.rainAmount + Math.sign(rainTarget - this.current.rainAmount) * rate * dt;
    this.current.rainAmount =
      rainTarget > this.current.rainAmount
        ? Math.min(rainTarget, next)
        : Math.max(rainTarget, next);
    this.current.lights += (Number(this.target.lightsOn) - this.current.lights) * (1 - Math.exp(-6 * dt));
  }
}

export function wrapHour(hour: number): number {
  const h = hour % 24;
  return h < 0 ? h + 24 : h;
}

export function formatHour(hour: number): string {
  const wrapped = wrapHour(hour);
  const hh = Math.floor(wrapped);
  const mm = Math.floor((wrapped - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
