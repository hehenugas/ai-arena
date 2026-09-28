import * as THREE from 'three';
import { state, setState, resetState } from './state';
import { buildScene, updateScene } from './scene';
import { buildEnvironment } from './environment';
import { buildWeather } from './weather';
import { setupControls } from './controls';
import { initUI } from './ui';
import './style.css';

function run(): void {
  const app  = document.getElementById('app');
  const errEl  = document.getElementById('webgl-error');

	  let renderer: THREE.WebGLRenderer;
	  try {
    renderer  = new THREE.WebGLRenderer({ antialias:	true,	powerPreference:	'high-performance' });
    if (!renderer.getContext())	throw	new Error('no context');
  } catch (_) {
    if (errEl) errEl.hidden  = false;
    return;
  }

	  const small  = window.innerWidth <	720;
	  renderer.setPixelRatio(Math.min(window.devicePixelRatio,	small ?	1.75 :	2.0));
	  renderer.setSize(window.innerWidth,	window.innerHeight);
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type  = THREE.PCFSoftShadowMap;
renderer.toneMapping  = THREE.ACESFilmicToneMapping;

	  if (app) app.appendChild(renderer.domElement);

	  const scene  = new THREE.Scene();
	  scene.background  = new THREE.Color(0x0b1230);

	  const camera  = new THREE.PerspectiveCamera(45,	window.innerWidth /	window.innerHeight,	0.1,	130);
	  camera.position.set(7.2,	3.6,	6.8);
	  camera.lookAt(0,	0.35,	0);

	  const handles  = buildScene(scene);
	  const env  = buildEnvironment(scene);
	  const weather  = buildWeather(scene,	handles.pond);

	  const { controls,	update:	controlsUpdate	}  = setupControls(camera,	renderer.domElement,	scene,	() =>	{
    setState({ lights:	!state.lights });
  });

	  const resetView  = (): void =>	{
    camera.position.set(7.2,	3.6,	6.8);
    controls.target.set(0,	0.35,	0);
  };

	  initUI({
    onTime:	(t) =>	setState({ time:	t }),
    onWind:	(v) =>	setState({ wind:	v }),
    onWeather:	(w) =>	{ setState({ weather:	w as 'clear' | 'rain' }); },
    onLights:	(on) =>	{ setState({ lights:	on }); },
    onReset:	() =>	{ resetState();	 resetView(); },
  });

	  const clock  = new THREE.Clock();
	  const reduced  = window.matchMedia('(prefers-reduced-motion:	reduce)').matches;

	  function loop(): void {
    requestAnimationFrame(loop);
    const dt  = Math.min(clock.getDelta(),	0.05);
    const time  = state.time;
    const wind  = state.wind;
    const rain  = weather.rainAmount;
    env.update(dt,	time,	wind,	rain,reduced);
    weather.update(dt,wind);
    updateScene(handles,	dt,	time,	wind,	weather.rainAmount,	state.lights,	reduced);
    controlsUpdate(dt);
    renderer.render(scene,camera);
  }

	  window.addEventListener('resize', () =>	{
    camera.aspect  = window.innerWidth /	window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,	window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,	window.innerWidth <	720 ?	1.75 :	2.0));
  });

	  // first environment pass before the first frame
	  env.update(0.016,	state.time,	state.wind,	0.0,reduced);
	  loop();
}

run();