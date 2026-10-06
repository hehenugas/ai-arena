import * as THREE from 'three';
import type { DayCycle } from './dayCycle';
import { smoothstep, mulberry32 } from '../utils/noise';
import { makeRadialTexture } from '../utils/textures';

const SKY_RADIUS = 420;
const STAR_RADIUS = 400;

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenithDay;
  uniform vec3 uHorizonDay;
  uniform vec3 uZenithNight;
  uniform vec3 uHorizonNight;
  uniform vec3 uZenithTwilight;
  uniform vec3 uHorizonTwilight;
  uniform vec3 uSunDir;
  uniform vec3 uSunGlowColor;
  uniform float uDay;
  uniform float uNight;
  uniform float uTwilight;
  uniform float uSunGlow;
  uniform float uWeather;

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -0.14, 1.0);

    vec3 dayCol = mix(uHorizonDay, uZenithDay, smoothstep(0.0, 0.75, h));
    vec3 nightCol = mix(uHorizonNight, uZenithNight, smoothstep(-0.14, 0.5, h));
    vec3 twilightCol = mix(uHorizonTwilight, uZenithTwilight, smoothstep(0.0, 0.55, h));

    vec3 col = dayCol * uDay + nightCol * uNight + twilightCol * uTwilight;

    // Warm glow hugging the horizon during sunrise/sunset.
    float hb = pow(1.0 - abs(h), 5.0);
    col += uHorizonTwilight * hb * uTwilight * 0.7;

    // Soft halo + hot core around the sun itself.
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    float glow = pow(sd, 4.0) * 0.4 + pow(sd, 26.0) * 1.6;
    col += uSunGlowColor * glow * uSunGlow;

    // Raining: mute the whole sky a little toward slate.
    col = mix(col, col * vec3(0.82, 0.86, 0.94) + vec3(0.10, 0.12, 0.15), uWeather * 0.7);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface Sky extends THREE.Group {
  update: (camera: THREE.PerspectiveCamera, cycle: DayCycle, weather: number) => void;
}

export function createSky(): Sky {
  const sky = new THREE.Group() as Sky;

  // --- Gradient dome -------------------------------------------------------
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, 28, 18),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        uZenithDay: { value: new THREE.Color('#4f9fe8') },
        uHorizonDay: { value: new THREE.Color('#cfe9ff') },
        uZenithNight: { value: new THREE.Color('#070d26') },
        uHorizonNight: { value: new THREE.Color('#101d38') },
        uZenithTwilight: { value: new THREE.Color('#3d4a76') },
        uHorizonTwilight: { value: new THREE.Color('#ff9a56') },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunGlowColor: { value: new THREE.Color('#ffd9a0') },
        uDay: { value: 1 },
        uNight: { value: 0 },
        uTwilight: { value: 0 },
        uSunGlow: { value: 1 },
        uWeather: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  dome.renderOrder = -10;
  sky.add(dome);

  // --- Stars ---------------------------------------------------------------
  const rng = mulberry32(20240517);
  const starCount = 750;
  const pos = new Float32Array(starCount * 3);
  const col = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const x = r * Math.cos(theta);
    const y = Math.abs(u) * 0.92 - 0.08; // bias upward a touch
    const z = r * Math.sin(theta);
    pos[i * 3] = x * STAR_RADIUS;
    pos[i * 3 + 1] = y * STAR_RADIUS;
    pos[i * 3 + 2] = z * STAR_RADIUS;
    const warm = rng();
    col[i * 3] = 0.85 + warm * 0.15;
    col[i * 3 + 1] = 0.88 + warm * 0.12;
    col[i * 3 + 2] = 1.0;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const starMat = new THREE.PointsMaterial({
    size: 1.7,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -9;
  sky.add(stars);

  // --- Sun / moon discs -----------------------------------------------------
  const sunMap = makeRadialTexture('rgba(255,248,225,1)', 'rgba(255,214,140,0)');
  const sunMat = new THREE.SpriteMaterial({
    map: sunMap,
    color: new THREE.Color('#fff3cf'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const sunSprite = new THREE.Sprite(sunMat);
  sunSprite.scale.set(26, 26, 1);
  sunSprite.renderOrder = 5;
  sky.add(sunSprite);

  const moonMap = makeRadialTexture('rgba(238,242,255,1)', 'rgba(210,220,255,0)');
  const moonMat = new THREE.SpriteMaterial({
    map: moonMap,
    color: new THREE.Color('#e9edff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const moonSprite = new THREE.Sprite(moonMat);
  moonSprite.scale.set(15, 15, 1);
  moonSprite.renderOrder = 5;
  sky.add(moonSprite);

  interface SkyUniforms {
    uZenithDay: { value: THREE.Color };
    uHorizonDay: { value: THREE.Color };
    uZenithNight: { value: THREE.Color };
    uHorizonNight: { value: THREE.Color };
    uZenithTwilight: { value: THREE.Color };
    uHorizonTwilight: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunGlowColor: { value: THREE.Color };
    uDay: { value: number };
    uNight: { value: number };
    uTwilight: { value: number };
    uSunGlow: { value: number };
    uWeather: { value: number };
  }
  // Keep references to the uniform *objects* (not their current values) so the
  // shader sees the day/night/twilight changes every frame.
  const U = (dome.material as THREE.ShaderMaterial).uniforms as unknown as SkyUniforms;

  sky.update = (camera: THREE.PerspectiveCamera, cycle: DayCycle, weather: number) => {
    const day = cycle.day;
    const night = cycle.night;
    const twilight = cycle.twilight;

    U.uSunDir.value.copy(cycle.sunDir);
    U.uDay.value = day;
    U.uNight.value = night;
    U.uTwilight.value = twilight;
    U.uWeather.value = weather;
    // Bright halo during the day, huge warm bloom at sunset, faint at night.
    U.uSunGlow.value = twilight * 0.85 + day * 0.14 + night * 0.02;

    starMat.opacity = night * (1 - weather * 0.55);

    // Sun disc: fully up during the day, sinks and warms toward the horizon.
    const sunVis = smoothstep(-0.03, 0.02, cycle.elevation);
    sunMat.opacity = sunVis * (day * 0.85 + twilight * 0.95) * (1 - weather * 0.6);
    sunMat.color.setHSL(0.09, twilight * 0.45 + 0.02, 0.92 + twilight * 0.05);

    // Moon disc opposite the sun, visible at night.
    const moonVis = smoothstep(-0.02, 0.05, cycle.moonElevation);
    moonMat.opacity = moonVis * night * 0.85;

    // Sprites orbit with the camera so they always sit on the dome.
    const cam = camera.position;
    sunSprite.position.set(
      cam.x + cycle.sunDir.x * SKY_RADIUS * 0.92,
      cam.y + cycle.sunDir.y * SKY_RADIUS * 0.92,
      cam.z + cycle.sunDir.z * SKY_RADIUS * 0.92
    );
    moonSprite.position.set(
      cam.x + cycle.moonDir.x * SKY_RADIUS * 0.92,
      cam.y + cycle.moonDir.y * SKY_RADIUS * 0.92,
      cam.z + cycle.moonDir.z * SKY_RADIUS * 0.92
    );
  };

  return sky;
}