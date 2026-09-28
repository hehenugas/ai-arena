import * as THREE from 'three';

// Perez-style sky color interpolation across time of day
const SKY_COLORS: Array<{ t: number; top: string; bottom: string; sun: string; ambient: string; sunIntensity: number; ambientIntensity: number }> = [
  { t: 0,    top: '#0a0e1a', bottom: '#111833', sun: '#2233aa', ambient: '#0a0e22', sunIntensity: 0.05, ambientIntensity: 0.15 },
  { t: 5,    top: '#0d1225', bottom: '#1a2244', sun: '#334488', ambient: '#111833', sunIntensity: 0.08, ambientIntensity: 0.18 },
  { t: 6,    top: '#2a3355', bottom: '#d4886a', sun: '#ff9955', ambient: '#443355', sunIntensity: 0.4,  ambientIntensity: 0.35 },
  { t: 7,    top: '#5577aa', bottom: '#f0c090', sun: '#ffcc88', ambient: '#887766', sunIntensity: 0.7,  ambientIntensity: 0.45 },
  { t: 9,    top: '#5599cc', bottom: '#88bbdd', sun: '#fff5e0', ambient: '#99aacc', sunIntensity: 1.0,  ambientIntensity: 0.55 },
  { t: 12,   top: '#4488bb', bottom: '#99ccee', sun: '#fffef5', ambient: '#aabbdd', sunIntensity: 1.1,  ambientIntensity: 0.6 },
  { t: 16,   top: '#5599cc', bottom: '#aaccdd', sun: '#fff5dd', ambient: '#99aacc', sunIntensity: 0.95, ambientIntensity: 0.55 },
  { t: 18,   top: '#554477', bottom: '#e0885a', sun: '#ff8844', ambient: '#665566', sunIntensity: 0.5,  ambientIntensity: 0.35 },
  { t: 19.5, top: '#221133', bottom: '#aa5544', sun: '#dd6633', ambient: '#332233', sunIntensity: 0.2,  ambientIntensity: 0.25 },
  { t: 20.5, top: '#111122', bottom: '#332244', sun: '#553355', ambient: '#161622', sunIntensity: 0.08, ambientIntensity: 0.2 },
  { t: 24,   top: '#0a0e1a', bottom: '#111833', sun: '#2233aa', ambient: '#0a0e22', sunIntensity: 0.05, ambientIntensity: 0.15 },
];

function lerpColor(a: string, b: string, f: number): THREE.Color {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, f);
}

function sampleSky(time: number) {
  let lo = SKY_COLORS[0], hi = SKY_COLORS[SKY_COLORS.length - 1];
  for (let i = 0; i < SKY_COLORS.length - 1; i++) {
    if (time >= SKY_COLORS[i].t && time <= SKY_COLORS[i + 1].t) {
      lo = SKY_COLORS[i];
      hi = SKY_COLORS[i + 1];
      break;
    }
  }
  const f = lo.t === hi.t ? 0 : (time - lo.t) / (hi.t - lo.t);
  return {
    top: lerpColor(lo.top, hi.top, f),
    bottom: lerpColor(lo.bottom, hi.bottom, f),
    sun: lerpColor(lo.sun, hi.sun, f),
    ambient: lerpColor(lo.ambient, hi.ambient, f),
    sunIntensity: lo.sunIntensity + (hi.sunIntensity - lo.sunIntensity) * f,
    ambientIntensity: lo.ambientIntensity + (hi.ambientIntensity - lo.ambientIntensity) * f,
  };
}

export function getSunDirection(time: number): THREE.Vector3 {
  // sun arcs east to west; noon = directly overhead tilted slightly south
  const hourAngle = ((time - 6) / 12) * Math.PI;
  const elevation = Math.sin(hourAngle) * 0.85;
  const lateral = Math.cos(hourAngle);
  return new THREE.Vector3(lateral, Math.max(elevation, -0.3), -0.4).normalize();
}

export interface EnvironmentState {
  skyTop: THREE.Color;
  skyBottom: THREE.Color;
  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  sunIntensity: number;
  ambientIntensity: number;
  sunDirection: THREE.Vector3;
  nightFactor: number;
}

export function computeEnvironment(time: number, weather: 'clear' | 'rain'): EnvironmentState {
  const sky = sampleSky(time);
  const dir = getSunDirection(time);

  // nightFactor: 0 at full day, 1 at deep night
  let nightFactor = 0;
  if (time < 6) nightFactor = 1;
  else if (time < 8) nightFactor = 1 - (time - 6) / 2;
  else if (time > 19) nightFactor = Math.min(1, (time - 19) / 2);
  else nightFactor = 0;

  const weatherDim = weather === 'rain' ? 0.55 : 1.0;

  return {
    skyTop: weather === 'rain' ? sky.top.clone().lerp(new THREE.Color('#334455'), 0.6) : sky.top,
    skyBottom: weather === 'rain' ? sky.bottom.clone().lerp(new THREE.Color('#445566'), 0.5) : sky.bottom,
    sunColor: sky.sun,
    ambientColor: sky.ambient,
    sunIntensity: sky.sunIntensity * weatherDim,
    ambientIntensity: sky.ambientIntensity * (weather === 'rain' ? 0.8 : 1.0),
    sunDirection: dir,
    nightFactor,
  };
}
