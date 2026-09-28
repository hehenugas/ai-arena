import type { Insets } from '../interaction/cameraRig';
import { describeTime, describeWind, formatTime, type Store, type Weather, type WorldState } from '../state';

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  rain: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14.5h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.4 8.2 3.2 3.2 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5h6M9.8 20.5h4.4M12 3.5a5.8 5.8 0 0 0-3.4 10.5c.6.5.9 1.2.9 2v1.5h5v-1.5c0-.8.3-1.5.9-2A5.8 5.8 0 0 0 12 3.5z"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4.2h4.2"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  wind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9h11a2.8 2.8 0 1 0-2.8-2.8M3.5 13.5h15a2.8 2.8 0 1 1-2.8 2.8M3.5 18h6"/></svg>',
};

const COMPACT_QUERY = '(max-width: 720px)';

export interface PanelCallbacks {
  onReset: () => void;
  onLayout: (insets: Insets) => void;
}

export class Panel {
  readonly root: HTMLElement;
  private readonly time: HTMLInputElement;
  private readonly timeOut: HTMLElement;
  private readonly wind: HTMLInputElement;
  private readonly windOut: HTMLElement;
  private readonly weather: Record<Weather, HTMLInputElement>;
  private readonly lights: HTMLButtonElement;
  private readonly lightsState: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly live: HTMLElement;
  private readonly compact = window.matchMedia(COMPACT_QUERY);
  private collapsed: boolean;

  constructor(host: HTMLElement, store: Store, private readonly cb: PanelCallbacks) {
    this.collapsed = this.compact.matches;
    host.innerHTML = `
      <aside class="panel" aria-label="Pocket World controls">
        <header class="panel__header">
          <div class="brand">
            <span class="brand__mark" aria-hidden="true"></span>
            <div>
              <h1 class="brand__title">Pocket World</h1>
              <p class="brand__tag" data-summary>A tiny island, adrift.</p>
            </div>
          </div>
          <button class="panel__toggle" type="button" aria-controls="panel-body">
            <span class="visually-hidden" data-toggle-label>Show controls</span>${ICONS.chevron}
          </button>
        </header>
        <div class="panel__body" id="panel-body">
          <div class="panel__inner">
            <div class="field">
              <div class="field__row">
                <label class="field__label" for="pw-time">Time of day</label>
                <output class="field__value" for="pw-time" id="pw-time-out"></output>
              </div>
              <input class="range range--time" id="pw-time" type="range" min="0" max="24" step="0.25" />
              <div class="ticks" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
            </div>

            <fieldset class="field">
              <legend class="field__label">Weather</legend>
              <div class="segmented">
                <input type="radio" name="pw-weather" id="pw-clear" value="clear" />
                <label for="pw-clear">${ICONS.sun}<span>Clear</span></label>
                <input type="radio" name="pw-weather" id="pw-rain" value="rain" />
                <label for="pw-rain">${ICONS.rain}<span>Rain</span></label>
              </div>
            </fieldset>

            <div class="field">
              <div class="field__row">
                <label class="field__label" for="pw-wind">${ICONS.wind}Wind</label>
                <output class="field__value" for="pw-wind" id="pw-wind-out"></output>
              </div>
              <input class="range range--wind" id="pw-wind" type="range" min="0" max="100" step="1" />
            </div>

            <div class="field field--inline">
              <span class="field__label" id="pw-lights-label">${ICONS.bulb}House lights</span>
              <button class="switch" id="pw-lights" type="button" role="switch" aria-labelledby="pw-lights-label">
                <span class="switch__track"><span class="switch__thumb"></span></span>
                <span class="switch__state" aria-hidden="true"></span>
              </button>
            </div>

            <button class="reset" type="button" id="pw-reset">${ICONS.reset}<span>Reset world</span></button>

            <ul class="hints">
              <li><kbd>Drag</kbd> to orbit</li>
              <li><kbd>Scroll</kbd> or <kbd>pinch</kbd> to zoom</li>
              <li><kbd>Tap</kbd> the house to switch its lights</li>
            </ul>
          </div>
        </div>
      </aside>
      <div class="visually-hidden" aria-live="polite" data-live></div>
    `;

    const $ = <T extends Element>(sel: string) => {
      const el = host.querySelector<T>(sel);
      if (!el) throw new Error(`Missing UI element ${sel}`);
      return el;
    };
    this.root = $('.panel');
    this.time = $('#pw-time');
    this.timeOut = $('#pw-time-out');
    this.wind = $('#pw-wind');
    this.windOut = $('#pw-wind-out');
    this.weather = { clear: $('#pw-clear'), rain: $('#pw-rain') };
    this.lights = $('#pw-lights');
    this.lightsState = $('.switch__state');
    this.toggle = $('.panel__toggle');
    this.live = $('[data-live]');

    this.time.addEventListener('input', () => store.set({ time: Number(this.time.value) }));
    this.wind.addEventListener('input', () => store.set({ wind: Number(this.wind.value) / 100 }));
    for (const w of ['clear', 'rain'] as const) {
      this.weather[w].addEventListener('change', () => {
        if (this.weather[w].checked) store.set({ weather: w });
      });
    }
    this.lights.addEventListener('click', () => store.set({ lights: !store.state.lights }));
    $('#pw-reset').addEventListener('click', () => {
      store.reset();
      cb.onReset();
      this.announce('World reset to 16:00, clear weather, light breeze, lights off.');
    });
    this.toggle.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    this.compact.addEventListener('change', (e) => {
      this.render(store.state);
      this.setCollapsed(e.matches);
    });

    store.subscribe((state, source) => {
      this.render(state);
      if (source === 'scene') this.announce(`House lights ${state.lights ? 'on' : 'off'}.`);
    });
    this.render(store.state);
    this.setCollapsed(this.collapsed);

    new ResizeObserver(() => this.reportLayout()).observe(this.root);
    window.addEventListener('resize', () => this.reportLayout());
  }

  private setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
    this.root.classList.toggle('is-collapsed', collapsed);
    this.toggle.setAttribute('aria-expanded', String(!collapsed));
    const label = this.toggle.querySelector('[data-toggle-label]');
    if (label) label.textContent = collapsed ? 'Show controls' : 'Hide controls';
    this.reportLayout();
  }

  /** Screen area the panel covers, so the camera can frame the island beside it. */
  insets(): Insets {
    const r = this.root.getBoundingClientRect();
    if (this.compact.matches) return { left: 0, bottom: Math.max(0, window.innerHeight - r.top) };
    if (this.collapsed) return { left: 0, bottom: 0 };
    return { left: r.right, bottom: 0 };
  }

  private reportLayout() {
    this.cb.onLayout(this.insets());
  }

  private announce(msg: string) {
    this.live.textContent = '';
    window.setTimeout(() => (this.live.textContent = msg), 30);
  }

  private render(s: Readonly<WorldState>) {
    const clock = formatTime(s.time);
    const phase = describeTime(s.time);
    this.time.value = String(s.time);
    this.time.setAttribute('aria-valuetext', `${clock}, ${phase}`);
    this.timeOut.innerHTML = `<span class="clock">${clock}</span><span class="phase">${phase}</span>`;

    const pct = Math.round(s.wind * 100);
    this.wind.value = String(pct);
    this.wind.style.setProperty('--fill', `${pct}%`);
    this.wind.setAttribute('aria-valuetext', `${pct}%, ${describeWind(s.wind)}`);
    this.windOut.innerHTML = `<span class="clock">${pct}%</span><span class="phase">${describeWind(s.wind)}</span>`;

    this.weather.clear.checked = s.weather === 'clear';
    this.weather.rain.checked = s.weather === 'rain';

    this.lights.setAttribute('aria-checked', String(s.lights));
    this.lightsState.textContent = s.lights ? 'On' : 'Off';

    const summary = this.root.querySelector('[data-summary]');
    if (summary) {
      summary.textContent = this.compact.matches
        ? `${clock} · ${s.weather === 'rain' ? 'Rain' : 'Clear'} · Wind ${pct}%`
        : 'A tiny island, adrift.';
    }
  }
}
