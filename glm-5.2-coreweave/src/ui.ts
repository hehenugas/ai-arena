import { WorldState, formatTime, dayPhase } from './state';

export interface UICallbacks {
  onTime: (t: number) => void;
  onWeather: (w: 'clear' | 'rain') => void;
  onWind: (w: number) => void;
  onLights: (on: boolean) => void;
  onReset: () => void;
}

/**
 * Builds and owns the Pocket World control panel. All controls have visible
 * labels, keyboard support (native range/button semantics) and focus styles.
 * `sync(state)` keeps the controls in lock-step with state (reset + house click).
 */
export class UI {
  private readonly panel: HTMLElement;
  private readonly timeSlider: HTMLInputElement;
  private readonly timeValue: HTMLElement;
  private readonly phaseValue: HTMLElement;
  private readonly clearBtn: HTMLButtonElement;
  private readonly rainBtn: HTMLButtonElement;
  private readonly windSlider: HTMLInputElement;
  private readonly windValue: HTMLElement;
  private readonly lightsToggle: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly collapseBtn: HTMLButtonElement;
  private suppress = false; // avoid feedback loops while sync() writes values

  constructor(container: HTMLElement, cb: UICallbacks) {
    container.insertAdjacentHTML('beforeend', PANEL_HTML);
    this.panel = container.querySelector('.panel') as HTMLElement;
    this.timeSlider = container.querySelector('#time-slider') as HTMLInputElement;
    this.timeValue = container.querySelector('#time-value') as HTMLElement;
    this.phaseValue = container.querySelector('#phase-value') as HTMLElement;
    this.clearBtn = container.querySelector('#btn-clear') as HTMLButtonElement;
    this.rainBtn = container.querySelector('#btn-rain') as HTMLButtonElement;
    this.windSlider = container.querySelector('#wind-slider') as HTMLInputElement;
    this.windValue = container.querySelector('#wind-value') as HTMLElement;
    this.lightsToggle = container.querySelector('#lights-toggle') as HTMLButtonElement;
    this.resetBtn = container.querySelector('#reset-btn') as HTMLButtonElement;
    this.collapseBtn = container.querySelector('#collapse-btn') as HTMLButtonElement;

    this.timeSlider.addEventListener('input', () => {
      if (this.suppress) return;
      cb.onTime(parseFloat(this.timeSlider.value));
      this.refreshTimeLabel();
    });
    this.windSlider.addEventListener('input', () => {
      if (this.suppress) return;
      cb.onWind(parseFloat(this.windSlider.value) / 100);
      this.windValue.textContent = `${Math.round(parseFloat(this.windSlider.value))}%`;
    });
    this.clearBtn.addEventListener('click', () => cb.onWeather('clear'));
    this.rainBtn.addEventListener('click', () => cb.onWeather('rain'));
    this.lightsToggle.addEventListener('click', () => {
      if (this.suppress) return;
      cb.onLights(!this.lightsToggle.classList.contains('on'));
    });
    this.resetBtn.addEventListener('click', () => cb.onReset());
    this.collapseBtn.addEventListener('click', () => {
      this.panel.classList.toggle('collapsed');
      const c = this.panel.classList.contains('collapsed');
      this.collapseBtn.setAttribute('aria-expanded', String(!c));
    });
  }

  private refreshTimeLabel(): void {
    const t = parseFloat(this.timeSlider.value);
    this.timeValue.textContent = formatTime(t);
    this.phaseValue.textContent = dayPhase(t);
  }

  /** Write a full state back into every control (reset + house-click sync). */
  sync(s: WorldState): void {
    this.suppress = true;
    this.timeSlider.value = String(s.time);
    this.refreshTimeLabel();
    this.windSlider.value = String(Math.round(s.wind * 100));
    this.windValue.textContent = `${Math.round(s.wind * 100)}%`;
    this.setWeather(s.weather);
    this.setLights(s.lightsOn);
    this.suppress = false;
  }

  setWeather(w: 'clear' | 'rain'): void {
    this.clearBtn.classList.toggle('active', w === 'clear');
    this.rainBtn.classList.toggle('active', w === 'rain');
    this.clearBtn.setAttribute('aria-pressed', String(w === 'clear'));
    this.rainBtn.setAttribute('aria-pressed', String(w === 'rain'));
  }

  setLights(on: boolean): void {
    this.lightsToggle.classList.toggle('on', on);
    this.lightsToggle.setAttribute('aria-pressed', String(on));
  }

  collapse(): void {
    this.panel.classList.add('collapsed');
    this.collapseBtn.setAttribute('aria-expanded', 'false');
  }
}

const PANEL_HTML = /* html */`
<aside class="panel" role="region" aria-label="Pocket World controls">
  <div class="panel-head">
    <div class="panel-title"><span class="dot"></span>Pocket World</div>
    <button id="collapse-btn" class="collapse-btn" aria-label="Collapse panel" aria-expanded="true">▾</button>
  </div>
  <div class="panel-sub">A tiny floating island</div>

  <div class="section">
    <div class="row-label">
      <span class="name">Time of day</span>
      <span class="val"><span id="time-value">16:00</span> · <span id="phase-value">Sunset</span></span>
    </div>
    <input id="time-slider" type="range" min="0" max="24" step="0.1" value="16"
      aria-label="Time of day in hours" />
  </div>

  <div class="section">
    <div class="row-label"><span class="name">Weather</span></div>
    <div class="btn-group">
      <button id="btn-clear" class="btn active" aria-pressed="true">Clear</button>
      <button id="btn-rain" class="btn" aria-pressed="false">Rain</button>
    </div>
  </div>

  <div class="section">
    <div class="row-label">
      <span class="name">Wind</span>
      <span class="val" id="wind-value">30%</span>
    </div>
    <input id="wind-slider" type="range" min="0" max="100" step="1" value="30"
      aria-label="Wind strength percentage" />
  </div>

  <div class="section">
    <button id="lights-toggle" class="toggle" role="switch" aria-pressed="false" aria-label="Toggle house lights">
      <span class="label">House lights</span>
      <span class="switch"></span>
    </button>
  </div>

  <div class="section">
    <button id="reset-btn" class="reset-btn">↺ Reset view</button>
  </div>

  <div class="hint-list">
    <b>Drag</b> to orbit · <b>Scroll/pinch</b> to zoom<br/>
    <b>Click the house</b> to toggle its lights<br/>
    <span class="kbd">R</span> reset · <span class="kbd">L</span> lights · <span class="kbd">C</span> clear · <span class="kbd">N</span> rain
  </div>
</aside>
`;
