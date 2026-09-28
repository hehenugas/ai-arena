import * as THREE from 'three';
import type { WorldState } from './state';
import type { Cottage } from './house';
import type { Pond } from './pond';
import { createClouds } from './clouds';
import { createRain } from './rain';

const skyStops = [
  { hour: 0, color: '#19253e' },
  { hour: 4.5, color: '#26354d' },
  { hour: 6, color: '#d28c72' },
  { hour: 8.5, color: '#bcd8d5' },
  { hour: 12, color: '#a9d4df' },
  { hour: 15.5, color: '#f1d6ad' },
  { hour: 17.4, color: '#e99973' },
  { hour: 19.3, color: '#4c496c' },
  { hour: 21, color: '#202b49' },
  { hour: 24, color: '#19253e' },
];
const skyTopStops = [
  { hour: 0, color: '#10172d' },
  { hour: 4.5, color: '#26344e' },
  { hour: 6, color: '#a46260' },
  { hour: 8.5, color: '#79a9b5' },
  { hour: 12, color: '#659db2' },
  { hour: 15.5, color: '#c38a73' },
  { hour: 17.4, color: '#b96f61' },
  { hour: 19.3, color: '#34334e' },
  { hour: 21, color: '#151c35' },
  { hour: 24, color: '#10172d' },
];

const transitionColor = new THREE.Color();

function colorAtStops(hour: number, stops: { hour: number; color: string }[], target: THREE.Color): THREE.Color {
  for (let i = 0; i < stops.length - 1; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];
    if (hour >= from.hour && hour <= to.hour) {
      const amount = (hour - from.hour) / (to.hour - from.hour);
      return target.set(from.color).lerp(transitionColor.set(to.color), THREE.MathUtils.smoothstep(amount, 0, 1));
    }
  }
  return target.set(stops[0].color);
}

function skyColorAt(hour: number, target: THREE.Color): THREE.Color {
  return colorAtStops(hour, skyStops, target);
}

function daylightAt(hour: number): number {
  return THREE.MathUtils.clamp(Math.sin(((hour - 6) / 12) * Math.PI), 0, 1);
}

export function createEnvironment(scene: THREE.Scene, pond: Pond, house: Cottage): { update: (delta: number, time: number, state: WorldState, motionScale: number, hour: number, wind: number) => void } {
  const hemisphere = new THREE.HemisphereLight('#dce9e4', '#6a664e', 0.95);
  const sunWhite = new THREE.Color('#ffffff');
  const sunWarm = new THREE.Color('#ffd19a');
  const nightHemisphere = new THREE.Color('#7d91b2');
  const dayHemisphere = new THREE.Color('#dbe9e1');
  const nightGround = new THREE.Color('#343f4d');
  const dayGround = new THREE.Color('#777052');
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#ffe0ac', 2.15);
  sun.position.set(-5, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1280, 1280);
  sun.shadow.camera.left = -5.5;
  sun.shadow.camera.right = 5.5;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -5;
  sun.shadow.camera.near = 0.2;
  sun.shadow.camera.far = 22;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  const sunBallMaterial = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 1, depthWrite: false });
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), sunBallMaterial);
  scene.add(sunBall);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: '#e1e3d3', transparent: true, opacity: 0, depthWrite: false });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), moonMaterial);
  scene.add(moon);

  const starPositions: number[] = [];
  let randomState = 829;
  const random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  for (let i = 0; i < 150; i += 1) {
    const theta = random() * Math.PI * 2;
    const phi = 0.18 + random() * Math.PI * 0.68;
    const radius = 17 + random() * 2;
    starPositions.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi) + 5, radius * Math.sin(phi) * Math.sin(theta));
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: '#fff1d1', size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  const clouds = createClouds(scene);
  const rain = createRain(scene);
  const baseSky = new THREE.Color();
  const clearSky = new THREE.Color();
  const rainSky = new THREE.Color('#77858a');
  const topSky = new THREE.Color();
  const horizonGlow = new THREE.Color();
  const lowerSky = new THREE.Color();
  const whiteHorizon = new THREE.Color('#fff8e9');
  let nextSkyUpdate = 0;
  let rainAmount = 0;

  return {
    update(delta, time, state, motionScale, hour, wind) {
      const day = daylightAt(hour);
      const isRaining = state.weather === 'rain' ? 1 : 0;
      rainAmount = THREE.MathUtils.damp(rainAmount, isRaining, 2.2, delta);

      skyColorAt(hour, clearSky);
      baseSky.copy(clearSky).lerp(rainSky, rainAmount * 0.62);
      if (time >= nextSkyUpdate) {
        nextSkyUpdate = time + 0.08;
        colorAtStops(hour, skyTopStops, topSky).lerp(rainSky, rainAmount * 0.68);
        horizonGlow.copy(baseSky).lerp(whiteHorizon, day * 0.12);
        lowerSky.copy(baseSky).lerp(topSky, 0.18).multiplyScalar(0.82);
        document.documentElement.style.setProperty('--sky-top', topSky.getStyle());
        document.documentElement.style.setProperty('--sky-horizon', horizonGlow.getStyle());
        document.documentElement.style.setProperty('--sky-bottom', lowerSky.getStyle());
      }
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(baseSky);
      }

      const solarAngle = ((hour - 12) / 12) * (Math.PI / 2);
      const solarX = Math.sin(solarAngle);
      const solarY = Math.max(-0.25, Math.sin(((hour - 6) / 12) * Math.PI));
      const solarZ = 0.46;
      sun.position.set(solarX * 10, solarY * 10 + 2, solarZ * 10);
      sun.target.position.set(0, 0, 0);
      sun.intensity = (0.22 + day * 2.45) * (1 - rainAmount * 0.54);
      sun.color.copy(sunWhite).lerp(sunWarm, 1 - day * 0.55);
      hemisphere.intensity = 1.12 + day * 0.28;
      hemisphere.color.copy(nightHemisphere).lerp(dayHemisphere, day);
      hemisphere.groundColor.copy(nightGround).lerp(dayGround, day);

      const skyRadius = 15;
      sunBall.position.set(solarX * skyRadius, Math.max(-1.8, solarY * skyRadius + 0.3), solarZ * skyRadius);
      sunBallMaterial.opacity = THREE.MathUtils.smoothstep(day, 0.02, 0.38);
      moon.position.set(-solarX * skyRadius, Math.max(1.5, -solarY * skyRadius + 1.4), -solarZ * skyRadius);
      moonMaterial.opacity = (1 - THREE.MathUtils.smoothstep(day, 0.03, 0.24)) * 0.84;
      starMaterial.opacity = (1 - THREE.MathUtils.smoothstep(day, 0.04, 0.48)) * 0.86;

      clouds.update(delta, wind, motionScale, day, rainAmount);
      rain.update(delta, wind, rainAmount, time);
      pond.updateRipples(time, rainAmount);
      house.updateLights(delta, state.lights);
    },
  };
}
