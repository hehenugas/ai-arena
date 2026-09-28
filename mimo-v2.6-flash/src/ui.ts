import { AppState, Weather } from './state';
import { formatTime } from './utils';

export class Panel {
  private state: AppState;
  private panel: HTMLElement;
  private toggle: HTMLButtonElement;
  private timeRange: HTMLInputElement;
  private timeValue: HTMLOutputElement;
  private windRange: HTMLInputElement;
  private windValue: HTMLOutputElement;
  private lights: HTMLInputElement;
  private reset: HTMLButtonElement;
  private weatherButtons: HTMLButtonElement[];

  constructor(state: AppState) {
    this.state = state;

    const panel = document.getElementById('panel');
    const toggle = document.getElementById('panelToggle');
    const timeRange = document.getElementById('timeRange');
    const timeValue = document.getElementById('timeValue');
    const windRange = document.getElementById('windRange');
    const windValue = document.getElementById('windValue');
    const lights = document.getElementById('lightsToggle');
    const reset = document.getElementById('resetButton');
    const weatherGroup = document.getElementById('weatherGroup');
    if (
      !(panel instanceof HTMLElement) ||
      !(toggle instanceof HTMLButtonElement) ||
      !(timeRange instanceof HTMLInputElement) ||
      !(timeValue instanceof HTMLOutputElement) ||
      !(windRange instanceof HTMLInputElement) ||
      !(windValue instanceof HTMLOutputElement) ||
      !(lights instanceof HTMLInputElement) ||
      !(reset instanceof HTMLButtonElement) ||
      !(weatherGroup instanceof HTMLElement)
    ) {
      throw new Error('Pocket World UI markup is missing or incomplete');
    }

    this.panel = panel;
    this.toggle = toggle;
    this.timeRange = timeRange;
    this.timeValue = timeValue;
    this.windRange = windRange;
    this.windValue = windValue;
    this.lights = lights;
    this.reset = reset;
    this.weatherButtons = Array.from(
      weatherGroup.querySelectorAll<HTMLButtonElement>('button[data-weather]'),
    );

    // --- initial responsive state ---
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    this.setOpen(!isMobile);

    // --- events ---
    this.timeRange.addEventListener('input', () => {
      state.setTime(Number(this.timeRange.value));
    });
    this.windRange.addEventListener('input', () => {
      state.setWind(Number(this.windRange.value) / 100);
    });
    this.lights.addEventListener('change', () => {
      state.setHouseLights(this.lights.checked);
    });
    this.reset.addEventListener('click', () => {
      state.reset();
      this.onReset?.();
    });

    for (const btn of this.weatherButtons) {
      btn.addEventListener('click', () => {
        const w = btn.dataset['weather'] as Weather | undefined;
        if (w === 'clear' || w === 'rain') state.setWeather(w);
      });
    }
    // Radiogroup keyboard support (roving tabindex + arrow keys)
    weatherGroup.addEventListener('keydown', (e) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const current = this.weatherButtons.findIndex(
        (b) => b.getAttribute('aria-checked') === 'true',
      );
      const next = current === 0 ? 1 : 0;
      const btn = this.weatherButtons[next];
      const w = btn.dataset['weather'] as Weather | undefined;
      if (w === 'clear' || w === 'rain') state.setWeather(w);
      btn.focus();
    });

    this.toggle.addEventListener('click', () => {
      this.setOpen(this.panel.dataset['open'] !== 'true');
    });

    // Reflect any state change (including from the 3D house click) into the UI
    state.subscribe(() => this.sync());
    this.sync();
  }

  /** Set by the app to also reset the camera when Reset is pressed. */
  onReset: (() => void) | null = null;

  private setOpen(open: boolean): void {
    this.panel.dataset['open'] = open ? 'true' : 'false';
    this.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  sync(): void {
    const s = this.state;
    if (Number(this.timeRange.value) !== Math.round(s.timeMinutes)) {
      this.timeRange.value = String(Math.round(s.timeMinutes));
    }
    this.timeValue.textContent = formatTime(s.timeMinutes);

    const pct = Math.round(s.wind * 100);
    if (Number(this.windRange.value) !== pct) this.windRange.value = String(pct);
    this.windValue.textContent = `${pct}%`;

    this.lights.checked = s.houseLights;

    for (const btn of this.weatherButtons) {
      const active = btn.dataset['weather'] === s.weather;
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }
  }
}
