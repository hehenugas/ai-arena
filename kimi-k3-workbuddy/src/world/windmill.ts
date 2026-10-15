import * as THREE from 'three';
import { MAT, enableShadows } from './materials';

export interface WindmillRefs {
  group: THREE.Group;
  blades: THREE.Group;
}

export function buildWindmill(): WindmillRefs {
  const g = new THREE.Group();

  // tapered tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.55, 1.9, 8), MAT.wall);
  tower.position.y = 0.95;
  g.add(tower);

  // wooden base trim
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.16, 8), MAT.wood);
  trim.position.y = 0.08;
  g.add(trim);

  // cap roof
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 8), MAT.roof);
  cap.position.y = 2.12;
  g.add(cap);

  // little door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.05), MAT.woodDark);
  door.position.set(0, 0.2, 0.56);
  g.add(door);

  // hub + four blades
  const blades = new THREE.Group();
  blades.position.set(0, 1.85, 0.5);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), MAT.woodDark);
  hub.rotation.x = Math.PI / 2;
  blades.add(hub);

  const bladeGeo = new THREE.BoxGeometry(0.16, 0.95, 0.04);
  bladeGeo.translate(0, 0.55, 0);
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI) / 2;
    const sail = new THREE.Mesh(bladeGeo, MAT.wall);
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.05), MAT.wood);
    spar.position.y = 0.55;
    pivot.add(spar, sail);
    sail.position.set(0.08, 0, 0.02);
    blades.add(pivot);
  }
  g.add(blades);

  enableShadows(g);
  return { group: g, blades };
}
