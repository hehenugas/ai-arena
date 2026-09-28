import { formatClock, formatPhase, type WorldState, type WorldTarget, type Weather } from '../core/state';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

export interface UI {
  sync(target: WorldTarget): void;
}

/** Binds the control panel to the shared world state. */
export function createUI(state: WorldState, onReset: () => void): UI {
  const timeInput = $<HTMLInputElement>('time');
  const timeValue = $<HTMLOutputElement>('time-value');
  const timeHint = $<HTMLParagraphElement>('time-hint');
  const windInput = $<HTMLInputElement>('wind');
  const windValue = $<HTMLOutputElement>('wind-value');
  const lights = $<HTMLButtonElement>('lights');
  const lightsText = $<HTMLSpanElement>('lights-text');
  const reset = $<HTMLButtonElement>('reset');
  const panel = $<HTMLElement>('panel');
  const panelToggle = $<HTMLButtonElement>('panel-toggle');
  const weatherButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.segmented__btn[data-weather]'),
  );

  timeInput.addEventListener('input', () => state.setTime(Number(timeInput.value)));
  windInput.addEventListener('input', () => state.setWind(Number(windInput.value) / 100));
  lights.addEventListener('click', () => state.toggleLights());
  reset.addEventListener('click', () => {
    state.reset();
    onReset();
  });

  for (const button of weatherButtons) {
    button.addEventListener('click', () => state.setWeather(button.dataset.weather as Weather));
  }

  panelToggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    panelToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  const isSmall = () => window.matchMedia('(max-width: 720px)').matches;
  if (isSmall()) {
    panel.classList.add('is-collapsed');
    panelToggle.setAttribute('aria-expanded', 'false');
  }

  return {
    sync(target) {
      if (document.activeElement !== timeInput) timeInput.value = String(target.time);
      if (document.activeElement !== windInput) windInput.value = String(Math.round(target.wind * 100));
      timeValue.textContent = formatClock(target.time);
      timeHint.textContent = `${formatPhase(target.time)} — drag to move the sun.`;
      windValue.textContent = `${Math.round(target.wind * 100)}%`;
      lights.setAttribute('aria-checked', String(target.lights));
      lightsText.textContent = target.lights ? 'On' : 'Off';
      for (const button of weatherButtons) {
        const active = button.dataset.weather === target.weather;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
    },
  };
}

/** Keyboard shortcuts that mirror the panel, so the whole thing works without a mouse. */
export function bindShortcuts(state: WorldState, onReset: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' && (event.target as HTMLInputElement).type === 'range') {
      if (event.key === 'r' || event.key === 'R') return;
    }
    switch (event.key) {
      case 'r':
      case 'R':
        state.reset();
        onReset();
        break;
      case 'l':
      case 'L':
        state.toggleLights();
        break;
      case 'c':
      case 'C':
        state.setWeather(state.target.weather === 'clear' ? 'rain' : 'clear');
        break;
      default:
        return;
    }
    event.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
