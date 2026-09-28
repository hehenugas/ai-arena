import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

import { getState, consumeResetFlag, type AppState } from './state';
import { computeEnvironment } from './environment';
import { createIsland } from './island';
import { createClouds, createDarkClouds, updateClouds } from './clouds';
import { RainSystem, RippleSystem } from './rain';
import { setupInteraction } from './interaction';
import { createUI } from './ui';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showError(msg: string) {
  const el = document.getElementById('app')!;
  el.innerHTML = `<div id="webgl-error" style="display:flex">${msg}</div>`;
}

function init() {
  const app = document.getElementById('app')!;
  const canvas = document.createElement('canvas');
  app.appendChild(canvas);

  let ctx: WebGLRenderingContext | null = null;
  try {
    ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
  } catch { /* fall through */ }
  if (!ctx) {
    showError('WebGL is not supported on this browser. Please try a modern browser like Chrome, Firefox, or Edge.');
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const maxPixelRatio = window.innerWidth < 768 ? 1.5 : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(maxPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#88bbdd', 0.012);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
  const defaultCameraPos = new THREE.Vector3(14, 8, 14);
  const defaultTarget = new THREE.Vector3(0, 0.5, 0);
  camera.position.copy(defaultCameraPos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(defaultTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 35;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.enablePan = false;
  controls.update();

  // Sun light
  const sunLight = new THREE.DirectionalLight('#fff5dd', 1.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 30;
  sunLight.shadow.camera.left = -12;
  sunLight.shadow.camera.right = 12;
  sunLight.shadow.camera.top = 12;
  sunLight.shadow.camera.bottom = -12;
  sunLight.shadow.bias = -0.002;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight('#aabbcc', 0.5);
  scene.add(ambientLight);

  // Warm fill light from below for the rocky underside
  const fillLight = new THREE.DirectionalLight('#886644', 0.15);
  fillLight.position.set(0, -5, 0);
  scene.add(fillLight);

  // House point light (toggled by lights state)
  const houseLight = new THREE.PointLight('#ffaa44', 0, 8, 2);
  houseLight.position.set(1, 1.5, -0.5);
  scene.add(houseLight);

  // Sky gradient via a large background sphere
  const skyGeo = new THREE.SphereGeometry(80, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color('#5599cc') },
      bottomColor: { value: new THREE.Color('#aaccdd') },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Scene objects
  const island = createIsland();
  scene.add(island.group);

  const clouds = createClouds();
  scene.add(clouds.group);

  const darkClouds = createDarkClouds();
  scene.add(darkClouds.group);

  const rainSystem = new RainSystem(scene);
  const rippleSystem = new RippleSystem(
    scene,
    island.pond.position,
    1.3
  );

  setupInteraction(canvas, camera, island.house);
  createUI();

  // Smooth weather transition (0 = clear, 1 = rain)
  let weatherTransition = 0;

  const windmillBlades = island.group.userData.windmillBlades as THREE.Group;
  const treeCanopies = island.group.userData.treeCanopies as THREE.Mesh[];
  const originalTreePositions = island.group.userData.originalTreePositions as Map<string, { rx: number; rz: number }>;

  function applyState(state: AppState, dt: number) {
    const env = computeEnvironment(state.time, state.weather);

    // Sky
    (skyMat.uniforms.topColor.value as THREE.Color).lerp(env.skyTop, dt * 3);
    (skyMat.uniforms.bottomColor.value as THREE.Color).lerp(env.skyBottom, dt * 3);

    // Fog matches sky bottom
    (scene.fog as THREE.FogExp2).color.lerp(env.skyBottom, dt * 3);

    // Sun
    sunLight.color.lerp(env.sunColor, dt * 3);
    sunLight.intensity += (env.sunIntensity - sunLight.intensity) * dt * 3;
    const sunDir = env.sunDirection;
    sunLight.position.set(sunDir.x * 15, sunDir.y * 15, sunDir.z * 15);

    // Ambient
    ambientLight.color.lerp(env.ambientColor, dt * 3);
    ambientLight.intensity += (env.ambientIntensity - ambientLight.intensity) * dt * 3;

    // Tone mapping exposure adjusts with nighttime
    const targetExposure = 1.0 - env.nightFactor * 0.4;
    renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * dt * 3;

    // Weather transition
    const targetWeather = state.weather === 'rain' ? 1 : 0;
    weatherTransition += (targetWeather - weatherTransition) * dt * 2;
    weatherTransition = THREE.MathUtils.clamp(weatherTransition, 0, 1);

    // Windows
    const windowColor = state.lightsOn ? new THREE.Color('#ffaa33') : new THREE.Color('#88ccee');
    const emissiveColor = state.lightsOn ? new THREE.Color('#ffaa33') : new THREE.Color('#000000');
    const emissiveIntensity = state.lightsOn ? (0.5 + env.nightFactor * 1.5) : 0;

    for (const win of island.windows) {
      const mat = win.material as THREE.MeshStandardMaterial;
      mat.color.lerp(windowColor, dt * 5);
      mat.emissive.lerp(emissiveColor, dt * 5);
      mat.emissiveIntensity += (emissiveIntensity - mat.emissiveIntensity) * dt * 5;
    }

    // House point light
    const targetLightIntensity = state.lightsOn ? (0.3 + env.nightFactor * 1.2) : 0;
    houseLight.intensity += (targetLightIntensity - houseLight.intensity) * dt * 5;

    // Windmill
    if (!prefersReducedMotion) {
      const windSpeed = state.wind * 2;
      windmillBlades.rotation.z += windSpeed * dt;
    }

    // Tree sway
    if (!prefersReducedMotion && treeCanopies) {
      const time = performance.now() * 0.001;
      for (const canopy of treeCanopies) {
        const orig = originalTreePositions.get(canopy.uuid);
        if (!orig) continue;
        const swayAmount = state.wind * 0.08;
        canopy.rotation.x = orig.rx + Math.sin(time * 1.5 + canopy.id * 0.7) * swayAmount;
        canopy.rotation.z = orig.rz + Math.cos(time * 1.2 + canopy.id * 1.3) * swayAmount * 0.7;
      }
    }

    // Clouds
    updateClouds(clouds.group, darkClouds.group, dt, state.wind * 3, state.weather, weatherTransition);

    // Rain
    rainSystem.update(dt, state.wind * 3, state.weather === 'rain', weatherTransition);
    rippleSystem.update(dt, state.weather === 'rain', weatherTransition);
  }

  // Reset camera handled in the animation loop via consumeResetFlag

  // Resize
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // Animation loop
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    // Clamp to prevent jumps from background tabs
    dt = Math.min(dt, 0.1);

    if (consumeResetFlag()) {
      camera.position.copy(defaultCameraPos);
      controls.target.copy(defaultTarget);
    }

    controls.update();
    applyState(getState(), dt);
    renderer.render(scene, camera);
  }

  animate();
}

init();
