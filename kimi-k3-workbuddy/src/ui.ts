import type { Store, WorldState } from './state';

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function setupUI(store: Store, onResetCamera: () => void): void {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  const timeSlider = $<HTMLInputElement>('time-slider');
  const timeLabel = $('time-label');
  const windSlider = $<HTMLInputElement>('wind-slider');
  const windLabel = $('wind-label');
  const btnClear = $('weather-clear');
  const btnRain = $('weather-rain');
  const lightsToggle = $<HTMLInputElement>('lights-toggle');
  const resetBtn = $('reset-btn');
  const panel = $('panel');
  const panelToggle = $<HTMLButtonElement>('panel-toggle');

  timeSlider.addEventListener('input', () => store.set({ timeOfDay: Number(timeSlider.value) }));
  windSlider.addEventListener('input', () => store.set({ wind: Number(windSlider.value) / 100 }));

  btnClear.addEventListener('click', () => store.set({ weather: 'clear' }));
  btnRain.addEventListener('click', () => store.set({ weather: 'rain' }));
  lightsToggle.addEventListener('change', () => store.set({ houseLights: lightsToggle.checked }));

  resetBtn.addEventListener('click', () => {
    store.reset();
    onResetCamera();
  });

  panelToggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    panelToggle.setAttribute('aria-expanded', String(!collapsed));
    panelToggle.title = collapsed ? 'Expand panel' : 'Collapse panel';
    panelToggle.querySelector('span')!.textContent = collapsed ? '+' : '–';
  });

  // Start collapsed on small screens so the island stays visible
  if (window.matchMedia('(max-width: 640px)').matches) {
    panel.classList.add('is-collapsed');
    panelToggle.setAttribute('aria-expanded', 'false');
    panelToggle.querySelector('span')!.textContent = '+';
  }

  // Reflect external state changes (house click, reset) back into the controls
  store.subscribe((s: WorldState) => {
    timeSlider.value = String(Math.round(s.timeOfDay));
    timeLabel.textContent = fmtTime(s.timeOfDay);
    windSlider.value = String(Math.round(s.wind * 100));
    windLabel.textContent = `${Math.round(s.wind * 100)}%`;

    const isClear = s.weather === 'clear';
    btnClear.classList.toggle('is-active', isClear);
    btnRain.classList.toggle('is-active', !isClear);
    btnClear.setAttribute('aria-pressed', String(isClear));
    btnRain.setAttribute('aria-pressed', String(!isClear));

    lightsToggle.checked = s.houseLights;
  });
}
