import { WorldState, Weather, formatTime } from './state';

export interface UIHandles {
  sync(state: WorldState): void;
  onTime(cb: (minutes: number) => void): void;
  onWeather(cb: (w: Weather) => void): void;
  onWind(cb: (v: number) => void): void;
  onLights(cb: (on: boolean) => void): void;
  onReset(cb: () => void): void;
  onQuickTime(cb: (minutes: number) => void): void;
}

function sliderFill(el: HTMLInputElement): void {
  const min = Number(el.min) || 0;
  const max = Number(el.max) || 100;
  const pct = ((Number(el.value) - min) / (max - min)) * 100;
  el.style.setProperty('--fill', `${pct}%`);
}

export function initUI(_initial: WorldState): UIHandles {
  const panel = document.getElementById('panel')!;
  const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
  const timeLabel = document.getElementById('time-label') as HTMLOutputElement;
  const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
  const windLabel = document.getElementById('wind-label') as HTMLOutputElement;
  const lightsBtn = document.getElementById('lights-toggle') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset') as HTMLButtonElement;
  const collapseBtn = document.getElementById('panel-collapse') as HTMLButtonElement;
  const weatherBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-weather]'));
  const timeChips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time]'));

  let timeCb: ((m: number) => void) | null = null;
  let weatherCb: ((w: Weather) => void) | null = null;
  let windCb: ((v: number) => void) | null = null;
  let lightsCb: ((on: boolean) => void) | null = null;
  let resetCb: (() => void) | null = null;
  let quickTimeCb: ((m: number) => void) | null = null;

  timeSlider.addEventListener('input', () => {
    sliderFill(timeSlider);
    timeCb?.(Number(timeSlider.value));
  });

  windSlider.addEventListener('input', () => {
    sliderFill(windSlider);
    windCb?.(Number(windSlider.value) / 100);
  });

  weatherBtns.forEach((b) =>
    b.addEventListener('click', () => weatherCb?.(b.dataset.weather as Weather)),
  );

  timeChips.forEach((b) =>
    b.addEventListener('click', () => quickTimeCb?.(Number(b.dataset.time))),
  );

  lightsBtn.addEventListener('click', () => {
    const next = lightsBtn.getAttribute('aria-pressed') !== 'true';
    lightsCb?.(next);
  });

  resetBtn.addEventListener('click', () => resetCb?.());

  collapseBtn.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
  });

  // auto-collapse on small screens the first time
  if (window.innerWidth <= 640) {
    panel.classList.add('collapsed');
    collapseBtn.setAttribute('aria-expanded', 'false');
  }

  sliderFill(timeSlider);
  sliderFill(windSlider);

  return {
    sync(s: WorldState): void {
      timeSlider.value = String(Math.round(s.time));
      sliderFill(timeSlider);
      timeLabel.textContent = formatTime(s.time);

      windSlider.value = String(Math.round(s.wind * 100));
      sliderFill(windSlider);
      windLabel.textContent = `${Math.round(s.wind * 100)}%`;

      weatherBtns.forEach((b) => {
        const active = b.dataset.weather === s.weather;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      lightsBtn.setAttribute('aria-pressed', String(s.lightsOn));
    },

    onTime(cb) { timeCb = cb; },
    onWeather(cb) { weatherCb = cb; },
    onWind(cb) { windCb = cb; },
    onLights(cb) { lightsCb = cb; },
    onReset(cb) { resetCb = cb; },
    onQuickTime(cb) { quickTimeCb = cb; },
  };
}
