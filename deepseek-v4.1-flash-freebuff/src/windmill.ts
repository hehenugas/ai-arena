import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, Object3D } from 'three';
import { materials } from './materials';
import type { FrameContext } from './state';
import { LAYOUT, terrainHeight, type IslandInfo } from './terrain';
import { damp } from './utils';

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const TOWER_HEIGHT = 1.62;
const HUB_HEIGHT = 1.42;

function addBox(
  parent: Object3D,
  material: (typeof materials)[keyof typeof materials],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): Mesh {
  const mesh = new Mesh(UNIT_BOX, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** One sail: a spar, three crossbars and the canvas. */
function buildBlade(): Object3D {
  const blade = new Group();
  addBox(blade, materials.woodDark, 0, 0.6, 0, 0.035, 1.18, 0.05);
  for (const y of [0.2, 0.53, 0.86, 1.16]) {
    addBox(blade, materials.woodDark, 0.02, y, 0, 0.38, 0.032, 0.045);
  }
  addBox(blade, materials.sail, 0.06, 0.58, 0.012, 0.27, 0.95, 0.012);
  return blade;
}

export interface Windmill {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createWindmill(info: IslandInfo): Windmill {
  const group = new Group();
  group.name = 'windmill';

  const anchor = info.clampToIsland(LAYOUT.windmill.x, LAYOUT.windmill.z, 1.8);
  group.position.set(anchor.x, terrainHeight(anchor.x, anchor.z), anchor.z);
  group.rotation.y = 0.42;

  // Stone skirt, tapered plaster tower, wooden cap.
  const skirt = new Mesh(new CylinderGeometry(0.6, 0.66, 0.22, 14), materials.stone);
  skirt.position.y = 0.09;
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  group.add(skirt);

  const tower = new Mesh(new CylinderGeometry(0.35, 0.58, TOWER_HEIGHT, 14), materials.plaster);
  tower.position.y = 0.2 + TOWER_HEIGHT / 2;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const cap = new Mesh(new ConeGeometry(0.44, 0.5, 14), materials.woodDark);
  cap.position.y = 0.2 + TOWER_HEIGHT + 0.19;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  // Door and two lit windows.
  addBox(group, materials.woodDark, 0, 0.38, 0.52, 0.34, 0.6, 0.08);
  addBox(group, materials.wood, 0, 0.36, 0.56, 0.26, 0.5, 0.05);

  const windowGeometry = new BoxGeometry(0.17, 0.2, 0.02);
  const windowPositions: [number, number, number, number][] = [
    [0.22, 1.05, 0.44, -0.4],
    [-0.24, 1.08, -0.42, Math.PI - 0.4],
  ];
  for (const [x, y, z, rotation] of windowPositions) {
    const frame = new Mesh(UNIT_BOX, materials.woodDark);
    frame.position.set(x, y, z);
    frame.scale.set(0.25, 0.28, 0.06);
    frame.rotation.y = rotation;
    frame.castShadow = true;
    group.add(frame);

    const pane = new Mesh(windowGeometry, materials.millPane);
    pane.position.set(x, y, z);
    pane.rotation.y = rotation;
    pane.translateZ(0.04);
    group.add(pane);
  }

  // Sails.
  const hubPivot = new Group();
  hubPivot.position.set(0, 0.2 + HUB_HEIGHT, 0.36);
  group.add(hubPivot);

  const hub = new Mesh(new CylinderGeometry(0.09, 0.09, 0.14, 10), materials.woodDark);
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  hubPivot.add(hub);

  const blades = new Group();
  blades.position.z = 0.09;
  for (let i = 0; i < 4; i++) {
    const blade = buildBlade();
    blade.rotation.z = (i * Math.PI) / 2;
    blades.add(blade);
  }
  hubPivot.add(blades);

  let angle = 0;
  let speed = 0;

  return {
    group,
    update(ctx: FrameContext) {
      // One shared wind value drives the mill, so it always feels connected to
      // the trees, the clouds and the rain.
      speed = damp(speed, ctx.wind * 2.8, 3, ctx.dt);
      angle += speed * ctx.dt;
      blades.rotation.z = angle;
      materials.millPane.emissiveIntensity = (0.25 + 1.35 * ctx.night) * 0.75;
    },
  };
}
