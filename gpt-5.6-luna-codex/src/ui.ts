import type { StateStore, WorldState } from './state';

export interface UIRefs {
  timeSlider: HTMLInputElement;
  timeValue: HTMLElement;
  weatherButtons: Record<'clear' | 'rain', HTMLButtonElement>;
  windSlider: HTMLInputElement;
  windValue: HTMLElement;
  lightsToggle: HTMLButtonElement;
  status: HTMLElement;
  panel: HTMLElement;
}

function formatTime(value: number): string {
  const hour = Math.floor(value) % 24;
  const minutes = Math.round((value - Math.floor(value)) * 60) % 60;
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function weatherLabel(weather: WorldState['weather']): string {
  return weather === 'rain' ? 'Rainy air' : 'Clear sky';
}

export function createUI(root: HTMLElement, store: StateStore): UIRefs {
  root.insertAdjacentHTML('beforeend', `
    <section class="control-panel" aria-label="Pocket World controls">
      <div class="panel-topline">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <div>
            <p class="eyebrow">A tiny world</p>
            <h1>Pocket World</h1>
          </div>
        </div>
        <button class="panel-toggle" type="button" aria-expanded="true" aria-controls="world-controls">Controls</button>
      </div>
      <div id="world-controls" class="panel-content">
        <p class="intro">Tune the light, weather, and breeze. The island responds.</p>

        <div class="control-section time-section">
          <div class="section-heading">
            <span class="control-label"><span class="mini-icon sun-icon" aria-hidden="true"></span>Time of day</span>
            <output id="time-value" class="value-pill" for="time-slider">16:00</output>
          </div>
          <input id="time-slider" type="range" min="0" max="24" step="0.25" value="16" aria-label="Time of day" />
          <div class="range-ends"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
        </div>

        <div class="control-section">
          <div class="section-heading"><span class="control-label"><span class="mini-icon cloud-icon" aria-hidden="true"></span>Weather</span></div>
          <div class="segmented" role="group" aria-label="Weather">
            <button type="button" class="segment active" data-weather="clear"><span aria-hidden="true">☼</span> Clear</button>
            <button type="button" class="segment" data-weather="rain"><span aria-hidden="true">⌁</span> Rain</button>
          </div>
        </div>

        <div class="control-section wind-section">
          <div class="section-heading">
            <span class="control-label"><span class="mini-icon wind-icon" aria-hidden="true"></span>Wind</span>
            <output id="wind-value" class="subtle-value" for="wind-slider">30%</output>
          </div>
          <input id="wind-slider" type="range" min="0" max="100" step="1" value="30" aria-label="Wind strength" />
        </div>

        <div class="lights-row">
          <div>
            <span class="control-label"><span class="mini-icon lamp-icon" aria-hidden="true"></span>House lights</span>
            <p class="hint">Tap the house to toggle</p>
          </div>
          <button id="lights-toggle" class="switch" type="button" role="switch" aria-checked="false" aria-label="Toggle house lights"><span></span></button>
        </div>

        <div class="panel-footer">
          <button id="reset-button" class="reset-button" type="button"><span aria-hidden="true">↺</span> Reset world</button>
          <span class="shortcut-hint">Drag to orbit&nbsp; · &nbsp;Scroll to zoom</span>
        </div>
      </div>
    </section>
    <div class="world-status" aria-live="polite">
      <span class="status-dot"></span><span id="world-status-text">CLEAR SKY · 16:00</span>
    </div>
    <div class="scene-hint" aria-hidden="true"><span>✦</span> tap the house for a warm glow</div>
  `);

  const panel = root.querySelector<HTMLElement>('.control-panel')!;
  const timeSlider = root.querySelector<HTMLInputElement>('#time-slider')!;
  const timeValue = root.querySelector<HTMLElement>('#time-value')!;
  const windSlider = root.querySelector<HTMLInputElement>('#wind-slider')!;
  const windValue = root.querySelector<HTMLElement>('#wind-value')!;
  const lightsToggle = root.querySelector<HTMLButtonElement>('#lights-toggle')!;
  const status = root.querySelector<HTMLElement>('#world-status-text')!;
  const weatherButtons = {
    clear: root.querySelector<HTMLButtonElement>('[data-weather="clear"]')!,
    rain: root.querySelector<HTMLButtonElement>('[data-weather="rain"]')!,
  };

  const refs: UIRefs = { timeSlider, timeValue, weatherButtons, windSlider, windValue, lightsToggle, status, panel };

  timeSlider.addEventListener('input', () => store.update({ time: Number(timeSlider.value) }));
  windSlider.addEventListener('input', () => store.update({ wind: Number(windSlider.value) / 100 }));
  weatherButtons.clear.addEventListener('click', () => store.update({ weather: 'clear' }));
  weatherButtons.rain.addEventListener('click', () => store.update({ weather: 'rain' }));
  lightsToggle.addEventListener('click', () => store.update({ houseLights: !store.state.houseLights }));
  root.querySelector<HTMLButtonElement>('#reset-button')!.addEventListener('click', () => store.reset());

  const toggle = root.querySelector<HTMLButtonElement>('.panel-toggle')!;
  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  });
  if (window.matchMedia('(max-width: 720px)').matches) {
    panel.classList.add('is-collapsed');
    toggle.setAttribute('aria-expanded', 'false');
  }

  store.subscribe((state) => syncUI(refs, state));
  return refs;
}

function syncUI(refs: UIRefs, state: WorldState): void {
  refs.timeSlider.value = String(state.time);
  refs.timeValue.textContent = formatTime(state.time);
  refs.windSlider.value = String(Math.round(state.wind * 100));
  refs.windValue.textContent = `${Math.round(state.wind * 100)}%`;
  refs.weatherButtons.clear.classList.toggle('active', state.weather === 'clear');
  refs.weatherButtons.rain.classList.toggle('active', state.weather === 'rain');
  refs.lightsToggle.setAttribute('aria-checked', String(state.houseLights));
  refs.lightsToggle.classList.toggle('is-on', state.houseLights);
  refs.status.textContent = `${weatherLabel(state.weather).toUpperCase()} · ${formatTime(state.time)}`;
}
