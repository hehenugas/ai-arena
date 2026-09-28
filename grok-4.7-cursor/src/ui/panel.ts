import { formatTime } from "../util";
import type { AppState, Weather } from "../state";

export type PanelHandlers = {
  onHour: (hour: number) => void;
  onWeather: (weather: Weather) => void;
  onWind: (wind: number) => void;
  onLights: (lightsOn: boolean) => void;
  onReset: () => void;
};

export type Panel = {
  sync: () => void;
};

export function createPanel(overlay: HTMLElement, state: AppState, handlers: PanelHandlers): Panel {
  const panel = document.createElement("aside");
  panel.className = "panel";
  panel.setAttribute("aria-label", "Pocket World controls");
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <h1>Pocket World</h1>
        <p class="subtitle">A tiny floating island</p>
      </div>
      <div class="head-actions">
        <button type="button" class="text-btn collapse-btn" aria-expanded="true" aria-controls="panel-body">Hide</button>
        <button type="button" class="text-btn" data-control="reset">Reset</button>
      </div>
    </div>
    <div class="panel-body" id="panel-body">
      <label class="field">
        <span class="field-label"><span>Time</span><span id="time-readout">16:00</span></span>
        <input id="time-slider" data-control="time" type="range" min="0" max="24" step="0.0166667" value="16" aria-valuemin="0" aria-valuemax="24" aria-valuetext="16:00" />
      </label>
      <div class="field">
        <span class="field-label" id="weather-label">Weather</span>
        <div class="segmented" role="group" aria-labelledby="weather-label">
          <button type="button" data-control="weather-clear" aria-pressed="true">Clear</button>
          <button type="button" data-control="weather-rain" aria-pressed="false">Rain</button>
        </div>
      </div>
      <label class="field">
        <span class="field-label"><span>Wind</span><span id="wind-readout">30%</span></span>
        <input id="wind-slider" data-control="wind" type="range" min="0" max="100" step="1" value="30" aria-valuemin="0" aria-valuemax="100" aria-valuetext="30 percent" />
      </label>
      <button type="button" class="lights" data-control="lights" aria-pressed="false">
        <span>House lights</span>
        <span id="lights-readout">Off</span>
      </button>
      <p class="hint">Drag to orbit the island. Scroll or pinch to zoom. Click the house, or use House lights, to switch the lamps.</p>
    </div>
  `;
  overlay.append(panel);

  const time = panel.querySelector<HTMLInputElement>("#time-slider");
  const timeReadout = panel.querySelector<HTMLElement>("#time-readout");
  const wind = panel.querySelector<HTMLInputElement>("#wind-slider");
  const windReadout = panel.querySelector<HTMLElement>("#wind-readout");
  const clearBtn = panel.querySelector<HTMLButtonElement>('[data-control="weather-clear"]');
  const rainBtn = panel.querySelector<HTMLButtonElement>('[data-control="weather-rain"]');
  const lightsBtn = panel.querySelector<HTMLButtonElement>('[data-control="lights"]');
  const lightsReadout = panel.querySelector<HTMLElement>("#lights-readout");
  const resetBtn = panel.querySelector<HTMLButtonElement>('[data-control="reset"]');
  const collapseBtn = panel.querySelector<HTMLButtonElement>(".collapse-btn");
  const weatherGroup = panel.querySelector<HTMLElement>(".segmented");

  if (!time || !timeReadout || !wind || !windReadout || !clearBtn || !rainBtn || !lightsBtn || !lightsReadout || !resetBtn || !collapseBtn || !weatherGroup) {
    throw new Error("Pocket World controls could not be created.");
  }

  const paintWeather = (weather: Weather) => {
    clearBtn.setAttribute("aria-pressed", weather === "clear" ? "true" : "false");
    rainBtn.setAttribute("aria-pressed", weather === "rain" ? "true" : "false");
  };

  const paintLights = (lightsOn: boolean) => {
    lightsBtn.setAttribute("aria-pressed", lightsOn ? "true" : "false");
    lightsReadout.textContent = lightsOn ? "On" : "Off";
  };

  const paintTime = (hour: number) => {
    const label = formatTime(hour);
    time.value = String(hour);
    timeReadout.textContent = label;
    time.setAttribute("aria-valuetext", label);
  };

  const paintWind = (value: number) => {
    const percent = Math.round(value * 100);
    wind.value = String(percent);
    windReadout.textContent = `${percent}%`;
    wind.setAttribute("aria-valuetext", `${percent} percent`);
  };

  time.addEventListener("input", () => {
    const hour = Number(time.value);
    paintTime(hour);
    handlers.onHour(hour);
  });

  wind.addEventListener("input", () => {
    const value = Number(wind.value) / 100;
    paintWind(value);
    handlers.onWind(value);
  });

  clearBtn.addEventListener("click", () => {
    paintWeather("clear");
    handlers.onWeather("clear");
  });
  rainBtn.addEventListener("click", () => {
    paintWeather("rain");
    handlers.onWeather("rain");
  });

  weatherGroup.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const rain = event.key === "ArrowRight" || event.key === "ArrowDown";
    const weather: Weather = rain ? "rain" : "clear";
    paintWeather(weather);
    handlers.onWeather(weather);
    (rain ? rainBtn : clearBtn).focus();
  });

  lightsBtn.addEventListener("click", () => {
    const next = lightsBtn.getAttribute("aria-pressed") !== "true";
    paintLights(next);
    handlers.onLights(next);
  });

  resetBtn.addEventListener("click", () => {
    handlers.onReset();
  });

  const setCollapsed = (collapsed: boolean) => {
    panel.classList.toggle("collapsed", collapsed);
    collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    collapseBtn.textContent = collapsed ? "Show" : "Hide";
  };

  collapseBtn.addEventListener("click", () => {
    setCollapsed(!panel.classList.contains("collapsed"));
  });

  const narrow = window.matchMedia("(max-width: 760px)");
  if (narrow.matches) setCollapsed(true);
  narrow.addEventListener("change", (event) => {
    setCollapsed(event.matches);
  });

  return {
    sync() {
      paintTime(state.hour);
      paintWind(state.wind);
      paintWeather(state.weather);
      paintLights(state.lightsOn);
    },
  };
}
