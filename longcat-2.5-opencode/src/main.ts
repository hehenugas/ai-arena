import './style.css';
import * as THREE from 'three';
import { AppState, createState, DEFAULT_STATE } from './state';
import { createIsland } from './scene/island';
import { createHouse, updateHouseLights } from './scene/house';
import { createWindmill } from './scene/windmill';
import { createVegetation } from './scene/vegetation';
import { createPond } from './scene/pond';
import { createClouds } from './scene/clouds';
import { createProps } from './scene/props';
import { SkySystem } from './environment/sky';
import { RainSystem } from './environment/rain';
import { RippleSystem } from './environment/ripples';
import { setupControls } from './interaction/controls';
import { setupPicker } from './interaction/picker';
import { setupUI } from './ui/panel';

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

function showWebGLError(): void {
  const errorDiv = document.getElementById('webgl-error');
  if (errorDiv) errorDiv.classList.remove('hidden');
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  if (canvas) canvas.style.display = 'none';
}

function main(): void {
  if (!checkWebGL()) {
    showWebGLError();
    return;
  }

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const uiContainer = document.getElementById('ui')!;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(14, 6, 14);
  camera.lookAt(0, 0, 0);

  const state = createState();

  const island = createIsland();
  scene.add(island);

  const house = createHouse();
  house.position.set(2, 0.3, 1);
  scene.add(house);

  const windmill = createWindmill();
  windmill.position.set(-3, 0.3, -2);
  scene.add(windmill);

  const vegetation = createVegetation();
  scene.add(vegetation);

  const pond = createPond();
  pond.position.set(-1, 0.35, 3);
  scene.add(pond);

  const clouds = createClouds();
  scene.add(clouds);

  const props = createProps();
  scene.add(props);

  const skySystem = new SkySystem(scene);
  const rainSystem = new RainSystem(scene);
  const rippleSystem = new RippleSystem(pond);

  const controls = setupControls(camera, canvas);
  setupPicker(camera, house, state);

  setupUI(uiContainer, state, {
    onReset: () => {
      Object.assign(state, DEFAULT_STATE);
      controls.reset();
      updateHouseLights(house, state.houseLights);
    },
  }, house);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let lastHouseLights = state.houseLights;

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    skySystem.update(state, delta);
    rainSystem.update(state, delta, elapsed);
    rippleSystem.update(state, delta);

    const blades = windmill.userData.blades as THREE.Group;
    if (blades) {
      blades.rotation.z += state.wind * delta * 5;
    }

    const trees = vegetation.userData.trees as THREE.Group[];
    if (trees) {
      trees.forEach((tree, i) => {
        tree.rotation.z = Math.sin(elapsed * 2 + i * 1.5) * 0.03 * state.wind;
        tree.rotation.x = Math.cos(elapsed * 1.5 + i) * 0.02 * state.wind;
      });
    }

    clouds.children.forEach((cloud, i) => {
      cloud.position.x += state.wind * delta * (1 + i * 0.2);
      if (cloud.position.x > 20) cloud.position.x = -20;
    });

    island.position.y = Math.sin(elapsed * 0.5) * 0.15;
    island.rotation.y = Math.sin(elapsed * 0.1) * 0.02;

    if (state.houseLights !== lastHouseLights) {
      updateHouseLights(house, state.houseLights);
      lastHouseLights = state.houseLights;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

main();
