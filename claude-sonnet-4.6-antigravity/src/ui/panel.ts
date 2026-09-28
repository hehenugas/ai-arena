// UI panel — controls and state binding
import { store, DEFAULT_STATE } from '../state/store';

export function buildUI(
  onHouseLightToggle: (on: boolean) => void,
  onReset: () => void
): void {
  const panel = document.createElement('div');
  panel.id = 'pw-panel';
  panel.innerHTML = `
    <div class="pw-header">
      <span class="pw-title">Pocket World</span>
      <button class="pw-collapse" aria-label="Toggle panel" aria-expanded="true">&#8964;</button>
    </div>
    <div class="pw-body">
      <div class="pw-section">
        <label class="pw-label" for="pw-time">Time of Day</label>
        <div class="pw-row">
          <input type="range" id="pw-time" class="pw-slider" min="0" max="24" step="0.1" value="16" aria-label="Time of day" />
          <span class="pw-value" id="pw-time-label">16:00</span>
        </div>
      </div>

      <div class="pw-section">
        <span class="pw-label">Weather</span>
        <div class="pw-btn-group" role="group" aria-label="Weather">
          <button class="pw-btn active" id="pw-weather-clear" data-weather="clear">Clear</button>
          <button class="pw-btn" id="pw-weather-rain" data-weather="rain">Rain</button>
        </div>
      </div>

      <div class="pw-section">
        <label class="pw-label" for="pw-wind">Wind Strength</label>
        <div class="pw-row">
          <input type="range" id="pw-wind" class="pw-slider" min="0" max="1" step="0.01" value="0.3" aria-label="Wind strength" />
          <span class="pw-value" id="pw-wind-label">30%</span>
        </div>
      </div>

      <div class="pw-section">
        <span class="pw-label">House Lights</span>
        <div class="pw-row pw-lights-row">
          <button class="pw-btn" id="pw-lights-toggle" aria-pressed="false">Off</button>
          <span class="pw-hint">or click the house</span>
        </div>
      </div>

      <div class="pw-section pw-actions">
        <button class="pw-btn pw-reset" id="pw-reset">Reset</button>
      </div>

      <div class="pw-hint-block">
        Drag to orbit &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click house for lights
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  injectStyles();

  // Elements
  const timeSlider = panel.querySelector<HTMLInputElement>('#pw-time')!;
  const timeLabel = panel.querySelector<HTMLSpanElement>('#pw-time-label')!;
  const windSlider = panel.querySelector<HTMLInputElement>('#pw-wind')!;
  const windLabel = panel.querySelector<HTMLSpanElement>('#pw-wind-label')!;
  const clearBtn = panel.querySelector<HTMLButtonElement>('#pw-weather-clear')!;
  const rainBtn = panel.querySelector<HTMLButtonElement>('#pw-weather-rain')!;
  const lightsBtn = panel.querySelector<HTMLButtonElement>('#pw-lights-toggle')!;
  const resetBtn = panel.querySelector<HTMLButtonElement>('#pw-reset')!;
  const collapseBtn = panel.querySelector<HTMLButtonElement>('.pw-collapse')!;
  const body = panel.querySelector<HTMLDivElement>('.pw-body')!;

  // Time slider
  timeSlider.addEventListener('input', () => {
    const v = parseFloat(timeSlider.value);
    store.set({ timeOfDay: v });
    timeLabel.textContent = formatTime(v);
  });

  // Wind slider
  windSlider.addEventListener('input', () => {
    const v = parseFloat(windSlider.value);
    store.set({ windStrength: v });
    windLabel.textContent = `${Math.round(v * 100)}%`;
  });

  // Weather buttons
  clearBtn.addEventListener('click', () => {
    store.set({ weather: 'clear' });
    clearBtn.classList.add('active');
    rainBtn.classList.remove('active');
  });
  rainBtn.addEventListener('click', () => {
    store.set({ weather: 'rain' });
    rainBtn.classList.add('active');
    clearBtn.classList.remove('active');
  });

  // House lights button
  lightsBtn.addEventListener('click', () => {
    const current = store.get().houseLightsOn;
    const next = !current;
    store.set({ houseLightsOn: next });
    updateLightsBtn(next);
    onHouseLightToggle(next);
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    store.reset();
    syncUI();
    onHouseLightToggle(false);
    onReset();
  });

  // Collapse
  let collapsed = false;
  collapseBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : '';
    collapseBtn.textContent = collapsed ? '▲' : '⌄';
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
  });

  function updateLightsBtn(on: boolean): void {
    lightsBtn.textContent = on ? 'On' : 'Off';
    lightsBtn.setAttribute('aria-pressed', String(on));
    lightsBtn.classList.toggle('active', on);
  }

  function syncUI(): void {
    const s = store.get();
    timeSlider.value = String(s.timeOfDay);
    timeLabel.textContent = formatTime(s.timeOfDay);
    windSlider.value = String(s.windStrength);
    windLabel.textContent = `${Math.round(s.windStrength * 100)}%`;
    clearBtn.classList.toggle('active', s.weather === 'clear');
    rainBtn.classList.toggle('active', s.weather === 'rain');
    updateLightsBtn(s.houseLightsOn);
  }

  // External sync (house click updates button)
  store.subscribe(s => {
    updateLightsBtn(s.houseLightsOn);
  });
}

function formatTime(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --pw-bg: rgba(18, 20, 32, 0.88);
      --pw-surface: rgba(30, 34, 52, 0.95);
      --pw-border: rgba(255,255,255,0.09);
      --pw-text: #f0ede6;
      --pw-muted: #9da8b8;
      --pw-accent: #6aaa4a;
      --pw-accent2: #5a9ad8;
      --pw-radius: 10px;
    }

    #pw-panel {
      position: fixed;
      top: 1rem;
      right: 1rem;
      width: 240px;
      background: var(--pw-bg);
      backdrop-filter: blur(14px);
      border: 1px solid var(--pw-border);
      border-radius: var(--pw-radius);
      color: var(--pw-text);
      font-size: 13px;
      line-height: 1.5;
      user-select: none;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    }

    .pw-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 1rem 0.5rem;
      border-bottom: 1px solid var(--pw-border);
    }

    .pw-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--pw-text);
    }

    .pw-collapse {
      background: none;
      border: none;
      color: var(--pw-muted);
      cursor: pointer;
      font-size: 16px;
      padding: 2px 4px;
      border-radius: 4px;
      line-height: 1;
    }
    .pw-collapse:hover { color: var(--pw-text); background: rgba(255,255,255,0.07); }
    .pw-collapse:focus-visible { outline: 2px solid var(--pw-accent2); }

    .pw-body {
      padding: 0.75rem 1rem 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .pw-section { display: flex; flex-direction: column; gap: 0.35rem; }

    .pw-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--pw-muted);
    }

    .pw-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .pw-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.15);
      outline: none;
      cursor: pointer;
    }
    .pw-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: var(--pw-accent2);
      cursor: pointer;
      box-shadow: 0 0 0 2px rgba(90,154,216,0.3);
    }
    .pw-slider:focus-visible { outline: 2px solid var(--pw-accent2); outline-offset: 3px; }

    .pw-value {
      font-size: 12px;
      min-width: 38px;
      text-align: right;
      color: var(--pw-text);
      font-variant-numeric: tabular-nums;
    }

    .pw-btn-group {
      display: flex;
      gap: 0.4rem;
    }

    .pw-btn {
      flex: 1;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid var(--pw-border);
      background: rgba(255,255,255,0.05);
      color: var(--pw-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .pw-btn:hover {
      background: rgba(255,255,255,0.1);
      color: var(--pw-text);
    }
    .pw-btn.active {
      background: rgba(106,170,74,0.2);
      border-color: var(--pw-accent);
      color: var(--pw-accent);
    }
    .pw-btn:focus-visible { outline: 2px solid var(--pw-accent2); outline-offset: 2px; }

    .pw-lights-row { flex-wrap: nowrap; }
    .pw-lights-row .pw-btn { flex: 0 0 auto; min-width: 52px; }

    .pw-hint {
      font-size: 11px;
      color: var(--pw-muted);
    }

    .pw-reset {
      background: rgba(180,60,40,0.15);
      border-color: rgba(180,60,40,0.3);
      color: #d08070;
      flex: 1;
    }
    .pw-reset:hover {
      background: rgba(180,60,40,0.28);
      color: #e09080;
    }

    .pw-actions { flex-direction: row; }

    .pw-hint-block {
      font-size: 10.5px;
      color: var(--pw-muted);
      text-align: center;
      opacity: 0.7;
      border-top: 1px solid var(--pw-border);
      padding-top: 0.6rem;
      margin-top: 0.1rem;
    }

    @media (max-width: 520px) {
      #pw-panel {
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        border-radius: var(--pw-radius) var(--pw-radius) 0 0;
        border-bottom: none;
      }
      .pw-body {
        max-height: 55vw;
        overflow-y: auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .pw-btn, .pw-slider { transition: none; }
    }
  `;
  document.head.appendChild(style);
}
