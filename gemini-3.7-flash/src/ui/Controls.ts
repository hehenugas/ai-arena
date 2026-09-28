import { AppState } from '../state/AppState';
import { World } from '../scene/World';

export class Controls {
  private container: HTMLElement;
  private appState: AppState;
  private world: World;

  // DOM Elements
  private timeSlider!: HTMLInputElement;
  private timeLabel!: HTMLElement;
  private weatherClearBtn!: HTMLButtonElement;
  private weatherRainBtn!: HTMLButtonElement;
  private windSlider!: HTMLInputElement;
  private windLabel!: HTMLElement;
  private lightToggleBtn!: HTMLButtonElement;
  private lightStatusText!: HTMLElement;
  private lightIndicator!: HTMLElement;
  private resetBtn!: HTMLButtonElement;
  private panelElement!: HTMLElement;
  private collapseBtn!: HTMLButtonElement;

  private isCollapsed = false;

  constructor(container: HTMLElement, appState: AppState, world: World) {
    this.container = container;
    this.appState = appState;
    this.world = world;

    this.render();
    this.bindEvents();
    this.syncFromState();

    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      this.toggleCollapse(true);
    }
  }

  public toggleCollapse(force?: boolean): void {
    this.isCollapsed = force !== undefined ? force : !this.isCollapsed;
    this.panelElement.classList.toggle('collapsed', this.isCollapsed);
    this.collapseBtn.setAttribute('aria-expanded', (!this.isCollapsed).toString());
  }

  private render(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'pocket-ui-container';

    wrapper.innerHTML = `
      <aside class="pocket-panel" id="pocket-panel" aria-label="Pocket World Controls">
        <header class="panel-header">
          <div class="header-titles">
            <h1 class="panel-title">Pocket World</h1>
            <span class="panel-subtitle">Interactive 3D Diorama</span>
          </div>
          <button class="panel-collapse-btn" id="collapse-btn" aria-label="Toggle controls panel" title="Toggle panel">
            <svg class="chevron-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </header>

        <div class="panel-content" id="panel-content">
          <!-- Time of Day -->
          <div class="control-group">
            <div class="control-header">
              <label for="time-slider" class="control-label">
                <span class="label-icon">☀️</span> Time of Day
              </label>
              <span class="control-badge" id="time-badge">16:00</span>
            </div>
            <div class="slider-wrapper">
              <input
                type="range"
                id="time-slider"
                class="pocket-slider"
                min="0"
                max="24"
                step="0.1"
                value="16"
                aria-label="Time of Day in 24 hours"
              />
              <div class="time-ticks" aria-hidden="true">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </div>

          <!-- Weather Selection -->
          <div class="control-group">
            <div class="control-header">
              <span class="control-label">
                <span class="label-icon">☁️</span> Weather
              </span>
            </div>
            <div class="segmented-control" role="group" aria-label="Weather selection">
              <button
                type="button"
                id="btn-weather-clear"
                class="segmented-btn active"
                aria-pressed="true"
              >
                <span class="btn-icon">🌤️</span> Clear
              </button>
              <button
                type="button"
                id="btn-weather-rain"
                class="segmented-btn"
                aria-pressed="false"
              >
                <span class="btn-icon">🌧️</span> Rain
              </button>
            </div>
          </div>

          <!-- Wind Strength -->
          <div class="control-group">
            <div class="control-header">
              <label for="wind-slider" class="control-label">
                <span class="label-icon">🍃</span> Wind Strength
              </label>
              <span class="control-badge" id="wind-badge">30%</span>
            </div>
            <div class="slider-wrapper">
              <input
                type="range"
                id="wind-slider"
                class="pocket-slider"
                min="0"
                max="100"
                step="1"
                value="30"
                aria-label="Wind strength percentage"
              />
              <div class="slider-ends" aria-hidden="true">
                <span>Calm (0%)</span>
                <span>Brisk (100%)</span>
              </div>
            </div>
          </div>

          <!-- House Lights -->
          <div class="control-group">
            <div class="control-header">
              <span class="control-label">
                <span class="label-icon">🏡</span> Cottage
              </span>
            </div>
            <button
              type="button"
              id="btn-house-lights"
              class="pocket-toggle-btn"
              role="switch"
              aria-checked="false"
            >
              <span class="light-indicator" id="light-indicator"></span>
              <span class="toggle-text" id="light-status-text">House Lights: OFF</span>
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="control-actions">
            <button type="button" id="btn-reset" class="pocket-btn btn-reset">
              <svg class="btn-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span>Reset Scene</span>
            </button>
          </div>

          <!-- Interaction Hints -->
          <footer class="panel-footer">
            <p class="hint-item"><span class="hint-key">Drag</span> Orbit camera</p>
            <p class="hint-item"><span class="hint-key">Scroll / Pinch</span> Zoom</p>
            <p class="hint-item"><span class="hint-key">Click House</span> Toggle lights</p>
          </footer>
        </div>
      </aside>
    `;

    this.container.appendChild(wrapper);

    // Cache elements
    this.panelElement = wrapper.querySelector('#pocket-panel') as HTMLElement;
    this.collapseBtn = wrapper.querySelector('#collapse-btn') as HTMLButtonElement;
    this.timeSlider = wrapper.querySelector('#time-slider') as HTMLInputElement;
    this.timeLabel = wrapper.querySelector('#time-badge') as HTMLElement;
    this.weatherClearBtn = wrapper.querySelector('#btn-weather-clear') as HTMLButtonElement;
    this.weatherRainBtn = wrapper.querySelector('#btn-weather-rain') as HTMLButtonElement;
    this.windSlider = wrapper.querySelector('#wind-slider') as HTMLInputElement;
    this.windLabel = wrapper.querySelector('#wind-badge') as HTMLElement;
    this.lightToggleBtn = wrapper.querySelector('#btn-house-lights') as HTMLButtonElement;
    this.lightStatusText = wrapper.querySelector('#light-status-text') as HTMLElement;
    this.lightIndicator = wrapper.querySelector('#light-indicator') as HTMLElement;
    this.resetBtn = wrapper.querySelector('#btn-reset') as HTMLButtonElement;
  }

  private bindEvents(): void {
    // Collapse toggle
    this.collapseBtn.addEventListener('click', () => {
      this.toggleCollapse();
    });

    // Time of day slider
    this.timeSlider.addEventListener('input', () => {
      const val = parseFloat(this.timeSlider.value);
      this.appState.setTimeOfDay(val);
    });

    // Weather buttons
    this.weatherClearBtn.addEventListener('click', () => {
      this.appState.setWeather('clear');
    });

    this.weatherRainBtn.addEventListener('click', () => {
      this.appState.setWeather('rain');
    });

    // Wind strength slider
    this.windSlider.addEventListener('input', () => {
      const val = parseFloat(this.windSlider.value) / 100;
      this.appState.setWindStrength(val);
    });

    // House lights button
    this.lightToggleBtn.addEventListener('click', () => {
      this.appState.toggleHouseLights();
    });

    // Reset button
    this.resetBtn.addEventListener('click', () => {
      this.appState.reset();
      this.world.resetCamera();
    });

    // Listen to reactive AppState changes
    this.appState.subscribe(() => {
      this.syncFromState();
    });
  }

  private syncFromState(): void {
    const state = this.appState.state;

    // Time
    this.timeSlider.value = state.timeOfDay.toString();
    this.timeLabel.textContent = AppState.formatTime(state.timeOfDay);

    // Weather
    const isRain = state.weather === 'rain';
    this.weatherClearBtn.classList.toggle('active', !isRain);
    this.weatherClearBtn.setAttribute('aria-pressed', (!isRain).toString());
    this.weatherRainBtn.classList.toggle('active', isRain);
    this.weatherRainBtn.setAttribute('aria-pressed', isRain.toString());

    // Wind
    const windPercent = Math.round(state.windStrength * 100);
    this.windSlider.value = windPercent.toString();
    this.windLabel.textContent = `${windPercent}%`;

    // House Lights
    this.lightToggleBtn.classList.toggle('active', state.houseLights);
    this.lightToggleBtn.setAttribute('aria-checked', state.houseLights.toString());
    this.lightStatusText.textContent = state.houseLights ? 'House Lights: ON' : 'House Lights: OFF';
    this.lightIndicator.classList.toggle('lit', state.houseLights);
  }
}
