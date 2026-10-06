import { formatTime, setState, state, subscribe, type Weather } from '../state';

export interface Panel {
  element: HTMLElement;
  onReset: (cb: () => void) => void;
}

/**
 * Compact control panel. Every control writes straight into the shared
 * application state and re-reads it on change, so the 3D world and the UI
 * can never disagree.
 */
export function createPanel(root: HTMLElement): Panel {
  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <div class="panel-head">
      <h1 class="title">Pocket World</h1>
      <button id="collapseBtn" class="collapse" aria-expanded="true" aria-label="Collapse controls">▾</button>
    </div>
    <div class="panel-body">
      <div class="ctrl">
        <div class="ctrl-row">
          <label for="timeSlider">Time of day</label>
          <output id="timeOut" for="timeSlider">16:00</output>
        </div>
        <input id="timeSlider" type="range" min="0" max="24" step="0.25" value="16" />
      </div>
      <div class="ctrl">
        <div class="ctrl-row"><span>Weather</span></div>
        <div class="seg" role="group" aria-label="Weather">
          <button id="wClear" class="seg-btn" aria-pressed="true">Clear</button>
          <button id="wRain" class="seg-btn" aria-pressed="false">Rain</button>
        </div>
      </div>
      <div class="ctrl">
        <div class="ctrl-row">
          <label for="windSlider">Wind</label>
          <output id="windOut" for="windSlider">30%</output>
        </div>
        <input id="windSlider" type="range" min="0" max="100" step="1" value="30" />
      </div>
      <div class="ctrl">
        <button id="lightsBtn" class="btn" aria-pressed="false">
          <span class="dot"></span>House lights: <span id="lightsState">Off</span>
        </button>
      </div>
      <div class="ctrl">
        <button id="resetBtn" class="btn primary">Reset</button>
      </div>
    </div>
    <p class="hint">Drag to orbit · Scroll to zoom · Tap the house to toggle its lights</p>
  `;
  root.appendChild(panel);

  const collapseBtn = panel.querySelector<HTMLButtonElement>('#collapseBtn')!;
  const timeSlider = panel.querySelector<HTMLInputElement>('#timeSlider')!;
  const timeOut = panel.querySelector<HTMLOutputElement>('#timeOut')!;
  const windSlider = panel.querySelector<HTMLInputElement>('#windSlider')!;
  const windOut = panel.querySelector<HTMLOutputElement>('#windOut')!;
  const lightsBtn = panel.querySelector<HTMLButtonElement>('#lightsBtn')!;
  const lightsState = panel.querySelector<HTMLSpanElement>('#lightsState')!;
  const resetBtn = panel.querySelector<HTMLButtonElement>('#resetBtn')!;
  const wClear = panel.querySelector<HTMLButtonElement>('#wClear')!;
  const wRain = panel.querySelector<HTMLButtonElement>('#wRain')!;

  let onResetCb: (() => void) | null = null;

  // --- Control → state ------------------------------------------------------
  timeSlider.addEventListener('input', () => {
    setState({ timeOfDay: parseFloat(timeSlider.value) });
  });
  windSlider.addEventListener('input', () => {
    setState({ wind: parseInt(windSlider.value, 10) / 100 });
  });
  function setWeather(w: Weather): void {
    setState({ weather: w });
    wClear.classList.toggle('active', w === 'clear');
    wRain.classList.toggle('active', w === 'rain');
    wClear.setAttribute('aria-pressed', String(w === 'clear'));
    wRain.setAttribute('aria-pressed', String(w === 'rain'));
  }
  wClear.addEventListener('click', () => setWeather('clear'));
  wRain.addEventListener('click', () => setWeather('rain'));

  lightsBtn.addEventListener('click', () => {
    setState({ houseLights: !state.houseLights });
  });
  resetBtn.addEventListener('click', () => onResetCb?.());

  collapseBtn.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.textContent = collapsed ? '▸' : '▾';
  });
  if (window.innerWidth < 640) {
    panel.classList.add('collapsed');
    collapseBtn.setAttribute('aria-expanded', 'false');
    collapseBtn.textContent = '▸';
  }

  // --- State → control --------------------------------------------------------
  const render = (): void => {
    timeSlider.value = String(state.timeOfDay);
    timeOut.textContent = formatTime(state.timeOfDay);
    windSlider.value = String(Math.round(state.wind * 100));
    windOut.textContent = `${Math.round(state.wind * 100)}%`;
    lightsBtn.classList.toggle('on', state.houseLights);
    lightsBtn.setAttribute('aria-pressed', String(state.houseLights));
    lightsState.textContent = state.houseLights ? 'On' : 'Off';
    wClear.classList.toggle('active', state.weather === 'clear');
    wRain.classList.toggle('active', state.weather === 'rain');
    wClear.setAttribute('aria-pressed', String(state.weather === 'clear'));
    wRain.setAttribute('aria-pressed', String(state.weather === 'rain'));
  };
  render();
  subscribe(render);

  return {
    element: panel,
    onReset: (cb) => {
      onResetCb = cb;
    },
  };
}