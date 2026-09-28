// Environment color/light values derived from time of day
import * as THREE from 'three';

export interface EnvConfig {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  fogColor: THREE.Color;
  fogDensity: number;
}

function lerp3(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

// Key frames: [hour, config]
const KEYFRAMES: Array<[number, Omit<EnvConfig, 'sunPosition'>]> = [
  [0, { // midnight
    skyTop: new THREE.Color(0x05071a),
    skyHorizon: new THREE.Color(0x0d1033),
    ambientColor: new THREE.Color(0x2a3060),
    ambientIntensity: 0.15,
    sunColor: new THREE.Color(0x6080ff),
    sunIntensity: 0.02,
    fogColor: new THREE.Color(0x0d1033),
    fogDensity: 0.018,
  }],
  [5, { // pre-dawn
    skyTop: new THREE.Color(0x1a1240),
    skyHorizon: new THREE.Color(0x5c2d5e),
    ambientColor: new THREE.Color(0x4a3060),
    ambientIntensity: 0.2,
    sunColor: new THREE.Color(0xff7040),
    sunIntensity: 0.1,
    fogColor: new THREE.Color(0x5c2d5e),
    fogDensity: 0.015,
  }],
  [7, { // sunrise
    skyTop: new THREE.Color(0x3d6fa8),
    skyHorizon: new THREE.Color(0xff9050),
    ambientColor: new THREE.Color(0xffd090),
    ambientIntensity: 0.55,
    sunColor: new THREE.Color(0xffca7a),
    sunIntensity: 1.2,
    fogColor: new THREE.Color(0xffc06a),
    fogDensity: 0.008,
  }],
  [10, { // morning
    skyTop: new THREE.Color(0x5a9fd8),
    skyHorizon: new THREE.Color(0xa8d8f0),
    ambientColor: new THREE.Color(0xd0e8ff),
    ambientIntensity: 0.8,
    sunColor: new THREE.Color(0xfff5d0),
    sunIntensity: 2.0,
    fogColor: new THREE.Color(0xc8e4f8),
    fogDensity: 0.004,
  }],
  [13, { // noon
    skyTop: new THREE.Color(0x4a90d9),
    skyHorizon: new THREE.Color(0x8ac4e8),
    ambientColor: new THREE.Color(0xe8f4ff),
    ambientIntensity: 1.0,
    sunColor: new THREE.Color(0xfffae8),
    sunIntensity: 2.5,
    fogColor: new THREE.Color(0xb8d8f0),
    fogDensity: 0.003,
  }],
  [16, { // afternoon
    skyTop: new THREE.Color(0x4a85c8),
    skyHorizon: new THREE.Color(0x9ab8d8),
    ambientColor: new THREE.Color(0xf0e8d0),
    ambientIntensity: 0.9,
    sunColor: new THREE.Color(0xffdc90),
    sunIntensity: 2.0,
    fogColor: new THREE.Color(0xc0d0e8),
    fogDensity: 0.004,
  }],
  [19, { // sunset
    skyTop: new THREE.Color(0x1a2a5e),
    skyHorizon: new THREE.Color(0xff6020),
    ambientColor: new THREE.Color(0xffa060),
    ambientIntensity: 0.5,
    sunColor: new THREE.Color(0xff8030),
    sunIntensity: 1.2,
    fogColor: new THREE.Color(0xff7040),
    fogDensity: 0.01,
  }],
  [21, { // dusk
    skyTop: new THREE.Color(0x0d1030),
    skyHorizon: new THREE.Color(0x40285e),
    ambientColor: new THREE.Color(0x3050a0),
    ambientIntensity: 0.25,
    sunColor: new THREE.Color(0x8060d0),
    sunIntensity: 0.15,
    fogColor: new THREE.Color(0x201840),
    fogDensity: 0.016,
  }],
  [24, { // midnight again
    skyTop: new THREE.Color(0x05071a),
    skyHorizon: new THREE.Color(0x0d1033),
    ambientColor: new THREE.Color(0x2a3060),
    ambientIntensity: 0.15,
    sunColor: new THREE.Color(0x6080ff),
    sunIntensity: 0.02,
    fogColor: new THREE.Color(0x0d1033),
    fogDensity: 0.018,
  }],
];

export function getEnvConfig(hour: number, isRaining: boolean): EnvConfig {
  // Find surrounding keyframes
  let i = 0;
  while (i < KEYFRAMES.length - 1 && KEYFRAMES[i + 1][0] <= hour) i++;
  const [h0, c0] = KEYFRAMES[i];
  const [h1, c1] = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];
  const t = h1 === h0 ? 0 : Math.max(0, Math.min(1, (hour - h0) / (h1 - h0)));

  // Interpolate all fields
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const base = {
    skyTop: lerp3(c0.skyTop, c1.skyTop, t),
    skyHorizon: lerp3(c0.skyHorizon, c1.skyHorizon, t),
    ambientColor: lerp3(c0.ambientColor, c1.ambientColor, t),
    ambientIntensity: lerp(c0.ambientIntensity, c1.ambientIntensity),
    sunColor: lerp3(c0.sunColor, c1.sunColor, t),
    sunIntensity: lerp(c0.sunIntensity, c1.sunIntensity),
    fogColor: lerp3(c0.fogColor, c1.fogColor, t),
    fogDensity: lerp(c0.fogDensity, c1.fogDensity),
  };

  // Sun position: full orbit, rises in east, sets in west
  const angle = ((hour - 6) / 24) * Math.PI * 2;
  const sunPosition = new THREE.Vector3(
    Math.cos(angle) * 80,
    Math.sin(angle) * 60,
    -Math.sin(angle * 0.5) * 30
  );

  // Rain darkens everything
  if (isRaining) {
    const rainFactor = 0.65;
    base.ambientIntensity *= rainFactor;
    base.sunIntensity *= rainFactor * 0.7;
    base.skyTop.multiplyScalar(rainFactor);
    base.skyHorizon.multiplyScalar(rainFactor);
    base.fogDensity *= 1.8;
    base.fogColor.lerp(new THREE.Color(0x4a5a6a), 0.4);
  }

  return { ...base, sunPosition };
}
