import * as THREE from "three";
import { approach } from "../util";
import type { Quality } from "../quality";
import { motionReduced, type AppState } from "../state";
import { createClouds } from "./clouds";
import { createFireflies, createSky, type Sky } from "./sky";
import { createHouse } from "./house";
import { createIsland, surfaceHeight } from "./island";
import { HOUSE, HOME_TARGET, WINDMILL } from "./layout";
import { createMaterials } from "./materials";
import { createPond } from "./pond";
import { createProps } from "./props";
import { createRain } from "./rain";
import { createTextures } from "./textures";
import { createTrees } from "./trees";
import { createWindmill } from "./windmill";

const MOON_BELLY = new THREE.Color("#9eb0cc");

export type World = {
  scene: THREE.Scene;
  floating: THREE.Group;
  update: (dt: number, elapsed: number, state: AppState, immediate?: boolean) => void;
};

export function createWorld(renderer: THREE.WebGLRenderer, camera: THREE.Camera, quality: Quality): World {
  const scene = new THREE.Scene();
  const textures = createTextures(renderer.capabilities.getMaxAnisotropy());
  const materials = createMaterials(textures);

  const sky = createSky(quality.stars);
  const fireflies = createFireflies();
  const island = createIsland(materials);
  const house = createHouse(materials);
  const trees = createTrees(materials);
  const windmill = createWindmill(materials);
  const pond = createPond(materials);
  const props = createProps(materials, quality.tufts);
  const clouds = createClouds();
  const rain = createRain(quality.rain);

  house.root.position.set(HOUSE.x, surfaceHeight(HOUSE.x, HOUSE.z) - 0.02, HOUSE.z);
  house.root.rotation.y = HOUSE.rotation;
  windmill.group.position.set(WINDMILL.x, surfaceHeight(WINDMILL.x, WINDMILL.z) - 0.02, WINDMILL.z);

  const floating = new THREE.Group();
  floating.name = "floating-island";
  floating.add(island, house.root, trees.group, windmill.group, pond.group, props, fireflies.group);

  const ambient = new THREE.AmbientLight("#fff1e2", 0.46);
  const hemi = new THREE.HemisphereLight("#c5dff0", "#6e8446", 0.5);
  const sun = new THREE.DirectionalLight("#ffe0bc", 1.15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  sun.shadow.bias = -0.00028;
  sun.shadow.normalBias = 0.04;
  const shadowCamera = sun.shadow.camera;
  shadowCamera.left = -7;
  shadowCamera.right = 7;
  shadowCamera.top = 7;
  shadowCamera.bottom = -7;
  shadowCamera.near = 0.5;
  shadowCamera.far = 36;
  shadowCamera.updateProjectionMatrix();
  sun.target.position.set(HOME_TARGET.x, 0.2, HOME_TARGET.z);
  const fill = new THREE.DirectionalLight("#fff6ee", 0.2);
  fill.position.set(6.2, 3.5, 6.4);
  const belly = new THREE.DirectionalLight("#e6d2b4", 0.42);
  belly.position.set(0.4, -5.5, 1.2);
  const white = new THREE.Color("#ffffff");

  scene.add(sky.group, clouds.group, floating, rain.mesh, ambient, hemi, sun, sun.target, fill, belly);

  let weatherMix = 0;
  let lightsMix = 0;

  const update = (dt: number, elapsed: number, state: AppState, immediate = false) => {
    const reduced = motionReduced();
    weatherMix = approach(weatherMix, state.weather === "rain" ? 1 : 0, 2.8, dt, immediate);
    lightsMix = approach(lightsMix, state.lightsOn ? 1 : 0, 7.5, dt, immediate);
    sky.update(state.hour, weatherMix, camera, elapsed, reduced);
    applyLights(sky, sun, ambient, hemi, fill, belly, white, weatherMix);
    renderer.toneMappingExposure = sky.sample.exposure;
    floating.position.y = reduced ? 0 : Math.sin(elapsed * 0.42) * 0.028;
    house.update({
      lightsMix,
      night: sky.sample.night,
      wind: state.wind,
      weatherMix,
      elapsed,
      reduced,
    });
    trees.update(elapsed, state.wind, reduced);
    windmill.update(dt, state.wind);
    pond.update(elapsed, dt, weatherMix, sky.sample, reduced);
    clouds.update(dt, state.wind, weatherMix, sky.sample.night);
    rain.update(dt, weatherMix, state.wind);
    fireflies.update(elapsed, sky.sample.night, weatherMix, reduced);
  };

  return { scene, floating, update };
}

function applyLights(
  sky: Sky,
  sun: THREE.DirectionalLight,
  ambient: THREE.AmbientLight,
  hemi: THREE.HemisphereLight,
  fill: THREE.DirectionalLight,
  belly: THREE.DirectionalLight,
  white: THREE.Color,
  weatherMix: number,
): void {
  const sample = sky.sample;
  sun.position.copy(sample.keyDir).multiplyScalar(16);
  sun.color.copy(sample.keyColor);
  sun.intensity = sample.keyIntensity;
  ambient.color.copy(sample.ambient);
  ambient.intensity = sample.ambientIntensity;
  hemi.color.copy(sample.zenith);
  hemi.groundColor.copy(sample.ground);
  hemi.intensity = sample.hemiIntensity;
  fill.color.copy(sample.sun).lerp(white, 0.58);
  fill.intensity = (0.16 + sample.night * 0.22) * (1 - weatherMix * 0.22);
  belly.color.copy(sample.sun).lerp(MOON_BELLY, sample.night);
  belly.intensity = (0.18 + sample.night * 0.05) * (1 - weatherMix * 0.12);
}
