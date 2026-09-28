import type { WorldState } from './state';
import { formatTime } from './state';

export interface UIActions {
  setHour: (hour: number) => void;
  setWeather: (weather: WorldState['weather']) => void;
  setWind: (wind: number) => void;
  setLights: (enabled: boolean) => void;
  reset: () => void;
}

export interface WorldUI {
  sync: (state: WorldState) => void;
  toggleLights: () => void;
}

export function createUI(actions: UIActions): WorldUI {
  const panel = document.getElementById('panel') as HTMLElement;
  const collapse = document.getElementById('collapse-panel') as HTMLButtonElement;
  const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
  const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
  const timeReadout = document.getElementById('time-readout') as HTMLOutputElement;
  const windReadout = document.getElementById('wind-readout') as HTMLOutputElement;
  const lightsToggle = document.getElementById('lights-toggle') as HTMLInputElement;
  const lightsState = document.getElementById('lights-state') as HTMLSpanElement;
  const weatherStatus = document.getElementById('weather-status') as HTMLSpanElement;
  const weatherButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-weather]'));
  const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
  const content = document.getElementById('panel-content') as HTMLElement;

  const layoutQuery = window.matchMedia('(max-width: 720px)');
  setExpanded(!layoutQuery.matches);

  function setExpanded(expanded: boolean) {
    panel.classList.toggle('is-collapsed', !expanded);
    collapse.setAttribute('aria-expanded', String(expanded));
    collapse.setAttribute('aria-label', expanded ? 'Collapse controls' : 'Expand controls');
    collapse.setAttribute('title', expanded ? 'Collapse controls' : 'Expand controls');
    content.setAttribute('aria-hidden', String(!expanded));
  }

  collapse.addEventListener('click', () => setExpanded(panel.classList.contains('is-collapsed')));
  layoutQuery.addEventListener('change', (event) => setExpanded(!event.matches));
  timeSlider.addEventListener('input', () => actions.setHour(Number(timeSlider.value)));
  windSlider.addEventListener('input', () => actions.setWind(Number(windSlider.value) / 100));
  for (const button of weatherButtons) {
    button.addEventListener('click', () => actions.setWeather(button.dataset.weather === 'rain' ? 'rain' : 'clear'));
  }
  lightsToggle.addEventListener('change', () => actions.setLights(lightsToggle.checked));
  resetButton.addEventListener('click', actions.reset);

  return {
    sync(state) {
      timeSlider.value = String(state.hour);
      timeReadout.value = formatTime(state.hour);
      windSlider.value = String(Math.round(state.wind * 100));
      windReadout.value = `${Math.round(state.wind * 100)}%`;
      lightsToggle.checked = state.lights;
      lightsState.textContent = state.lights ? 'On' : 'Off';
      for (const button of weatherButtons) {
        const active = button.dataset.weather === state.weather;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
      const statusLabel = weatherStatus.querySelector('span:last-child');
      if (statusLabel) statusLabel.textContent = state.weather === 'rain' ? 'Rain' : 'Clear';
      weatherStatus.classList.toggle('is-rainy', state.weather === 'rain');
    },
    toggleLights() {
      actions.setLights(!lightsToggle.checked);
    },
  };
}
