import './style.css';
import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { WorldStore } from './state';
import { createSkySampler } from './palette';
import { createIsland } from './world/island';
import { createHouse } from './world/house';
import { createWindmill } from './world/windmill';
import { createVegetation } from './world/vegetation';
import { createPond } from './world/pond';
import { createClouds } from './world/clouds';
import { createSky } from './world/sky';
import { createRain } from './world/rain';
import { createLighting } from './systems/lighting';
import { createInteraction } from './systems/interaction';
import { createUI } from './systems/ui';

function showFallback(): void {
  const el = document.getElementById('fallback');
  if (el) el.hidden = false;
}

/** Context creation can fail transiently while a previous page is torn down, so retry. */
async function createRenderer(canvas: HTMLCanvasElement, antialias: boolean): Promise<WebGLRenderer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return new WebGLRenderer({ canvas, antialias, powerPreference: 'high-performance' });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  return null;
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) return;

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const isSmall = window.innerWidth < 700;
  const lowPower = isCoarse || isSmall;

  let renderer: WebGLRenderer | null;
  try {
    renderer = await createRenderer(canvas, !lowPower);
  } catch {
    renderer = null;
  }
  if (!renderer) {
    showFallback();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.75 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new Scene();
  scene.background = new Color(0xdcecf2);
  const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);

  const store = new WorldStore();
  const sampleSky = createSkySampler();

  const island = createIsland();
  const house = createHouse();
  const windmill = createWindmill();
  const vegetation = createVegetation();
  const pond = createPond();
  const clouds = createClouds();
  const sky = createSky();
  const rain = createRain(lowPower ? 420 : 850);
  scene.add(
    island.group,
    house.group,
    windmill.group,
    vegetation.group,
    pond.group,
    clouds.group,
    sky.group,
    rain.lines
  );

  const lighting = createLighting(scene, lowPower ? 1024 : 2048);
  const interaction = createInteraction(camera, renderer.domElement, house.group, () =>
    store.toggleLights()
  );
  createUI(store, () => interaction.resetView());

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener('change', (e) => {
    reducedMotion = e.matches;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Smoothed mirrors of the controls so rapid changes ease in, interruptibly.
  const ease = { rain: 0, wind: 0.3, lights: 0 };
  const approach = (cur: number, target: number, dt: number, rate: number) =>
    cur + (target - cur) * (1 - Math.exp(-dt * rate));

  const clock = new Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    const s = store.snapshot;

    ease.rain = approach(ease.rain, s.weather === 'rain' ? 1 : 0, dt, 1.8);
    ease.wind = approach(ease.wind, s.wind, dt, 4);
    ease.lights = approach(ease.lights, s.lightsOn ? 1 : 0, dt, 5);

    const sample = sampleSky(s.time, ease.rain);

    sky.update(s.time, ease.rain, sample);
    lighting.update(s.time, ease.rain, sample);
    island.update(elapsed, reducedMotion);
    house.update(elapsed, {
      wind: ease.wind,
      lightsT: ease.lights,
      night: sample.night,
      reducedMotion,
    });
    windmill.update(dt, ease.wind);
    vegetation.update(elapsed, ease.wind, reducedMotion);
    pond.update(dt, elapsed, ease.rain);
    clouds.update(dt, elapsed, ease.wind, ease.rain, reducedMotion);
    rain.update(dt, ease.wind, ease.rain);
    interaction.update();

    renderer.render(scene, camera);
  });
}

boot();
