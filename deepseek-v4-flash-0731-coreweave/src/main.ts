import * as THREE from 'three';
import './style.css';
import { state, setState, INITIAL_STATE } from './state';
import { computeDayCycle } from './environment/dayCycle';
import { createSky } from './environment/sky';
import { createLighting } from './environment/lighting';
import { buildWorld } from './world/builtWorld';
import { createRain } from './effects/rain';
import { createRipples } from './effects/ripples';
import { createCameraRig } from './interaction/camera';
import { attachHouseClick } from './interaction/houseClick';
import { createPanel } from './ui/panel';

function showError(message: string): void {
  const el = document.getElementById('error')!;
  el.hidden = false;
  el.innerHTML = `<div class="card"><h2>Pocket World can't start</h2><p>${message}</p></div>`;
}

function boot(): void {
  const root = document.getElementById('app')!;

  // WebGL availability check up front — never a blank page.
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    showError(
      'WebGL is not supported or is disabled in this browser. Pocket World needs WebGL to render its little island.'
    );
    return;
  }
  if (!renderer.getContext()) {
    showError(
      'WebGL could not initialize. Please enable hardware acceleration or try a different browser.'
    );
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.6 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const rig = createCameraRig(renderer.domElement, window.innerWidth, window.innerHeight);

  const sky = createSky();
  scene.add(sky);
  const lighting = createLighting(scene, new THREE.Vector3(1.2, 1.7, 0.0));
  const world = buildWorld(scene);
  scene.add(world.group);

  const rain = createRain();
  scene.add(rain.object);

  const ripples = createRipples(world.pond.surfaceY);
  scene.add(ripples.object);

  const panel = createPanel(root);
  panel.onReset(() => {
    setState({ ...INITIAL_STATE });
    rig.reset();
  });
  attachHouseClick(renderer.domElement, rig.camera, world.house, () => {
    setState({ houseLights: !state.houseLights });
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth, interruptible weather factor (0 clear → 1 raining).
  let weatherT = 0;
  let elapsed = 0;

  const clock = new THREE.Clock();
  let last = 0;

  function frame(): void {
    requestAnimationFrame(frame);

    // Time-based animation with a hard clamp on big frame deltas (e.g. after
    // returning from a background tab).
    const now = clock.getElapsedTime();
    const dt = Math.min(now - last, 0.05);
    last = now;
    elapsed += dt;

    const cycle = computeDayCycle(state.timeOfDay);
    const targetWeather = state.weather === 'rain' ? 1 : 0;
    weatherT += (targetWeather - weatherT) * Math.min(1, dt * 1.6);

    // Environment derived from state.
    lighting.update(cycle, weatherT, state.houseLights);
    sky.update(rig.camera, cycle, weatherT);

    // World motion.
    world.update(dt, elapsed, state.wind, weatherT, reduceMotion);
    world.house.userData.update(state.houseLights, cycle.night, state.wind);
    // Windmill sail speed shares the same wind state.
    world.windmill.blades.rotation.z += state.wind * dt * 2.6;
    world.pond.update(weatherT, state.wind);

    // Weather effects.
    rain.update(dt, weatherT, state.wind, ripples.onRainHit);
    ripples.update(dt, state.wind, weatherT);

    rig.update(dt);
    rig.controls.update();
    renderer.render(scene, rig.camera);
  }
  frame();

  function onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    rig.camera.aspect = w / h;
    rig.camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
}

boot();