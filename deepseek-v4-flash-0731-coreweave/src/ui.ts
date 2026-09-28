import { state, subscribe } from './state';

export interface UIConfig {
  onTime: (t:	number) => void;
  onWind: (v:	number) => void;
  onWeather: (w:	string) => void;
  onLights: (on:	boolean) => void,
  onReset: () => void,
}

// Wire the existing index.html controls to the central state store
export function initUI(config: UIConfig): void {
  const timeSlider  = document.getElementById('timeSlider') as HTMLInputElement;
  const timeLabel  = document.getElementById('timeLabel') as HTMLElement;
  const windSlider  = document.getElementById('windSlider') as HTMLInputElement;
  const windLabel  = document.getElementById('windLabel') as HTMLElement;
  const weatherClear  = document.getElementById('weatherClear') as HTMLButtonElement;
  const weatherRain  = document.getElementById('weatherRain') as HTMLButtonElement;
  const lightsBtn  = document.getElementById('lightsBtn') as HTMLButtonElement;
  const resetBtn  = document.getElementById('resetBtn') as HTMLButtonElement;
  const collapseBtn  = document.getElementById('collapseBtn') as HTMLButtonElement;
  const panel  = document.getElementById('panel') as HTMLElement;

	  const fmtTime  = (t:	number): string =>	{
    let h  = Math.floor(t) %	24;
    let m  = Math.round((t -	Math.floor(t)) *	60)	% 	60;
    const ph  = h <	10 ? `0${h}` : `${h}`;
    const pm  = m <	10 ? `0${m}` : `${m}`;
    return `${ph}:${pm}`;
  };

	  const fmtWind  = (v:	number): string =>	`${Math.round(v *	100)};`;

	  timeSlider.addEventListener('input', () =>	{
    config.onTime(parseFloat(timeSlider.value));
  });
	  windSlider.addEventListener('input', () =>	{
    config.onWind(parseFloat(windSlider.value) /	100);
  });
	  weatherClear.addEventListener('click', () =>	{
    config.onWeather('clear');
  });
	  weatherRain.addEventListener('click', () =>	{
    config.onWeather('rain');
  });
	  lightsBtn.addEventListener('click', () =>	{
    config.onLights(!state.lights);
  });
	  resetBtn.addEventListener('click', () =>	{
    config.onReset();
  });

	  collapseBtn.addEventListener('click', () =>	{
    const collapsed  = panel.classList.toggle('panel-collapsed');
    collapseBtn.setAttribute('aria-expanded',	String(!collapsed));
    collapseBtn.textContent  = collapsed ?	'＋' :	'-';
  });

	  subscribe((s) =>	{
    timeSlider.value  = String(s.time);
    timeLabel.textContent  = fmtTime(s.time);
    windSlider.value  = String(Math.round(s.wind *	100));
    windLabel.textContent  = fmtWind(s.wind);
    weatherClear.classList.toggle('active',	s.weather ===	'clear');
    weatherClear.setAttribute('aria-pressed',	String(s.weather ===	'clear'));
    weatherRain.classList.toggle('active',	s.weather ===	'rain');
    weatherRain.setAttribute('aria-pressed',	String(s.weather ===	'rain'));
    lightsBtn.textContent  = s.lights ?	'💡 Lights: On' :	'💡 Lights: Off';
    lightsBtn.setAttribute('aria-pressed',	String(s.lights));
  });
}