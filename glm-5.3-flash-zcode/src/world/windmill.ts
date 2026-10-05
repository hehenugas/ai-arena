import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { groundHeight } from './island';

const STONE_CREAM = 0xe9dfc8;
const CAP_BROWN = 0x7a4a2e;
const WOOD = 0x6b4423;
const CANVAS = 0xefe6d2;

export interface Windmill {
  group: Group;
  update(dt: number, wind: number): void;
}

export function createWindmill(): Windmill {
  const group = new Group();
  group.position.set(2.7, groundHeight(2.7, -1.6), -1.6);
  // Turn the sails toward the initial camera so the blades read clearly.
  group.rotation.y = 0.62;

  const stone = new MeshStandardMaterial({ color: STONE_CREAM, roughness: 0.95, flatShading: true });
  const baseMat = new MeshStandardMaterial({ color: 0xa79a88, roughness: 1, flatShading: true });
  const capMat = new MeshStandardMaterial({ color: CAP_BROWN, roughness: 0.85, flatShading: true });
  const wood = new MeshStandardMaterial({ color: WOOD, roughness: 0.85, flatShading: true });
  const canvas = new MeshStandardMaterial({
    color: CANVAS,
    roughness: 0.9,
    flatShading: true,
    side: DoubleSide,
  });

  const base = new Mesh(new CylinderGeometry(1.02, 1.14, 0.26, 9), baseMat);
  base.position.y = 0.13;
  const tower = new Mesh(new CylinderGeometry(0.6, 0.9, 1.9, 9), stone);
  tower.position.y = 1.21;
  const capTrim = new Mesh(new CylinderGeometry(0.66, 0.66, 0.1, 9), wood);
  capTrim.position.y = 2.2;
  const cap = new Mesh(new ConeGeometry(0.68, 0.6, 9), capMat);
  cap.position.y = 2.55;
  for (const m of [base, tower, capTrim, cap]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  const door = new Mesh(new BoxGeometry(0.32, 0.52, 0.07), wood);
  door.position.set(0, 0.52, 0.86);
  door.rotation.x = -0.08;
  door.castShadow = true;
  group.add(door);

  const windowFrame = new Mesh(new BoxGeometry(0.26, 0.3, 0.1), wood);
  windowFrame.position.set(0, 1.55, 0.62);
  windowFrame.rotation.x = 0.24;
  group.add(windowFrame);
  const windowPane = new Mesh(new BoxGeometry(0.17, 0.21, 0.04), stone);
  windowPane.position.set(0, 1.55, 0.63);
  windowPane.rotation.x = 0.24;
  group.add(windowPane);

  // Hub and sails on the front face
  const axle = new Mesh(new CylinderGeometry(0.05, 0.05, 0.42, 8), wood);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(0, 1.95, 0.66);
  group.add(axle);
  const hub = new Mesh(new SphereGeometry(0.11, 8, 7), wood);
  hub.position.set(0, 1.95, 0.84);
  group.add(hub);

  const blades = new Group();
  blades.position.set(0, 1.95, 0.84);
  for (let i = 0; i < 4; i++) {
    const sail = new Group();
    const arm = new Mesh(new BoxGeometry(0.055, 1.18, 0.05), wood);
    arm.position.y = 0.72;
    arm.castShadow = true;
    const panel = new Mesh(new BoxGeometry(0.26, 0.82, 0.02), canvas);
    panel.position.set(0.15, 0.86, 0);
    panel.castShadow = true;
    const spar = new Mesh(new BoxGeometry(0.03, 0.86, 0.035), wood);
    spar.position.set(0.27, 0.86, 0);
    sail.add(arm, panel, spar);
    sail.rotation.z = (i * Math.PI) / 2;
    blades.add(sail);
  }
  group.add(blades);

  return {
    group,
    update(dt, wind) {
      // Zero wind leaves the sails still; full wind spins them briskly.
      blades.rotation.z -= wind * 2.6 * dt;
    },
  };
}
