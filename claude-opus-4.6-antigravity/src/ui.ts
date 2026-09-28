import { getState, setState, subscribe, resetState, type AppState } from './state';

function formatTime(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function createUI(): { updateFromState: (s: AppState) => void } {
  const app = document.getElementById('app')!;

  const panel = document.createElement('div');
  panel.className = 'pw-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Pocket World Controls');

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'pw-toggle-panel';
  toggleBtn.setAttribute('aria-label', 'Show controls');
  toggleBtn.textContent = '☰';

  panel.innerHTML = `
    <div class="pw-title">Pocket World</div>
    <div class="pw-subtitle">A tiny floating island</div>

    <div class="pw-section">
      <div class="pw-label">
        <span>Time of Day</span>
        <span class="pw-label-value" id="pw-time-label">16:00</span>
      </div>
      <input type="range" id="pw-time" min="0" max="24" step="0.1" value="16" aria-label="Time of day" />
    </div>

    <div class="pw-section">
      <div class="pw-label"><span>Weather</span></div>
      <div class="pw-btn-row">
        <button class="pw-btn active" id="pw-clear" aria-pressed="true">Clear</button>
        <button class="pw-btn" id="pw-rain" aria-pressed="false">Rain</button>
      </div>
    </div>

    <div class="pw-section">
      <div class="pw-label">
        <span>Wind</span>
        <span class="pw-label-value" id="pw-wind-label">30%</span>
      </div>
      <input type="range" id="pw-wind" min="0" max="100" step="1" value="30" aria-label="Wind strength" />
    </div>

    <div class="pw-section">
      <button class="pw-toggle-btn" id="pw-lights" aria-pressed="false">
        <span class="pw-toggle-indicator"></span>
        <span>House Lights</span>
      </button>
    </div>

    <div class="pw-section">
      <button class="pw-reset" id="pw-reset-btn">Reset</button>
    </div>

    <div class="pw-hint">
      Drag to orbit. Scroll to zoom. Click the house to toggle lights.
    </div>
  `;

  app.appendChild(panel);
  app.appendChild(toggleBtn);

  const timeSlider = panel.querySelector('#pw-time') as HTMLInputElement;
  const timeLabel = panel.querySelector('#pw-time-label')!;
  const windSlider = panel.querySelector('#pw-wind') as HTMLInputElement;
  const windLabel = panel.querySelector('#pw-wind-label')!;
  const clearBtn = panel.querySelector('#pw-clear') as HTMLButtonElement;
  const rainBtn = panel.querySelector('#pw-rain') as HTMLButtonElement;
  const lightsBtn = panel.querySelector('#pw-lights') as HTMLButtonElement;
  const resetBtn = panel.querySelector('#pw-reset-btn') as HTMLButtonElement;

  timeSlider.addEventListener('input', () => {
    setState({ time: parseFloat(timeSlider.value) });
  });

  windSlider.addEventListener('input', () => {
    setState({ wind: parseInt(windSlider.value) / 100 });
  });

  clearBtn.addEventListener('click', () => setState({ weather: 'clear' }));
  rainBtn.addEventListener('click', () => setState({ weather: 'rain' }));
  lightsBtn.addEventListener('click', () => setState({ lightsOn: !getState().lightsOn }));
  resetBtn.addEventListener('click', () => resetState());

  let panelVisible = true;
  toggleBtn.addEventListener('click', () => {
    panelVisible = !panelVisible;
    panel.classList.toggle('collapsed', !panelVisible);
    toggleBtn.classList.toggle('visible', !panelVisible);
    toggleBtn.setAttribute('aria-label', panelVisible ? 'Hide controls' : 'Show controls');
  });

  // close panel on mobile by swiping down or tapping toggle
  panel.addEventListener('click', (e) => {
    if (e.target === panel && window.innerWidth <= 600) {
      panelVisible = false;
      panel.classList.add('collapsed');
      toggleBtn.classList.add('visible');
    }
  });

  function updateFromState(s: AppState) {
    timeSlider.value = s.time.toString();
    timeLabel.textContent = formatTime(s.time);
    windSlider.value = (s.wind * 100).toString();
    windLabel.textContent = `${Math.round(s.wind * 100)}%`;

    clearBtn.classList.toggle('active', s.weather === 'clear');
    clearBtn.setAttribute('aria-pressed', (s.weather === 'clear').toString());
    rainBtn.classList.toggle('active', s.weather === 'rain');
    rainBtn.setAttribute('aria-pressed', (s.weather === 'rain').toString());

    lightsBtn.classList.toggle('active', s.lightsOn);
    lightsBtn.setAttribute('aria-pressed', s.lightsOn.toString());
  }

  subscribe(updateFromState);
  updateFromState(getState());

  return { updateFromState };
}
