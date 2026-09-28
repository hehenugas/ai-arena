import { store } from '../state';
import { formatTime, getTimePhase } from '../utils/math';
import { World } from '../scene/World';

export class UIManager {
  private root: HTMLElement;
  private world: World;

  // DOM Elements
  private timeSlider!: HTMLInputElement;
  private timeValueBadge!: HTMLElement;
  private weatherClearBtn!: HTMLButtonElement;
  private weatherRainBtn!: HTMLButtonElement;
  private windSlider!: HTMLInputElement;
  private windValueBadge!: HTMLElement;
  private lightsBtn!: HTMLButtonElement;
  private controlCard!: HTMLElement;
  private openPanelFab!: HTMLButtonElement;

  constructor(root: HTMLElement, world: World) {
    this.root = root;
    this.world = world;

    this.render();
    this.bindEvents();

    // Subscribe to state changes for bidirectional sync
    store.subscribe((state) => {
      this.syncUI(state);
    });
  }

  private render() {
    this.root.innerHTML = `
      <!-- Top / Left Control Card -->
      <aside class="control-card" id="control-card" aria-label="Pocket World Controls">
        <header class="panel-header">
          <div class="title-wrap">
            <div class="title-row">
              <h1 class="app-title">Pocket World</h1>
              <span class="toy-badge">Miniature</span>
            </div>
            <p class="app-subtitle">Interactive 3D Floating Island</p>
          </div>
          <button id="collapse-btn" class="close-btn" aria-label="Minimize Controls" title="Hide Panel">✕</button>
        </header>

        <!-- Time of Day Control -->
        <div class="control-group">
          <div class="control-label-row">
            <label for="time-slider">Time of Day</label>
            <span class="value-badge" id="time-badge">
              <span id="time-icon">🌇</span>
              <span id="time-text">16:00</span>
            </span>
          </div>
          <input
            id="time-slider"
            class="range-slider"
            type="range"
            min="0"
            max="24"
            step="0.1"
            value="16"
            aria-label="Time of Day"
          />
        </div>

        <!-- Weather Control -->
        <div class="control-group">
          <div class="control-label-row">
            <span>Weather</span>
          </div>
          <div class="segmented-pill" role="group" aria-label="Weather selection">
            <button id="btn-weather-clear" class="segmented-btn active" type="button" aria-pressed="true">
              <span>☀️</span> Clear
            </button>
            <button id="btn-weather-rain" class="segmented-btn" type="button" aria-pressed="false">
              <span>🌧️</span> Rain
            </button>
          </div>
        </div>

        <!-- Wind Control -->
        <div class="control-group">
          <div class="control-label-row">
            <label for="wind-slider">Wind Strength</label>
            <span class="value-badge" id="wind-badge">30%</span>
          </div>
          <input
            id="wind-slider"
            class="range-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value="30"
            aria-label="Wind Strength"
          />
        </div>

        <!-- Camera Views -->
        <div class="control-group" style="margin-bottom: 8px;">
          <div class="control-label-row">
            <span>Camera Angle</span>
          </div>
          <div class="presets-row">
            <button class="preset-chip" id="cam-iso" type="button">Default 3/4</button>
            <button class="preset-chip" id="cam-top" type="button">Top-Down</button>
            <button class="preset-chip" id="cam-house" type="button">Cottage</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions-row">
          <button id="btn-lights" class="action-btn" type="button" aria-label="Toggle House Lights">
            <span id="lights-icon">💡</span>
            <span id="lights-text">Lights: Off</span>
          </button>
          <button id="btn-quick-weather" class="action-btn" type="button">
            <span>🌧️</span>
            <span>Toggle Rain</span>
          </button>
          <button id="btn-reset" class="action-btn reset-btn" type="button" aria-label="Reset Scene to Defaults">
            <span>↺</span>
            <span>Reset Scene</span>
          </button>
        </div>
      </aside>

      <!-- Bottom Hint & Mobile Toggle Bar -->
      <footer class="footer-row">
        <div class="hint-pill">
          <span class="hint-icon">✨</span>
          <span>Click house to toggle lights • Drag to orbit • Scroll to zoom</span>
        </div>
        <button id="open-panel-fab" class="open-panel-fab" type="button" aria-label="Open Controls">
          <span>⚙️</span>
          <span>Controls</span>
        </button>
      </footer>
    `;

    // Query elements
    this.controlCard = this.root.querySelector('#control-card') as HTMLElement;
    this.timeSlider = this.root.querySelector('#time-slider') as HTMLInputElement;
    this.timeValueBadge = this.root.querySelector('#time-badge') as HTMLElement;
    this.weatherClearBtn = this.root.querySelector('#btn-weather-clear') as HTMLButtonElement;
    this.weatherRainBtn = this.root.querySelector('#btn-weather-rain') as HTMLButtonElement;
    this.windSlider = this.root.querySelector('#wind-slider') as HTMLInputElement;
    this.windValueBadge = this.root.querySelector('#wind-badge') as HTMLElement;
    this.lightsBtn = this.root.querySelector('#btn-lights') as HTMLButtonElement;
    this.openPanelFab = this.root.querySelector('#open-panel-fab') as HTMLButtonElement;

    // Check if collapsed parameter requested
    const params = new URLSearchParams(window.location.search);
    if (params.get('collapsed') === '1' || params.get('collapsed') === 'true') {
      this.controlCard.classList.add('collapsed');
      this.openPanelFab.style.display = 'inline-flex';
    }
  }

  private bindEvents() {
    // Time slider input
    this.timeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      store.setTime(val);
    });

    // Weather buttons
    this.weatherClearBtn.addEventListener('click', () => store.setWeather('clear'));
    this.weatherRainBtn.addEventListener('click', () => store.setWeather('rain'));

    const quickWeather = this.root.querySelector('#btn-quick-weather') as HTMLButtonElement;
    if (quickWeather) {
      quickWeather.addEventListener('click', () => store.toggleWeather());
    }

    // Wind slider input
    this.windSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      store.setWind(val / 100);
    });

    // House lights toggle
    this.lightsBtn.addEventListener('click', () => {
      store.toggleHouseLights();
    });

    // Camera preset buttons
    const camIso = this.root.querySelector('#cam-iso') as HTMLButtonElement;
    const camTop = this.root.querySelector('#cam-top') as HTMLButtonElement;
    const camHouse = this.root.querySelector('#cam-house') as HTMLButtonElement;

    camIso?.addEventListener('click', () => this.world.setCameraPreset('iso'));
    camTop?.addEventListener('click', () => this.world.setCameraPreset('top'));
    camHouse?.addEventListener('click', () => this.world.setCameraPreset('house'));

    // Reset button
    const resetBtn = this.root.querySelector('#btn-reset') as HTMLButtonElement;
    resetBtn?.addEventListener('click', () => {
      store.reset();
      this.world.resetCamera();
    });

    // Collapse / Expand on mobile
    const collapseBtn = this.root.querySelector('#collapse-btn') as HTMLButtonElement;
    collapseBtn?.addEventListener('click', () => {
      this.controlCard.classList.add('collapsed');
      this.openPanelFab.style.display = 'inline-flex';
    });

    this.openPanelFab?.addEventListener('click', () => {
      this.controlCard.classList.remove('collapsed');
      if (window.innerWidth > 640) {
        this.openPanelFab.style.display = 'none';
      }
    });
  }

  private syncUI(state: ReturnType<typeof store.getState>) {
    // Sync time
    const timeFormatted = formatTime(state.time);
    const phase = getTimePhase(state.time);
    this.timeSlider.value = state.time.toString();
    this.timeValueBadge.innerHTML = `<span>${phase.icon}</span> <span>${timeFormatted} (${phase.label})</span>`;

    // Sync weather
    const isRain = state.weather === 'rain';
    this.weatherClearBtn.classList.toggle('active', !isRain);
    this.weatherClearBtn.setAttribute('aria-pressed', (!isRain).toString());
    this.weatherRainBtn.classList.toggle('active', isRain);
    this.weatherRainBtn.setAttribute('aria-pressed', isRain.toString());

    // Sync wind
    const windPct = Math.round(state.wind * 100);
    this.windSlider.value = windPct.toString();
    this.windValueBadge.textContent = `${windPct}%`;

    // Sync house lights
    this.lightsBtn.classList.toggle('active-glow', state.houseLights);
    const lightsText = this.root.querySelector('#lights-text');
    if (lightsText) {
      lightsText.textContent = state.houseLights ? 'Lights: On' : 'Lights: Off';
    }
  }
}
