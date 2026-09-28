import { DEFAULT_STATE, store, type Weather } from '../state';

/**
 * Wires the control panel to the store. Every UI change writes to the store;
 * the subscription keeps the DOM in sync (including when the house itself was
 * clicked in 3D, or Reset was pressed).
 */
export function initPanel(onResetWorld: () => void): void {
  const panel = document.getElementById('panel')!;
  const collapseBtn = document.getElementById('panel-collapse')!;
  const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
  const timeLabel = document.getElementById('time-label') as HTMLOutputElement;
  const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
  const windLabel = document.getElementById('wind-label') as HTMLOutputElement;
  const lightsBtn = document.getElementById('lights-toggle') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset') as HTMLButtonElement;
  const weatherChips = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-weather]'));
  const timeChips = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-time]'));

  const fmt = (minutes: number): string => {
    const m = Math.round(minutes);
    if (m >= 1440) return '24:00';
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  };

  const setFill = (el: HTMLInputElement) => {
    const pct = ((Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min))) * 100;
    el.style.setProperty('--fill', `${pct}%`);
  };

  timeSlider.addEventListener('input', () => {
    store.set({ timeOfDay: Number(timeSlider.value) });
  });

  for (const chip of timeChips) {
    chip.addEventListener('click', () => {
      store.set({ timeOfDay: Number(chip.dataset.time) });
    });
  }

  for (const chip of weatherChips) {
    chip.addEventListener('click', () => {
      const w = chip.dataset.weather as Weather;
      if (store.get().weather === w) return;
      store.set({ weather: w });
    });
  }

  windSlider.addEventListener('input', () => {
    store.set({ wind: Number(windSlider.value) / 100 });
  });

  lightsBtn.addEventListener('click', () => {
    store.set({ lightsOn: !store.get().lightsOn });
  });

  resetBtn.addEventListener('click', () => {
    store.set({ ...DEFAULT_STATE });
    onResetWorld();
  });

  collapseBtn.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
  });

  // keep the DOM in sync with state, whichever way the state changed
  const sync = (s: ReturnType<typeof store.get>) => {
    timeSlider.value = String(Math.round(s.timeOfDay));
    timeLabel.textContent = fmt(s.timeOfDay);
    setFill(timeSlider);

    windSlider.value = String(Math.round(s.wind * 100));
    windLabel.textContent = `${Math.round(s.wind * 100)}%`;
    setFill(windSlider);

    lightsBtn.setAttribute('aria-pressed', String(s.lightsOn));

    for (const chip of weatherChips) {
      const active = chip.dataset.weather === s.weather;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
    }
  };
  store.subscribe(sync);
  sync(store.get());

  // on small screens, start collapsed so the island stays visible
  if (window.matchMedia('(max-width: 640px)').matches) {
    panel.classList.add('collapsed');
    collapseBtn.setAttribute('aria-expanded', 'false');
  }
}
