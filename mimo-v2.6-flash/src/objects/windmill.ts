import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { getTextures, variant } from '../textureSet';

const CREAM = '#efe4cf';
const ROOF = '#b9614a';
const WOOD = '#8a5f42';
const WOOD_DARK = '#6b4a33';
const BLADE_CREAM = '#f2ead8';

export interface Windmill {
  group: Group;
  update(dt: number, wind: number): void;
}

export function createWindmill(): Windmill {
  const { mottle, wood } = getTextures();
  const group = new Group();
  group.name = 'windmill';

  const wallMat = new MeshStandardMaterial({
    color: CREAM,
    map: variant(mottle, 0.6, 0.6),
    roughness: 0.9,
  });
  const roofMat = new MeshStandardMaterial({ color: ROOF, roughness: 0.82 });
  const woodMat = new MeshStandardMaterial({
    color: WOOD,
    map: variant(wood, 1.5, 1.5),
    roughness: 0.8,
  });
  const darkWoodMat = new MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.75 });
  const bladeMat = new MeshStandardMaterial({ color: BLADE_CREAM, roughness: 0.7 });
  const stoneMat = new MeshStandardMaterial({ color: '#a99c8b', roughness: 0.95 });
  const glassMat = new MeshStandardMaterial({
    color: '#26323f',
    roughness: 0.2,
    metalness: 0.2,
  });

  const tower = new Mesh(new CylinderGeometry(0.64, 0.92, 3.6, 10), wallMat);
  tower.position.y = 1.8;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const base = new Mesh(new CylinderGeometry(0.97, 1.06, 0.5, 10), stoneMat);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const cap = new Mesh(new ConeGeometry(0.8, 0.95, 10), roofMat);
  cap.position.y = 4.05;
  cap.castShadow = true;
  group.add(cap);

  const door = new Mesh(new BoxGeometry(0.5, 0.98, 0.12), woodMat);
  door.position.set(0, 0.55, 0.84);
  door.rotation.x = -0.04;
  group.add(door);

  const windowPane = new Mesh(new CylinderGeometry(0.15, 0.15, 0.07, 16), glassMat);
  windowPane.rotation.x = Math.PI / 2;
  windowPane.position.set(0, 2.35, 0.74);
  group.add(windowPane);

  // Rotor: four blades in the local XY plane, spinning about local Z
  const rotor = new Group();
  rotor.position.set(0, 3.35, 0.76);
  group.add(rotor);

  const hub = new Mesh(new CylinderGeometry(0.17, 0.17, 0.3, 12), darkWoodMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.1;
  rotor.add(hub);

  for (let k = 0; k < 4; k++) {
    const blade = new Group();
    blade.rotation.z = (k * Math.PI) / 2 + 0.35;
    rotor.add(blade);

    const arm = new Mesh(new BoxGeometry(0.09, 1.0, 0.07), darkWoodMat);
    arm.position.set(0, 0.62, 0.05);
    blade.add(arm);

    const panel = new Mesh(new BoxGeometry(0.46, 1.05, 0.045), bladeMat);
    panel.position.set(0.24, 1.52, 0.06);
    panel.rotation.z = 0.1;
    panel.castShadow = true;
    blade.add(panel);

    for (const sy of [-0.3, 0, 0.3]) {
      const slat = new Mesh(new BoxGeometry(0.46, 0.05, 0.06), woodMat);
      slat.position.set(0.24 + sy * 0.08, 1.52 + sy, 0.075);
      slat.rotation.z = 0.1;
      blade.add(slat);
    }
  }

  const update = (dt: number, wind: number): void => {
    rotor.rotation.z += Math.pow(wind, 1.15) * 3.2 * dt;
  };

  return { group, update };
}

export const WINDMILL_ROOF_COLOR = new Color(ROOF);
