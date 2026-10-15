import * as THREE from 'three';
import { MAT, enableShadows } from './materials';

export interface HouseRefs {
  group: THREE.Group;
  /** meshes that glow when lights are on */
  windows: THREE.Mesh[];
  pointLight: THREE.PointLight;
  chimneySmoke: THREE.Group;
  hitbox: THREE.Mesh;
}

export function buildHouse(): HouseRefs {
  const g = new THREE.Group();

  // Walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.3), MAT.wall);
  walls.position.y = 0.575;
  g.add(walls);

  // Roof: prism from a stretched pyramid
  const roofGeo = new THREE.ConeGeometry(1.42, 0.85, 4);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.scale(1, 1, 0.78);
  const roof = new THREE.Mesh(roofGeo, MAT.roof);
  roof.position.y = 1.15 + 0.425;
  g.add(roof);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.06), MAT.woodDark);
  door.position.set(-0.28, 0.3, 0.68);
  g.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), MAT.roof);
  knob.position.set(-0.17, 0.3, 0.72);
  g.add(knob);

  // Windows (front two, one side) — emissive when lit
  const windows: THREE.Mesh[] = [];
  const winGeo = new THREE.BoxGeometry(0.26, 0.28, 0.05);
  const winDefs: [number, number, number, number][] = [
    [0.35, 0.62, 0.68, 0],      // front right
    [-0.28, 0.85, 0.68, 0],     // front attic-ish
    [0.86, 0.62, 0.1, Math.PI / 2] // side
  ];
  winDefs.forEach(([x, y, z, ry]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.03), MAT.wood);
    frame.position.set(x, y, z - (ry === 0 ? 0.01 : 0));
    frame.rotation.y = ry;
    if (ry !== 0) frame.position.x = x + 0.01;
    g.add(frame);
    const w = new THREE.Mesh(winGeo, MAT.windowLit.clone());
    w.position.set(x, y, z + (ry === 0 ? 0.02 : 0));
    w.rotation.y = ry;
    if (ry !== 0) w.position.x = x + 0.02;
    g.add(w);
    windows.push(w);
  });

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), MAT.rockDark);
  chimney.position.set(0.5, 1.55, -0.25);
  g.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.28), MAT.rock);
  chimneyCap.position.set(0.5, 1.87, -0.25);
  g.add(chimneyCap);

  // Smoke puffs (visible when lights on / evening coziness)
  const smoke = new THREE.Group();
  const puffMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5, flatShading: true });
  const puffGeo = new THREE.SphereGeometry(0.09, 6, 5);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(puffGeo, puffMat);
    p.position.set(0.5, 1.95 + i * 0.22, -0.25);
    p.scale.setScalar(1 + i * 0.4);
    smoke.add(p);
  }
  smoke.visible = false;
  g.add(smoke);

  // Steps + a tiny porch beam detail
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.22), MAT.pathStone);
  step.position.set(-0.28, 0.045, 0.82);
  g.add(step);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.07, 0.07), MAT.wood);
  beam.position.set(0, 1.12, 0.66);
  g.add(beam);

  // Warm light shown when lights are on
  const pointLight = new THREE.PointLight(0xffb35e, 0, 6, 1.8);
  pointLight.position.set(0, 0.9, 1.0);
  g.add(pointLight);

  // Generous invisible hitbox for comfortable clicking
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.4, 2.0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 1.1;
  hitbox.name = 'house-hitbox';
  g.add(hitbox);

  enableShadows(g);
  hitbox.castShadow = false;
  hitbox.receiveShadow = false;

  return { group: g, windows, pointLight, chimneySmoke: smoke, hitbox };
}
