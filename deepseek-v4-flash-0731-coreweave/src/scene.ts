import * as THREE from 'three';
import { buildIsland } from './scene/island';
import { buildPond, PondInfo } from './scene/pond';
import { buildHouse, HouseHandle } from './scene/house';
import { buildTrees, TreeHandle, swayTrees } from './scene/trees';
import { spinWindmill, buildWindmill, WindmillHandle } from './scene/windmill';
import { buildBoat, buildButterflies, buildRocks, buildPath, buildFence, buildFlowers, buildRoots } from './scene/decor';
import { buildClouds, CloudHandle, updateClouds } from './scene/clouds';

export interface SceneHandles {
  house: HouseHandle;
  windmill: WindmillHandle;
  trees: TreeHandle[]; boat: THREE.Group; butterflies: THREE.Group[]; pond: PondInfo; clouds: CloudHandle[];
}

const rainWaterColor = new THREE.Color(0x3a6a78);

export function buildScene(scene: THREE.Scene): SceneHandles {
  buildIsland(scene);
  const house = buildHouse(scene);
  const trees = buildTrees(scene);
  const windmill = buildWindmill(scene);
  buildRocks(scene);
  buildPath(scene);
  buildFence(scene);
  buildFlowers(scene);
  buildRoots(scene);
  const pond = buildPond(scene);
  const boat = buildBoat(scene, pond.center, pond.topY);
  const butterflies = buildButterflies(scene);
  const clouds = buildClouds(scene);
  return { house, windmill, trees, boat, butterflies, pond, clouds };
}

export function updateScene(handles: SceneHandles, dt: number, time: number, wind: number, rain: number, lights: boolean, reduced: boolean): void {
  swayTrees(handles.trees, time, wind,reduced);
  spinWindmill(handles.windmill, dt, wind);
  updateClouds(handles.clouds, dt, time, wind, rain, reduced);

	  // pond water reacts to rain
  handles.pond.waterMat.color.lerp(rainWaterColor, Math.min(1, rain * dt * 3.0));

	    // boat bob(skip when reduced)
  const boatBase = (handles.boat.userData as { baseY: number }).baseY;
  handles.boat.position.y = boatBase + (reduced ? 0 : Math.sin(time * 2.2) * 0.03);

	    // butterflies flap and drift
  handles.butterflies.forEach((b) => {
    const d = b.userData as { bx: number; by: number; bz: number; speed: number; phase: number; wingL: THREE.Object3D; wingR: THREE.Object3D };
    const flap = reduced ? 0.3 : (0.3 + Math.sin(time *	d.speed +	d.phase) * 0.45);
    d.wingL.rotation.z = flap;
    d.wingR.rotation.z = -flap; 
    b.position.x = d.bx + Math.sin(time *	0.4 +	d.phase) *    0.4;
    b.position.y = d.by + Math.sin(time *	0.7 +	d.phase) *    0.15;
    b.position.z = d.bz + Math.cos(time *	0.4 +	d.phase) *	 0.4;
  });

	  // house lights
  const targetWin = lights ?	 2.6 :	 0.0;
  handles.house.windowMat.emissiveIntensity += (targetWin -	handles.house.windowMat.emissiveIntensity) *	Math.min(1,	dt *	6.0);
  const targetLamp = lights ?	 1.4 :	 0.0;
  handles.house.lamp.intensity += (targetLamp -	handles.house.lamp.intensity) *	Math.min(1,	dt *	6.0);
}