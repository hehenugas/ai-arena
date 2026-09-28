import * as THREE from 'three';
import { windowProminence, type Mood } from '../core/theme';
import { sunHeight, type WorldLive } from '../core/state';
import { createClouds, type Clouds } from './clouds';
import { createHouse, type House } from './house';
import { createIsland, type Island } from './island';
import { createLighting, type Lighting } from './lighting';
import { createPond, type Pond } from './pond';
import { createProps, type Props } from './props';
import { createRain, type Rain } from './rain';
import { createSky, type Sky } from './sky';
import { createVegetation, type Vegetation } from './vegetation';
import { createWindmill, type Windmill } from './windmill';

export interface World {
  scene: THREE.Scene;
  /** Everything that belongs to the diorama; the camera targets this. */
  diorama: THREE.Group;
  sky: Sky;
  lighting: Lighting;
  island: Island;
  house: House;
  windmill: Windmill;
  vegetation: Vegetation;
  pond: Pond;
  clouds: Clouds;
  props: Props;
  rain: Rain;
  update(dt: number, elapsed: number, live: WorldLive, mood: Mood, motion: number): void;
}

export function createWorld(quality: 'low' | 'high'): World {
  const scene = new THREE.Scene();
  const diorama = new THREE.Group();
  scene.add(diorama);

  const sky = createSky();
  scene.add(sky.mesh);

  const lighting = createLighting(scene, quality === 'low' ? 1024 : 2048);

  const island = createIsland();
  diorama.add(island.group);

  const house = createHouse();
  diorama.add(house.group);

  const windmill = createWindmill();
  diorama.add(windmill.group);

  const vegetation = createVegetation();
  diorama.add(vegetation.group);

  const pond = createPond();
  diorama.add(pond.group);

  const props = createProps();
  diorama.add(props.group);

  const clouds = createClouds(quality);
  diorama.add(clouds.group);

  const rain = createRain(quality === 'low' ? 380 : 760);
  scene.add(rain.mesh);

  return {
    scene,
    diorama,
    sky,
    lighting,
    island,
    house,
    windmill,
    vegetation,
    pond,
    clouds,
    props,
    rain,
    update(dt, elapsed, live, mood, motion) {
      lighting.update(mood, live.time, live.rain);
      sky.sunDir.copy(lighting.sunDir);
      sky.moonDir.copy(lighting.moonDir);
      sky.update(mood, live.rain);

      const dark = windowProminence(sunHeight(live.time));
      house.setLights(live.lights, dark);
      house.update(elapsed, motion);
      windmill.update(dt, live.wind, motion);
      vegetation.update(elapsed, live.wind, motion);
      pond.update(dt, elapsed, live.rain, live.wind, motion, mood.skyHorizon);
      clouds.update(dt, elapsed, live.wind, live.rain, motion);
      island.update(elapsed, motion);
      rain.update(dt, live.rain, live.wind, 1);
    },
  };
}
