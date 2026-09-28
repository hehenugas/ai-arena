import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WorldState, DEFAULTS, clamp01, lerp, QUALITY } from './state';
import { sampleDay, registerColor, pixelRatioCap } from './palette';
import { buildSky } from './sky';
import { radialTexture } from './skyTextures';
import { buildWorld } from './world';
import { buildWeather } from './weather';

export const CAMERA_TARGET = new THREE.Vector3(0.5, 1.5, 0);
const CAM_POS = new THREE.Vector3(46, 30, 53);
const MIN_DIST = 32;
const MAX_DIST = 85;
const MAX_POLAR = Math.PI * 0.72; // slightly below horizontal — shows underside

export interface SceneHandles {
  setState(s: WorldState): void;
  /** Advance the world by `dt` seconds (clamped upstream). */
  tick(dt: number): void;
  resetCamera(): void;
  dispose(): void;
  /** Pixel coords of the house hitbox center projected to screen, or null. */
  projectHouse(): { x: number; y: number } | null;
  /** Debug/testing hook: current smoothed environment values. */
  debugEnv(): { duskiness: number; rain: number; storm: number };
}

export function createScene(
  canvas: HTMLCanvasElement,
  initial: WorldState,
  onHouseToggle: () => void,
): SceneHandles {
  registerColor(THREE.Color);

  /* ================= renderer ================= */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  /* ================= scene & camera ================= */
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbccfe0, 90, 340);

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.5,
    900,
  );
  camera.position.copy(CAM_POS);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = MIN_DIST;
  controls.maxDistance = MAX_DIST;
  controls.maxPolarAngle = MAX_POLAR;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.9;
  controls.update();

  /* ================= lights ================= */
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(QUALITY === 'high' ? 2048 : 1024, QUALITY === 'high' ? 2048 : 1024);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 160;
  const S = 34;
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xc4d9ec, 0x5f7a4a, 0.6);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x94a0b4, 0.5);
  scene.add(ambient);

  // soft fill from the opposite side keeps shadowed faces readable
  const fill = new THREE.DirectionalLight(0xbdd4ee, 0.35);
  fill.position.set(-30, 18, -24);
  scene.add(fill);

  /* ================= world ================= */
  const radial = radialTexture(128);
  const cloudTex = radial;
  const sky = buildSky(radial, cloudTex);
  scene.add(sky.group);

  const world = buildWorld();
  scene.add(world.group);

  const weather = buildWeather();
  scene.add(weather.group);

  /* ================= raycast for house clicks ================= */
  const raycaster = new THREE.Raycaster();
  const pointerDown = { x: 0, y: 0, t: 0, id: -1 };

  const onPointerDown = (e: PointerEvent): void => {
    pointerDown.x = e.clientX;
    pointerDown.y = e.clientY;
    pointerDown.t = performance.now();
    pointerDown.id = e.pointerId;
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== pointerDown.id) return;
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - pointerDown.t;
    // a click/tap: small movement, quick press
    if (dist > 8 || dt > 550) return;

    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(world.houseHitbox, false);
    if (hits.length > 0) onHouseToggle();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  /* ================= smooth env state ================= */
  // Everything visual eases toward its target so slider jumps feel silky and
  // rapid control changes never fight each other.
  const env = {
    duskiness: 0,
    rain: 0,
    storm: 0,
  };
  const target = { duskiness: 0, rain: 0, storm: 0 };

  let state: WorldState = { ...initial };
  let reducedMotion = false;
  let windRef = state.wind;

  const day = sampleDay(state.time);
  applyDayImmediate();

  function applyDayImmediate(): void {
    // start visual state exactly at the initial time (no visible transition)
    env.duskiness = day.duskiness;
    env.rain = state.weather === 'rain' ? 1 : 0;
    env.storm = env.rain;
  }

  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const skyColorMix = new THREE.Color();
  const stormTint = new THREE.Color(0x4a5568);

  function applyEnvironment(dt: number): void {
    const d = sampleDay(state.time);

    // ease visual params toward targets
    const k = 1 - Math.exp(-dt * 3.2); // smooth ~0.3s time constant
    env.duskiness += (d.duskiness - env.duskiness) * k;
    target.rain = state.weather === 'rain' ? 1 : 0;
    env.rain += (target.rain - env.rain) * (1 - Math.exp(-dt * 2.4));
    env.storm += (env.rain - env.storm) * (1 - Math.exp(-dt * 1.6));

    // ---- sun / moon positions: arc across the sky ----
    const dayT = state.time / 1440;
    const sunAngle = (dayT - 0.25) * Math.PI * 2; // 06:00 → rise, 18:00 → set
    const sunH = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    sunDir.set(sunX * 0.9, sunH, -0.42).normalize();
    moonDir.copy(sunDir).multiplyScalar(-1);

    const sunUp = clamp01(sunH * 4 + 0.35); // fade near horizon
    const sunI = d.sunIntensity * sunUp * (1 - env.storm * 0.55);

    sun.position.copy(sunDir).multiplyScalar(70);
    sun.target.position.set(0, 0, 0);
    sun.color.setHex(d.sunColor);
    sun.intensity = sunI;

    sky.setSunPos(sunDir);
    sky.setSunOpacity(clamp01(sunUp * 1.1 - env.storm * 0.75));
    sky.setSunColor(d.sunColor);
    // sun disc grows warmer & slightly bigger near the horizon
    const low = 1 - clamp01(sunH * 2.2);
    sky.setSunScale(1 + low * 0.5);

    const moonUp = clamp01(-sunH * 4 + 0.35);
    sky.setMoonPos(moonDir);
    sky.setMoonOpacity(clamp01(moonUp) * (1 - env.storm * 0.8));

    // ---- sky, fog, background ----
    skyColorMix.setHex(d.fog);
    if (env.storm > 0) skyColorMix.lerp(stormTint, env.storm * 0.4);
    sky.setColors(d.zenith, d.horizon, skyColorMix.getHex(), env.duskiness);

    const fogCol = new THREE.Color(d.fog).lerp(new THREE.Color(0x77808f), env.storm * 0.45);
    (scene.fog as THREE.Fog).color.copy(fogCol);
    (scene.fog as THREE.Fog).near = lerp(90, 55, env.storm);
    (scene.fog as THREE.Fog).far = lerp(340, 210, env.storm);

    // ---- lights ----
    hemi.color.setHex(d.hemisphere);
    hemi.groundColor.setHex(0x5f7a4a);
    hemi.intensity = d.hemiIntensity * (1 - env.storm * 0.3);
    ambient.color.setHex(d.ambient);
    ambient.intensity = d.ambientIntensity * (1 - env.storm * 0.25);
    fill.intensity = 0.35 * (1 - env.duskiness * 0.7);
    renderer.toneMappingExposure = lerp(1.0, 0.92, env.duskiness) * (1 - env.storm * 0.08);

    // ---- stars ----
    const night = clamp01(env.duskiness * 1.2 - 0.25);
    sky.setStarOpacity(night * (1 - env.storm * 0.85));

    // ---- world materials & house lights ----
    world.updateMaterials(env.duskiness, env.storm);
    world.setHouseLights(state.lightsOn, env.duskiness);

    // ---- weather fx ----
    weather.update(dt, 0, env.rain, windRef);
  }

  /* ================= per-frame ================= */
  let elapsed = 0;

  function tick(dt: number): void {
    elapsed += dt;
    applyEnvironment(dt);

    sky.updateClouds(windRef, dt, elapsed, reducedMotion);
    world.update(dt, elapsed, windRef, reducedMotion);
    controls.update();
    renderer.render(scene, camera);
  }

  /* ================= resize ================= */
  const onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
  };
  window.addEventListener('resize', onResize);

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = mq.matches;
  const onMq = (): void => {
    reducedMotion = mq.matches;
  };
  mq.addEventListener?.('change', onMq);

  return {
    tick,

    setState(s: WorldState): void {
      const prevWeather = state.weather;
      state = { ...s };
      windRef = s.wind;
      // If time jumped hard (e.g. reset or quick chips), skip easing for light
      // colors to avoid a long slow fade — colors re-sample every frame anyway.
      void prevWeather;
    },

    resetCamera(): void {
      camera.position.copy(CAM_POS);
      controls.target.copy(CAMERA_TARGET);
      controls.update();
    },

    projectHouse(): { x: number; y: number } | null {
      const v = new THREE.Vector3(-5.2, 3.4, -3.4).project(camera);
      if (v.z > 1) return null;
      return {
        x: ((v.x + 1) / 2) * window.innerWidth,
        y: ((1 - v.y) / 2) * window.innerHeight,
      };
    },

    debugEnv(): { duskiness: number; rain: number; storm: number } {
      return { duskiness: env.duskiness, rain: env.rain, storm: env.storm };
    },

    dispose(): void {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      mq.removeEventListener?.('change', onMq);
      controls.dispose();
      sky.dispose();
      world.dispose();
      weather.dispose();
      renderer.dispose();
    },
  };
}

export function defaultState(): WorldState {
  return { ...DEFAULTS };
}
