import * as THREE from 'three';
import { createScene, resizeScene } from './scene';
import { EnvironmentController } from './environment';
import { StateStore } from './state';
import { createUI } from './ui';
import { setupHouseInteraction } from './interaction';
import './style.css';

const app = document.querySelector<HTMLElement>('#app');

if (!app) throw new Error('Pocket World mount element was not found.');

const store = new StateStore();
const sceneLayer = document.createElement('div');
sceneLayer.className = 'scene-layer';
app.appendChild(sceneLayer);

let refs;
try {
  refs = createScene(sceneLayer);
} catch (error) {
  console.error(error);
  app.innerHTML = `<div class="webgl-error"><div><span class="error-mark">!</span><h1>Pocket World could not open</h1><p>This diorama needs WebGL. Try a current browser with hardware acceleration enabled.</p></div></div>`;
  throw error;
}

const ui = createUI(app, store);
const environment = new EnvironmentController();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const toggleLights = () => store.update({ houseLights: !store.state.houseLights });
const teardownInteraction = setupHouseInteraction(refs, toggleLights);
const teardownReset = store.onReset(() => {
  refs.camera.position.set(13.2, 10.4, 14.4);
  refs.camera.lookAt(0, 0.9, 0);
  refs.controls.target.set(0, 0.9, 0);
  refs.controls.update();
});

const onResize = () => resizeScene(refs, window.innerWidth, window.innerHeight);
window.addEventListener('resize', onResize);
onResize();

const onMotionPreferenceChange = () => document.documentElement.classList.toggle('reduced-motion', reducedMotion.matches);
reducedMotion.addEventListener('change', onMotionPreferenceChange);
onMotionPreferenceChange();

let animationFrame = 0;
const animate = () => {
  animationFrame = window.requestAnimationFrame(animate);
  refs.timer.update();
  const delta = Math.min(refs.timer.getDelta(), 0.05);
  environment.update(refs, store.state, delta, reducedMotion.matches);
  refs.controls.update();
  refs.renderer.render(refs.scene, refs.camera);
};
animate();

window.addEventListener('beforeunload', () => {
  window.cancelAnimationFrame(animationFrame);
  teardownInteraction();
  teardownReset();
  window.removeEventListener('resize', onResize);
});

void ui;
