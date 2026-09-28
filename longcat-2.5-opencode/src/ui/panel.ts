import { AppState } from '../state';
import { updateHouseLights } from '../scene/house';

export function setupUI(
  container: HTMLElement,
  state: AppState,
  callbacks: { onReset: () => void },
  house: THREE.Group
): void {
  const panel = document.createElement('div');
  panel.className = 'panel';

  const title = document.createElement('h1');
  title.textContent = 'Pocket World';
  panel.appendChild(title);

  // Time control
  const timeGroup = document.createElement('div');
  timeGroup.className = 'control-group';

  const timeLabel = document.createElement('label');
  timeLabel.textContent = 'Time of Day';
  timeGroup.appendChild(timeLabel);

  const timeRow = document.createElement('div');
  timeRow.className = 'control-row';

  const timeSlider = document.createElement('input');
  timeSlider.type = 'range';
  timeSlider.min = '0';
  timeSlider.max = '24';
  timeSlider.step = '0.1';
  timeSlider.value = state.time.toString();
  timeSlider.setAttribute('aria-label', 'Time of day');

  const timeValue = document.createElement('span');
  timeValue.className = 'time-label';
  timeValue.textContent = formatTime(state.time);

  timeSlider.addEventListener('input', () => {
    state.time = parseFloat(timeSlider.value);
    timeValue.textContent = formatTime(state.time);
  });

  timeRow.appendChild(timeSlider);
  timeRow.appendChild(timeValue);
  timeGroup.appendChild(timeRow);
  panel.appendChild(timeGroup);

  // Weather control
  const weatherGroup = document.createElement('div');
  weatherGroup.className = 'control-group';

  const weatherLabel = document.createElement('label');
  weatherLabel.textContent = 'Weather';
  weatherGroup.appendChild(weatherLabel);

  const weatherRow = document.createElement('div');
  weatherRow.className = 'button-group';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.className = state.weather === 'clear' ? 'active' : '';
  clearBtn.addEventListener('click', () => {
    state.weather = 'clear';
    clearBtn.classList.add('active');
    rainBtn.classList.remove('active');
  });

  const rainBtn = document.createElement('button');
  rainBtn.textContent = 'Rain';
  rainBtn.className = state.weather === 'rain' ? 'active' : '';
  rainBtn.addEventListener('click', () => {
    state.weather = 'rain';
    rainBtn.classList.add('active');
    clearBtn.classList.remove('active');
  });

  weatherRow.appendChild(clearBtn);
  weatherRow.appendChild(rainBtn);
  weatherGroup.appendChild(weatherRow);
  panel.appendChild(weatherGroup);

  // Wind control
  const windGroup = document.createElement('div');
  windGroup.className = 'control-group';

  const windLabel = document.createElement('label');
  windLabel.textContent = 'Wind Strength';
  windGroup.appendChild(windLabel);

  const windRow = document.createElement('div');
  windRow.className = 'control-row';

  const windSlider = document.createElement('input');
  windSlider.type = 'range';
  windSlider.min = '0';
  windSlider.max = '1';
  windSlider.step = '0.01';
  windSlider.value = state.wind.toString();
  windSlider.setAttribute('aria-label', 'Wind strength');

  const windValue = document.createElement('span');
  windValue.className = 'time-label';
  windValue.textContent = `${Math.round(state.wind * 100)}%`;

  windSlider.addEventListener('input', () => {
    state.wind = parseFloat(windSlider.value);
    windValue.textContent = `${Math.round(state.wind * 100)}%`;
  });

  windRow.appendChild(windSlider);
  windRow.appendChild(windValue);
  windGroup.appendChild(windRow);
  panel.appendChild(windGroup);

  // House lights
  const lightsGroup = document.createElement('div');
  lightsGroup.className = 'control-group';

  const lightsBtn = document.createElement('button');
  lightsBtn.textContent = state.houseLights ? 'Lights On' : 'Lights Off';
  lightsBtn.className = state.houseLights ? 'active' : '';
  lightsBtn.addEventListener('click', () => {
    state.houseLights = !state.houseLights;
    lightsBtn.textContent = state.houseLights ? 'Lights On' : 'Lights Off';
    lightsBtn.classList.toggle('active');
    updateHouseLights(house, state.houseLights);
  });

  lightsGroup.appendChild(lightsBtn);
  panel.appendChild(lightsGroup);

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.className = 'reset-btn';
  resetBtn.addEventListener('click', () => {
    callbacks.onReset();
    timeSlider.value = state.time.toString();
    timeValue.textContent = formatTime(state.time);
    clearBtn.classList.add('active');
    rainBtn.classList.remove('active');
    windSlider.value = state.wind.toString();
    windValue.textContent = `${Math.round(state.wind * 100)}%`;
    lightsBtn.textContent = 'Lights Off';
    lightsBtn.classList.remove('active');
    updateHouseLights(house, state.houseLights);
  });
  panel.appendChild(resetBtn);

  // Guidance
  const guidance = document.createElement('div');
  guidance.className = 'guidance';
  guidance.innerHTML = 'Drag to orbit &bull; Scroll to zoom &bull; Click house to toggle lights';
  panel.appendChild(guidance);

  container.appendChild(panel);
}

function formatTime(time: number): string {
  const hours = Math.floor(time);
  const minutes = Math.floor((time - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
