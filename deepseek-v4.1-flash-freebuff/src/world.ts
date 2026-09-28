import {
  AmbientLight,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  Scene,
  Vector3,
  type Raycaster,
} from 'three';
import { createClouds } from './clouds';
import { createHouse, type House } from './house';
import { materials } from './materials';
import { applyRain, nightFactor, samplePalette } from './palette';
import { createProps } from './props';
import { createSky } from './sky';
import type { FrameContext, Store } from './state';
import { buildRockGeometry, buildTerrainGeometry, createIslandInfo } from './terrain';
import { createVegetation } from './vegetation';
import { clamp as clampNumber, damp } from './utils';
import { createPond, createRipplePool } from './water';
import { createWeather, type Quality } from './weather';
import { createWindmill } from './windmill';

export interface World {
  update(dt: number, elapsed: number): void;
  /** True when the ray hits the cottage (used for the tap-to-toggle interaction). */
  hitHouse(raycaster: Raycaster): boolean;
  /** Follows the OS reduced-motion preference live. */
  setReducedMotion(value: boolean): void;
  /** Smoothed rain amount, for anything outside the world that needs it. */
  readonly rain: number;
  /** Tone-mapping exposure for the current palette (nudged up at night). */
  readonly exposure: number;
}

export function createWorld(scene: Scene, store: Store, quality: Quality): World {
  const islandInfo = createIslandInfo();

  const island = new Group();
  island.name = 'island';

  const terrainMesh = new Mesh(buildTerrainGeometry(islandInfo), materials.terrain);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;

  const rockMesh = new Mesh(buildRockGeometry(islandInfo), materials.islandRock);
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;

  island.add(terrainMesh, rockMesh);

  const pond = createPond(islandInfo);
  const ripples = createRipplePool(islandInfo);
  const props = createProps(islandInfo);
  const vegetation = createVegetation(islandInfo);
  const windmill = createWindmill(islandInfo);
  const house: House = createHouse(islandInfo);
  const clouds = createClouds();
  const weather = createWeather(islandInfo, ripples, quality);
  const sky = createSky();

  island.add(pond.group, props.group, vegetation.group, windmill.group, house.group);
  scene.add(sky.group, clouds.group, weather.group, ripples.group, island);

  // ---------------------------------------------------------------- lights

  scene.fog = new FogExp2(0xcfe3f2, 0.011);

  const keyLight = new DirectionalLight(0xfff1d8, 2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 120;
  keyLight.shadow.camera.left = -13;
  keyLight.shadow.camera.right = 13;
  keyLight.shadow.camera.top = 13;
  keyLight.shadow.camera.bottom = -13;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.035;
  keyLight.target.position.set(0, -0.4, 0);
  scene.add(keyLight, keyLight.target);

  const hemisphere = new HemisphereLight(0xbcdcf7, 0x77855c, 0.6);
  scene.add(hemisphere);

  // A soft bounce from below keeps the sculpted underside of the island
  // readable instead of crushing it into a black silhouette.
  const bounce = new DirectionalLight(0xcfe3f2, 0.3);
  bounce.position.set(6, -40, 10);
  scene.add(bounce);

  const ambient = new AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // ------------------------------------------------------------ frame state

  const sunDir = new Vector3(0, 1, 0);
  const lightDir = new Vector3(0, 1, 0);
  const palette = samplePalette(1);
  let rain = store.value.weather === 'rain' ? 1 : 0;
  let reducedMotion = false;

  const frame: FrameContext = {
    dt: 0,
    elapsed: 0,
    state: store.value,
    night: 0,
    rain: 0,
    sunDir,
    lightDir,
    wind: store.value.wind,
    palette,
    reducedMotion: false,
  };

  return {
    get rain() {
      return rain;
    },

    get exposure() {
      return palette.exposure;
    },

    setReducedMotion(value: boolean) {
      reducedMotion = value;
    },

    update(dt: number, elapsed: number) {
      const state = store.value;
      // Weather transitions are smoothed here, so every consumer can simply
      // read frame.rain and stays interruptible at any time.
      rain = damp(rain, state.weather === 'rain' ? 1 : 0, 1.5, dt);

      // Sun path: rises on one side of the default camera, crosses in front of
      // it around noon and sets on the other side, so the afternoon default view
      // is modelled by light coming from about 45 degrees off the camera.
      const dayProgress = (state.time - 6) / 12;
      const elevationSin = clampNumber(0.88 * Math.sin(dayProgress * Math.PI), -1, 1);
      const cosElevation = Math.sqrt(Math.max(0, 1 - elevationSin * elevationSin));
      const azimuth = ((35 + (state.time - 12) * 15) * Math.PI) / 180;
      sunDir.set(
        Math.sin(azimuth) * cosElevation,
        elevationSin,
        Math.cos(azimuth) * cosElevation,
      );

      const elevation = sunDir.y;
      const night = nightFactor(elevation);
      applyRain(samplePalette(elevation), rain, night);

      // One shadow-casting light plays both roles: the sun by day and, after
      // dark, the cool moon. Its direction follows the sun but is kept above
      // the horizon, which keeps sunset shadows long and stops the lighting
      // from ever snapping to the opposite side of the world in the evening.
      const minElevation = 0.2 + 0.24 * night;
      if (sunDir.y < minElevation) {
        lightDir.set(sunDir.x, minElevation, sunDir.z).normalize();
      } else {
        lightDir.copy(sunDir);
      }
      keyLight.position.copy(lightDir).multiplyScalar(48);
      keyLight.color.copy(palette.keyColor);
      keyLight.intensity = palette.keyIntensity;

      hemisphere.color.copy(palette.hemiSky);
      hemisphere.groundColor.copy(palette.hemiGround);
      hemisphere.intensity = palette.hemiIntensity;

      bounce.color.copy(palette.horizon);
      bounce.intensity = palette.hemiIntensity * 0.5;

      ambient.intensity = palette.ambient;

      const fog = scene.fog as FogExp2;
      fog.color.copy(palette.fog);
      fog.density = palette.fogDensity;

      frame.dt = dt;
      frame.elapsed = elapsed;
      frame.state = state;
      frame.night = night;
      frame.rain = rain;
      frame.wind = state.wind;
      frame.palette = palette;
      frame.reducedMotion = reducedMotion;

      sky.update(frame);
      clouds.update(frame);
      weather.update(frame);
      ripples.update(dt, rain);
      pond.update(frame);
      props.update(frame);
      vegetation.update(frame);
      windmill.update(frame);
      house.update(frame);
    },

    hitHouse(raycaster: Raycaster) {
      return raycaster.intersectObject(house.group, true).length > 0;
    },
  };
}
