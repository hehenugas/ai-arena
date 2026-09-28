// Main scene builder — assembles all elements and exposes the update loop
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AppState } from '../state/store';
import { getEnvConfig } from '../state/environment';
import { createIsland } from './island';
import { createHouse, HouseObjects } from './house';
import { createTrees, TreeObject } from './trees';
import { createWindmill, WindmillObject } from './windmill';
import { createPond, PondObjects } from './pond';
import { createClouds, createRocks, createFence, createPath, createFlowers, CloudObject } from './environment';
import { createRainSystem, RainSystem } from './rain';
import { createSky, createStars, SkyObjects } from './sky';

export interface SceneSetup {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  house: HouseObjects;
  updateScene: (state: AppState, dt: number) => void;
  dispose: () => void;
  getHouseMeshes: () => THREE.Object3D[];
}

const DEFAULT_CAM_POS = new THREE.Vector3(16, 12, 18);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export function buildScene(container: HTMLElement): SceneSetup {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8aafc8, 0.004);

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    500
  );
  camera.position.copy(DEFAULT_CAM_POS);
  camera.lookAt(DEFAULT_TARGET);

  // --- Controls ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.enablePan = false;
  controls.target.copy(DEFAULT_TARGET);
  controls.update();

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xd0e8ff, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5d0, 2.0);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Soft fill light from below (fake bounce from water/ground)
  const fill = new THREE.HemisphereLight(0x8ac0e0, 0x4a6a30, 0.35);
  scene.add(fill);

  // --- Sky ---
  const sky = createSky();
  scene.add(sky.mesh);
  const stars = createStars();
  scene.add(stars);

  // --- Island group ---
  const island = createIsland();
  island.position.y = 0;
  scene.add(island);

  // --- Pond ---
  const pond = createPond();
  pond.group.position.set(-2.5, 0.78, 1.5);
  scene.add(pond.group);

  // --- House ---
  const house = createHouse();
  house.group.position.set(0.8, 0.78, -1.0);
  scene.add(house.group);

  // --- Trees ---
  const trees: TreeObject[] = createTrees();
  for (const t of trees) {
    scene.add(t.group);
  }

  // --- Windmill ---
  const windmill: WindmillObject = createWindmill();
  windmill.group.position.set(-4.0, 0.78, -2.8);
  scene.add(windmill.group);

  // --- Environmental details ---
  const rocks = createRocks();
  scene.add(rocks);
  const fence = createFence();
  scene.add(fence);
  const path = createPath();
  scene.add(path);
  const flowers = createFlowers();
  scene.add(flowers);

  // --- Clouds ---
  const clouds: CloudObject[] = createClouds();
  for (const c of clouds) {
    scene.add(c.group);
  }

  // --- Rain ---
  const rain: RainSystem = createRainSystem();
  scene.add(rain.points);

  // --- Resize handler ---
  function onResize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // Smooth transition state
  let smoothEnvT = {
    ambientIntensity: 0.8,
    sunIntensity: 2.0,
  };

  // --- Update loop ---
  function updateScene(state: AppState, dt: number): void {
    const env = getEnvConfig(state.timeOfDay, state.weather === 'rain');

    // Sky gradient
    sky.update(env.skyTop, env.skyHorizon);

    // Fog
    (scene.fog as THREE.FogExp2).color.copy(env.fogColor);
    (scene.fog as THREE.FogExp2).density = env.fogDensity;
    renderer.setClearColor(env.fogColor);

    // Lights (smooth lerp)
    const lerpFactor = Math.min(1, dt * 1.5);
    ambient.color.lerp(env.ambientColor, lerpFactor);
    ambient.intensity += (env.ambientIntensity - ambient.intensity) * lerpFactor;
    sun.color.lerp(env.sunColor, lerpFactor);
    sun.intensity += (env.sunIntensity - sun.intensity) * lerpFactor;
    sun.position.lerp(env.sunPosition, lerpFactor);

    // Stars visibility
    const hour = state.timeOfDay;
    const nightFactor = hour < 5 ? 1 : hour < 7 ? 1 - (hour - 5) / 2 : hour > 19 ? (hour - 19) / 2 : 0;
    const starMat = stars.material as THREE.PointsMaterial;
    starMat.opacity += (Math.min(1, nightFactor) * 0.85 - starMat.opacity) * lerpFactor;

    // Cloud material tint in rain
    for (const cloud of clouds) {
      for (const child of cloud.group.children) {
        const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
        const targetColor = state.weather === 'rain' ? new THREE.Color(0xb0b8c0) : new THREE.Color(0xf8f6f2);
        mat.color.lerp(targetColor, lerpFactor);
      }
    }

    // Windmill rotation
    const windSpeed = state.windStrength;
    windmill.bladeGroup.rotation.x += windSpeed * 2.5 * dt;

    // Tree sway
    const swayAmount = windSpeed * 0.025;
    const time = performance.now() / 1000;
    for (const tree of trees) {
      tree.group.rotation.z = Math.sin(time * 0.8 + tree.swayPhase) * swayAmount;
      tree.group.rotation.x = Math.cos(time * 0.6 + tree.swayPhase) * swayAmount * 0.5;
    }

    // Cloud movement
    for (const cloud of clouds) {
      cloud.group.position.x = cloud.baseX + Math.sin(time * cloud.speed * 0.08 + cloud.phase) * 3.5;
      cloud.group.position.z = cloud.baseZ + Math.cos(time * cloud.speed * 0.05 + cloud.phase) * 2.0;
      // Wind pushes clouds
      cloud.group.position.x += windSpeed * time * 0.05 % 30 - 15;
    }

    // Pond ripples & rain
    const isRaining = state.weather === 'rain';
    rain.update(dt, state.windStrength, isRaining);
    pond.update(dt, isRaining);

    // Water color
    const waterMat = pond.waterMesh.material as THREE.MeshLambertMaterial;
    const targetWaterColor = isRaining ? new THREE.Color(0x3a6a8a) : new THREE.Color(0x4a7aaa);
    waterMat.color.lerp(targetWaterColor, lerpFactor);

    controls.update();
    renderer.render(scene, camera);
  }

  function getHouseMeshes(): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    house.group.traverse(obj => result.push(obj));
    return result;
  }

  function dispose(): void {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  }

  return {
    renderer,
    camera,
    controls,
    house,
    updateScene,
    dispose,
    getHouseMeshes,
  };
}

export { DEFAULT_CAM_POS, DEFAULT_TARGET };
