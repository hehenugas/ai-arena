import * as THREE from 'three';
import { createIsland, groundHeightAt, HOUSE_POS, WINDMILL_POS } from './island';
import { createHouse, type House } from './house';
import { createTrees, type TreeHandle } from './trees';
import { createWindmill, type Windmill } from './windmill';
import { createPond, type Pond } from './pond';
import { createClouds, createScatter, type Clouds, type Scatter } from './decorations';

/**
 * Everything that belongs to the floating island. `group` bobs gently in the
 * breeze; clouds float above it and are returned separately.
 */
export interface BuiltWorld {
  group: THREE.Group;
  clouds: Clouds;
  house: House;
  windmill: Windmill;
  trees: TreeHandle[];
  pond: Pond;
  scatter: Scatter;
  groundHeightAt: (x: number, z: number) => number;
  update: (dt: number, time: number, wind: number, weather: number, reduceMotion: boolean) => void;
}

export function buildWorld(scene: THREE.Scene): BuiltWorld {
  const group = new THREE.Group();

  // Island itself.
  const island = createIsland();
  group.add(island.group);

  // House — door faces the windmill so the path makes sense.
  const house = createHouse();
  const hx = HOUSE_POS.x;
  const hz = HOUSE_POS.y;
  house.position.set(hx, groundHeightAt(hx, hz), hz);
  const toMill = new THREE.Vector2(WINDMILL_POS.x - hx, WINDMILL_POS.y - hz);
  house.rotation.y = Math.atan2(-toMill.x, -toMill.y);
  group.add(house);

  // Trees + windmill + pond + scatter details.
  const { group: treeGroup, trees } = createTrees();
  group.add(treeGroup);

  const windmill = createWindmill();
  group.add(windmill.group);

  const pond = createPond();
  group.add(pond.group);

  const scatter = createScatter();
  group.add(scatter.group);

  // Clouds float freely above the island (not bobbing with it).
  const clouds = createClouds();
  scene.add(clouds.group);

  let bob = 0;

  const update = (
    dt: number,
    time: number,
    wind: number,
    weather: number,
    reduceMotion: boolean
  ): void => {
    if (!reduceMotion) {
      bob += dt * 0.45;
      group.position.y = Math.sin(bob) * 0.14;
    } else {
      group.position.y = 0;
    }
    // Trees lean with the wind.
    for (const t of trees) {
      const { speed, amp, phase } = t.sway;
      t.group.rotation.z = Math.sin(time * speed + phase) * amp * wind;
      t.group.rotation.x = Math.sin(time * speed * 1.13 + phase * 0.7) * amp * 0.5 * wind;
    }
    clouds.update(dt, time, wind, weather, reduceMotion);
    scatter.update(time, wind, reduceMotion);
  };

  return { group, clouds, house, windmill, trees, pond, scatter, groundHeightAt, update };
}