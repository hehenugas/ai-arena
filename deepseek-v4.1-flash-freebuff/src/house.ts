import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Object3D,
  PointLight,
  Shape,
  SphereGeometry,
} from 'three';
import { materials } from './materials';
import type { FrameContext } from './state';
import { LAYOUT, terrainHeight, type IslandInfo } from './terrain';
import { damp } from './utils';

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_POST = new CylinderGeometry(0.5, 0.5, 1, 8);
const BODY_WIDTH = 1.6;
const BODY_DEPTH = 1.3;
const BODY_HEIGHT = 1;
const ROOF_HEIGHT = 0.74;
const FLOOR_Y = 0.02;

let boxCount = 0;

function addBox(
  parent: Object3D,
  material: (typeof materials)[keyof typeof materials],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  name?: string,
): Mesh {
  const mesh = new Mesh(UNIT_BOX, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = `${name}-${boxCount++}`;
  parent.add(mesh);
  return mesh;
}

/** Window: dark backing, glowing pane and a wooden cross. */
function addWindow(
  parent: Object3D,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  size = 0.3,
): Group {
  const window = new Group();
  window.position.set(x, y, z);
  window.rotation.y = rotationY;

  addBox(window, materials.woodDark, 0, 0, -0.015, size + 0.09, size + 0.09, 0.05, 'window-frame');

  const pane = new Mesh(new BoxGeometry(size, size, 0.02), materials.housePane);
  pane.position.z = 0.022;
  window.add(pane);

  addBox(window, materials.woodDark, 0, 0, 0.03, size + 0.02, 0.026, 0.02, 'mullion-h');
  addBox(window, materials.woodDark, 0, 0, 0.03, 0.026, size + 0.02, 0.02, 'mullion-v');

  parent.add(window);
  return window;
}

export interface House {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createHouse(info: IslandInfo): House {
  const group = new Group();
  group.name = 'house';

  const anchor = info.clampToIsland(LAYOUT.house.x, LAYOUT.house.z, 2.1);
  group.position.set(anchor.x, terrainHeight(anchor.x, anchor.z), anchor.z);
  group.rotation.y = 0.26;

  // Stone footing hides the seam with the uneven ground.
  addBox(group, materials.stone, 0, -0.12, 0, BODY_WIDTH + 0.16, 0.36, BODY_DEPTH + 0.16, 'footing');

  // Walls.
  addBox(
    group,
    materials.plaster,
    0,
    FLOOR_Y + BODY_HEIGHT / 2,
    0,
    BODY_WIDTH,
    BODY_HEIGHT,
    BODY_DEPTH,
    'walls',
  );

  // Timber corners and a sill band give the plaster some structure.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(
        group,
        materials.woodDark,
        sx * (BODY_WIDTH / 2 - 0.01),
        FLOOR_Y + BODY_HEIGHT / 2,
        sz * (BODY_DEPTH / 2 - 0.01),
        0.085,
        BODY_HEIGHT,
        0.085,
        'corner-post',
      );
    }
  }
  addBox(group, materials.wood, 0, FLOOR_Y + 0.08, 0, BODY_WIDTH + 0.06, 0.06, BODY_DEPTH + 0.06, 'sill');

  // Gable roof: a triangle extruded along Z with a generous overhang.
  const roofShape = new Shape();
  const half = BODY_WIDTH / 2 + 0.14;
  roofShape.moveTo(-half, 0);
  roofShape.lineTo(half, 0);
  roofShape.lineTo(0, ROOF_HEIGHT);
  roofShape.closePath();
  const roofGeometry = new ExtrudeGeometry(roofShape, { depth: BODY_DEPTH + 0.32, bevelEnabled: false });
  roofGeometry.translate(0, 0, -(BODY_DEPTH + 0.32) / 2);
  const roof = new Mesh(roofGeometry, materials.roof);
  roof.position.y = FLOOR_Y + BODY_HEIGHT;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  addBox(
    group,
    materials.woodDark,
    0,
    FLOOR_Y + BODY_HEIGHT + ROOF_HEIGHT - 0.02,
    0,
    0.07,
    0.07,
    BODY_DEPTH + 0.36,
    'ridge',
  );

  // Chimney, rising out of the roof slope.
  addBox(group, materials.brick, -0.46, FLOOR_Y + 1.36, -0.34, 0.3, 0.9, 0.3, 'chimney');
  addBox(group, materials.stone, -0.46, FLOOR_Y + 1.83, -0.34, 0.38, 0.08, 0.38, 'chimney-cap');
  addBox(group, materials.woodDark, -0.46, FLOOR_Y + 1.73, -0.34, 0.34, 0.05, 0.34, 'chimney-band');

  // Door with frame, step and a porch canopy.
  const doorZ = BODY_DEPTH / 2;
  addBox(group, materials.woodDark, 0, FLOOR_Y + 0.35, doorZ + 0.01, 0.46, 0.72, 0.05, 'door-frame');
  addBox(group, materials.wood, 0, FLOOR_Y + 0.33, doorZ + 0.035, 0.36, 0.64, 0.06, 'door');
  addBox(group, materials.woodDark, 0, FLOOR_Y + 0.33, doorZ + 0.05, 0.05, 0.64, 0.02, 'door-seam');

  const knob = new Mesh(new SphereGeometry(0.035, 10, 8), materials.brass);
  knob.position.set(0.13, FLOOR_Y + 0.32, doorZ + 0.075);
  knob.castShadow = true;
  group.add(knob);

  addBox(group, materials.stone, 0, FLOOR_Y - 0.06, doorZ + 0.2, 0.56, 0.1, 0.3, 'step');

  const porchRoof = addBox(
    group,
    materials.roof,
    0,
    FLOOR_Y + 0.86,
    doorZ + 0.24,
    0.92,
    0.06,
    0.52,
    'porch-roof',
  );
  porchRoof.rotation.x = -0.16;
  for (const sx of [-1, 1]) {
    const post = new Mesh(UNIT_POST, materials.wood);
    post.position.set(sx * 0.36, FLOOR_Y + 0.42, doorZ + 0.42);
    post.scale.set(0.06, 0.86, 0.06);
    post.castShadow = true;
    group.add(post);
  }

  // Windows: two on the front, one on the west wall.
  addWindow(group, -0.46, FLOOR_Y + 0.62, doorZ + 0.02, 0);
  addWindow(group, 0.46, FLOOR_Y + 0.62, doorZ + 0.02, 0);
  addWindow(group, -BODY_WIDTH / 2 - 0.02, FLOOR_Y + 0.6, 0, -Math.PI / 2);

  // Planter under the left front window.
  addBox(group, materials.wood, -0.46, FLOOR_Y + 0.44, doorZ + 0.09, 0.46, 0.13, 0.18, 'planter');
  const blossomGeometry = new SphereGeometry(0.045, 8, 6);
  for (let i = 0; i < 5; i++) {
    const blossom = new Mesh(blossomGeometry, i % 2 === 0 ? materials.leafLight : materials.leaf);
    blossom.position.set(-0.62 + i * 0.08, FLOOR_Y + 0.53, doorZ + 0.09);
    blossom.castShadow = true;
    group.add(blossom);
  }

  const light = new PointLight('#ffb066', 0, 10, 2);
  light.position.set(0, FLOOR_Y + 1.3, doorZ + 0.35);
  group.add(light);

  let litAmount = 0;

  return {
    group,
    update(ctx: FrameContext) {
      const wanted = ctx.state.houseLights ? 1 : 0;
      litAmount = damp(litAmount, wanted, 4.5, ctx.dt);

      materials.housePane.emissiveIntensity = litAmount * (0.35 + 1.55 * ctx.night);
      light.intensity = litAmount * (0.3 + 2.6 * ctx.night);
      light.distance = 7 + 3 * ctx.night;
    },
  };
}
