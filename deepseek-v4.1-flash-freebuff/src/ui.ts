import type { AppState, Store, Weather } from './state';
import { formatClock, isSmallScreen, timePhase } from './utils';

export interface UiOptions {
  onReset(): void;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Pocket World: missing #${id} element in the document.`);
  return element as T;
}

export function initUi(store: Store, options: UiOptions): void {
  const panel = requireElement('panel');
  const toggle = requireElement<HTMLButtonElement>('panel-toggle');
  const timeInput = requireElement<HTMLInputElement>('time');
  const timeValue = requireElement('time-value');
  const windInput = requireElement<HTMLInputElement>('wind');
  const windValue = requireElement('wind-value');
  const weatherValue = requireElement('weather-value');
  const clearButton = requireElement<HTMLButtonElement>('weather-clear');
  const rainButton = requireElement<HTMLButtonElement>('weather-rain');
  const lightsSwitch = requireElement<HTMLButtonElement>('lights');
  const resetButton = requireElement<HTMLButtonElement>('reset');

  const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

  const setCollapsed = (collapsed: boolean): void => {
    panel.dataset.collapsed = collapsed ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    // The visible label is hidden on desktop, so keep an accessible name here.
    const label = collapsed ? 'Show controls' : 'Hide controls';
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  };

  // On phones the panel starts collapsed so the island is never covered.
  setCollapsed(isSmallScreen());

  toggle.addEventListener('click', () => {
    setCollapsed(panel.dataset.collapsed !== 'true');
  });

  timeInput.addEventListener('input', () => {
    store.set({ time: Number(timeInput.value) });
  });

  windInput.addEventListener('input', () => {
    store.set({ wind: clamp01(Number(windInput.value) / 100) });
  });

  const setWeather = (weather: Weather): void => store.set({ weather });
  clearButton.addEventListener('click', () => setWeather('clear'));
  rainButton.addEventListener('click', () => setWeather('rain'));

  lightsSwitch.addEventListener('click', () => store.toggleLights());
  resetButton.addEventListener('click', () => options.onReset());

  const sync = (state: Readonly<AppState>): void => {
    const time = Number(timeInput.value);
    if (Math.abs(time - state.time) > 0.001) timeInput.value = state.time.toFixed(2);
    timeValue.textContent = `${formatClock(state.time)} · ${timePhase(state.time)}`;

    const wind = Math.round(state.wind * 100);
    if (Number(windInput.value) !== wind) windInput.value = String(wind);
    windValue.textContent = `${wind}%`;

    clearButton.setAttribute('aria-pressed', String(state.weather === 'clear'));
    rainButton.setAttribute('aria-pressed', String(state.weather === 'rain'));
    weatherValue.textContent = state.weather === 'clear' ? 'Clear' : 'Rain';

    lightsSwitch.setAttribute('aria-checked', String(state.houseLights));
  };

  store.subscribe(sync);
  sync(store.value);
}

export function hideLoader(): void {
  const loader = document.getElementById('loader');
  if (loader && !loader.classList.contains('is-hidden')) {
    loader.classList.add('is-hidden');
  }
}

export function showFatal(message: string): void {
  const fatal = document.getElementById('fatal');
  const text = document.getElementById('fatal-message');
  const loader = document.getElementById('loader');
  const panel = document.getElementById('panel');
  if (text) text.textContent = message;
  if (loader) loader.classList.add('is-hidden');
  if (panel) panel.style.display = 'none';
  if (fatal) fatal.hidden = false;
}
