import { formatClock, WorldStore } from '../state';

interface Elements {
  panel: HTMLElement;
  panelToggle: HTMLButtonElement;
  timeSlider: HTMLInputElement;
  timeLabel: HTMLOutputElement;
  weatherClear: HTMLButtonElement;
  weatherRain: HTMLButtonElement;
  windSlider: HTMLInputElement;
  windLabel: HTMLOutputElement;
  lightsToggle: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in the DOM`);
  return el as T;
}

function sliderFill(slider: HTMLInputElement): void {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const pct = ((Number(slider.value) - min) / (max - min)) * 100;
  slider.style.setProperty('--fill', `${pct}%`);
}

/** Binds the control panel to the store; both stay in sync in both directions. */
export function createUI(store: WorldStore, onReset: () => void): void {
  const el: Elements = {
    panel: byId('panel'),
    panelToggle: byId('panel-toggle'),
    timeSlider: byId('time-slider'),
    timeLabel: byId('time-label'),
    weatherClear: byId('weather-clear'),
    weatherRain: byId('weather-rain'),
    windSlider: byId('wind-slider'),
    windLabel: byId('wind-label'),
    lightsToggle: byId('lights-toggle'),
    resetBtn: byId('reset-btn'),
  };

  const setCollapsed = (collapsed: boolean) => {
    el.panel.classList.toggle('is-collapsed', collapsed);
    el.panelToggle.setAttribute('aria-expanded', String(!collapsed));
    el.panelToggle.querySelector('.panel-toggle__label')!.textContent = collapsed
      ? 'Show'
      : 'Hide';
  };

  // On phones the collapsed panel stays out of the island's way; follow resizes.
  const narrowQuery = window.matchMedia('(max-width: 700px)');
  setCollapsed(narrowQuery.matches);
  narrowQuery.addEventListener('change', (e) => setCollapsed(e.matches));

  el.panelToggle.addEventListener('click', () =>
    setCollapsed(!el.panel.classList.contains('is-collapsed'))
  );

  el.timeSlider.addEventListener('input', () => {
    store.set({ time: Number(el.timeSlider.value) });
  });

  const setWeather = (weather: 'clear' | 'rain') => store.set({ weather });
  el.weatherClear.addEventListener('click', () => setWeather('clear'));
  el.weatherRain.addEventListener('click', () => setWeather('rain'));

  el.windSlider.addEventListener('input', () => {
    store.set({ wind: Number(el.windSlider.value) / 100 });
  });

  el.lightsToggle.addEventListener('click', () => store.toggleLights());
  el.resetBtn.addEventListener('click', () => {
    store.reset();
    onReset();
  });

  const sync = (): void => {
    const s = store.snapshot;

    el.timeSlider.value = String(s.time);
    el.timeLabel.textContent = formatClock(s.time);
    sliderFill(el.timeSlider);

    el.weatherClear.setAttribute('aria-pressed', String(s.weather === 'clear'));
    el.weatherRain.setAttribute('aria-pressed', String(s.weather === 'rain'));

    el.windSlider.value = String(Math.round(s.wind * 100));
    el.windLabel.textContent = `${Math.round(s.wind * 100)}%`;
    sliderFill(el.windSlider);

    el.lightsToggle.setAttribute('aria-pressed', String(s.lightsOn));
    el.lightsToggle.textContent = '';
    el.lightsToggle.append(
      Object.assign(document.createElement('span'), { className: 'btn__dot' }),
      document.createTextNode(s.lightsOn ? 'House lights: on' : 'House lights: off')
    );
  };

  store.subscribe(sync);
  sync();
}
