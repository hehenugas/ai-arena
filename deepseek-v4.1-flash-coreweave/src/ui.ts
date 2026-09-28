import { store } from './state';

function required<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`UI element #${id} is missing.`);
  return node as T;
}

function formatTime(hours: number): string {
  const total = Math.round(hours * 60) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function setFill(input: HTMLInputElement, percent: number): void {
  input.style.setProperty('--fill', `${percent}%`);
}

export interface UIOptions {
  /** Called when the user asks for a full reset (state *and* camera). */
  onReset?: () => void;
}

/** Wires the DOM controls to the store and mirrors store changes back to the DOM. */
export function setupUI(options: UIOptions = {}): void {
  const time = required<HTMLInputElement>('time');
  const timeValue = required<HTMLOutputElement>('time-value');
  const wind = required<HTMLInputElement>('wind');
  const windValue = required<HTMLOutputElement>('wind-value');
  const weatherClear = required<HTMLButtonElement>('weather-clear');
  const weatherRain = required<HTMLButtonElement>('weather-rain');
  const lightsToggle = required<HTMLButtonElement>('lights-toggle');
  const reset = required<HTMLButtonElement>('reset');
  const panel = required<HTMLElement>('panel');
  const panelToggle = required<HTMLButtonElement>('panel-toggle');

  time.addEventListener('input', () => {
    store.patch({ time: Number(time.value) / 60 });
  });
  wind.addEventListener('input', () => {
    store.patch({ wind: Number(wind.value) / 100 });
  });
  weatherClear.addEventListener('click', () => store.patch({ weather: 'clear' }));
  weatherRain.addEventListener('click', () => store.patch({ weather: 'rain' }));
  lightsToggle.addEventListener('click', () => store.patch({ lightsOn: !store.state.lightsOn }));
  reset.addEventListener('click', () => {
    store.reset();
    options.onReset?.();
  });

  // Collapsible panel, collapsed by default on small screens.
  let userToggled = false;
  const setCollapsed = (collapsed: boolean) => {
    panel.classList.toggle('is-collapsed', collapsed);
    panelToggle.setAttribute('aria-expanded', String(!collapsed));
    panelToggle.setAttribute('aria-label', collapsed ? 'Expand controls' : 'Collapse controls');
    panelToggle.textContent = collapsed ? '▸' : '▾';
  };
  panelToggle.addEventListener('click', () => {
    userToggled = true;
    setCollapsed(!panel.classList.contains('is-collapsed'));
  });

  const narrow = window.matchMedia('(max-width: 720px)');
  const applyLayout = () => {
    if (!userToggled) setCollapsed(narrow.matches);
  };
  applyLayout();
  narrow.addEventListener('change', applyLayout);

  store.subscribe((state) => {
    time.value = String(Math.round(state.time * 60));
    timeValue.textContent = formatTime(state.time);
    setFill(time, (state.time / 24) * 100);

    wind.value = String(Math.round(state.wind * 100));
    windValue.textContent = `${Math.round(state.wind * 100)}%`;
    setFill(wind, state.wind * 100);

    const clear = state.weather === 'clear';
    weatherClear.setAttribute('aria-pressed', String(clear));
    weatherRain.setAttribute('aria-pressed', String(!clear));
    weatherClear.classList.toggle('is-active', clear);
    weatherRain.classList.toggle('is-active', !clear);

    lightsToggle.setAttribute('aria-pressed', String(state.lightsOn));
    lightsToggle.classList.toggle('is-on', state.lightsOn);
    lightsToggle.textContent = state.lightsOn ? 'House lights: On' : 'House lights: Off';
  });
}
