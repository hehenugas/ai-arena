import * as THREE from 'three';
import { WorldState } from './state';
import { createScene, SceneHandles, defaultState } from './scene';
import { initUI, UIHandles } from './ui';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function boot(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const loading = document.getElementById('loading')!;
  const errorBox = document.getElementById('webgl-error')!;

  if (!webglAvailable()) {
    loading.hidden = true;
    errorBox.hidden = false;
    return;
  }

  try {
    run(canvas, loading);
  } catch (err) {
    console.error(err);
    loading.hidden = true;
    errorBox.hidden = false;
  }
}

function run(canvas: HTMLCanvasElement, loading: HTMLElement): void {
  let state: WorldState = defaultState();

  const onHouseToggle = (): void => {
    state = { ...state, lightsOn: !state.lightsOn };
    handles.scene.setState(state);
    handles.ui.sync(state);
  };

  const handles: { scene: SceneHandles; ui: UIHandles } = {} as never;

  handles.scene = createScene(canvas, state, onHouseToggle);
  handles.ui = initUI(state);
  handles.ui.sync(state);

  handles.ui.onTime((minutes) => {
    state = { ...state, time: minutes };
    handles.scene.setState(state);
    handles.ui.sync(state);
  });

  handles.ui.onQuickTime((minutes) => {
    state = { ...state, time: minutes };
    handles.scene.setState(state);
    handles.ui.sync(state);
  });

  handles.ui.onWeather((w) => {
    state = { ...state, weather: w };
    handles.scene.setState(state);
    handles.ui.sync(state);
  });

  handles.ui.onWind((v) => {
    state = { ...state, wind: v };
    handles.scene.setState(state);
    handles.ui.sync(state);
  });

  handles.ui.onLights((on) => {
    state = { ...state, lightsOn: on };
    handles.scene.setState(state);
    handles.ui.sync(state);
  });

  handles.ui.onReset(() => {
    state = defaultState();
    handles.scene.setState(state);
    handles.scene.resetCamera();
    handles.ui.sync(state);
  });

  // ---- main loop: time-based, clamped deltas ----
  const clock = new THREE.Clock();

  rendererLoop();

  function rendererLoop(): void {
    requestAnimationFrame(rendererLoop);
    const dt = Math.min(clock.getDelta(), 0.05); // clamp background-tab jumps
    if (dt <= 0) return; // hidden tab: rAF is throttled anyway
    handles.scene.setState(state);
    handles.scene.tick(dt);
  }

  // hide loading overlay once the first frames are in
  requestAnimationFrame(() => requestAnimationFrame(() => loading.remove()));

  // expose a small debug hook (used by automated verification, harmless in prod)
  (window as unknown as { __pw: object }).__pw = {
    get state(): WorldState {
      return state;
    },
    env: () => handles.scene.debugEnv(),
    toggleLights: onHouseToggle,
    /** Manual frame advance for automated verification when rAF is throttled. */
    step: (dt = 0.05) => {
      handles.scene.setState(state);
      handles.scene.tick(dt);
    },
    /** Screen position of the house center (for click tests). */
    project: () => handles.scene.projectHouse(),
  };
}

boot();
