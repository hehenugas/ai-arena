import * as THREE from "three";
import { WIND_DIR_X, WIND_DIR_Z } from "./wind";
import type { Materials } from "./materials";

export type Windmill = {
  group: THREE.Group;
  update: (dt: number, wind: number) => void;
};

export function createWindmill(materials: Materials): Windmill {
  const group = new THREE.Group();
  group.name = "windmill";
  group.rotation.y = Math.atan2(WIND_DIR_X, WIND_DIR_Z);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 1.16, 10), materials.plaster);
  tower.position.y = 0.58;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 6, 16), materials.wood);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.92;
  group.add(band);

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.26, 10), materials.woodLight);
  head.position.y = 1.18;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 10), materials.roof);
  cap.position.y = 1.42;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.03), materials.woodDark);
  door.position.set(0, 0.28, 0.3);
  group.add(door);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.46), materials.wood);
  tail.position.set(0, 1.22, -0.28);
  tail.castShadow = true;
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.16), materials.woodDark);
  fin.position.set(0, 1.28, -0.5);
  fin.castShadow = true;
  group.add(fin);

  const blades = new THREE.Group();
  blades.position.set(0, 1.24, 0.32);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 10), materials.woodDark);
  hub.rotation.x = Math.PI / 2;
  blades.add(hub);
  for (let i = 0; i < 4; i += 1) {
    const blade = makeBlade(materials);
    blade.rotation.z = (i * Math.PI) / 2;
    blades.add(blade);
  }
  group.add(blades);

  return {
    group,
    update(dt, wind) {
      blades.rotation.z += wind * 4.2 * dt;
    },
  };
}

function makeBlade(materials: Materials): THREE.Group {
  const blade = new THREE.Group();
  const spar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.028), materials.wood);
  spar.position.y = 0.5;
  spar.castShadow = true;
  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.012), materials.sail);
  sail.position.set(0.065, 0.52, 0.012);
  sail.castShadow = true;
  blade.add(spar, sail);
  for (let i = 0; i < 3; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.026, 0.018), materials.woodDark);
    bar.position.set(0.045, 0.3 + i * 0.18, 0.018);
    bar.castShadow = true;
    blade.add(bar);
  }
  return blade;
}
