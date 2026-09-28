import * as THREE from 'three';
import { store, type Smooth, type UpdaterCtx, type WorldPiece } from './state';
import { createDayCycle, sampleCycle } from './palette';
import { clamp, damp } from './util';
import { createIsland } from './world/island';
import { createHouse } from './world/house';
import { createWindmill } from './world/windmill';
import { createTrees } from './world/trees';
import { createPond } from './world/pond';
import { createProps } from './world/props';
import { createClouds } from './world/clouds';
import { createSky } from './env/sky';
import { createLighting } from './env/lighting';
import { createRain } from './env/rain';
import { createCameraRig } from './interaction/camera';
import { initHousePick } from './interaction/housePick';
import { initPanel } from './ui/panel';

function showFatal(): void {
  const loading = document.getElementById('loading');
  const error = document.getElementById('webgl-error');
  const panel = document.getElementById('panel');
  if (loading) loading.remove();
  if (error) error.hidden = false;
  if (panel) panel.style.display = 'none';
}

function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.style.transition = 'opacity 0.5s ease';
  loading.style.opacity = '0';
  window.setTimeout(() => loading.remove(), 550);
}

function boot(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) {
    showFatal();
    return;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no WebGL context');
  } catch {
    showFatal();
    return;
  }

  const small =
    window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = rmq.matches;
  rmq.addEventListener('change', (e) => {
    reduced = e.matches;
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showFatal();
  });

  // ---- scene assembly -----------------------------------------------------------
  const scene = new THREE.Scene();
  const rig = createCameraRig(canvas);
  scene.add(rig.camera);
  const lighting = createLighting(scene, small);
  const sky = createSky(scene);

  // everything grounded on the island shares one group so the whole world bobs
  const world = new THREE.Group();
  scene.add(world);

  const pieces: WorldPiece[] = [
    createIsland(),
    createHouse(),
    createWindmill(),
    createTrees(),
    createPond(),
    createProps(),
  ];
  for (const p of pieces) world.add(p.group);
  const clouds = createClouds();
  const rain = createRain(scene);
  scene.add(clouds.group);

  const house = pieces[1];
  initHousePick(canvas, rig.camera, house.group, () => {
    store.set({ lightsOn: !store.get().lightsOn });
  });

  initPanel(() => {
    rig.resetView(reduced);
  });

  // ---- resize -------------------------------------------------------------------
  const onResize = () => {
    rig.camera.aspect = window.innerWidth / window.innerHeight;
    rig.camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);
  onResize();

  // ---- main loop ------------------------------------------------------------------
  const clock = new THREE.Clock();
  let elapsed = 0;
  let firstFrame = false;
  const smooth: Smooth = {
    time: store.get().timeOfDay,
    weatherT: 0,
    wind: store.get().wind,
    lightT: 0,
  };
  const cycle = createDayCycle();
  let ctx: UpdaterCtx;

  renderer.setAnimationLoop(() => {
    const dt = clamp(clock.getDelta(), 0, 0.05); // background tabs can't jump the world
    elapsed += dt;

    const state = store.get();
    smooth.time = damp(smooth.time, state.timeOfDay, 5, dt);
    smooth.weatherT = damp(smooth.weatherT, state.weather === 'rain' ? 1 : 0, 1.8, dt);
    smooth.wind = damp(smooth.wind, state.wind, 3.5, dt);
    smooth.lightT = damp(smooth.lightT, state.lightsOn ? 1 : 0, 5, dt);

    sampleCycle(smooth.time / 60, smooth.weatherT, cycle);
    lighting.update(cycle);
    sky.update(cycle, dt, smooth.weatherT, reduced);

    world.position.y = Math.sin(elapsed * 0.45) * (reduced ? 0.03 : 0.16);

    ctx = { dt, elapsed, state, smooth, cycle, reduced };
    for (const p of pieces) p.update?.(ctx);
    clouds.update?.(ctx);
    rain.update(ctx);

    rig.update(dt);
    renderer.render(scene, rig.camera);

    if (!firstFrame) {
      firstFrame = true;
      hideLoading();
    }
  });

  // Dev-only hook used by the automated smoke test; stripped from production builds.
  if (import.meta.env.DEV) {
    (window as unknown as { __pw?: object }).__pw = { store, camera: rig.camera, scene };
  }
}

boot();
