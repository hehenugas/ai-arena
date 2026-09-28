import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { getTextures, variant } from '../textureSet';

const CREAM = '#f4ead7';
const TRIM = '#fbf5e8';
const WOOD = '#8a5f42';
const WOOD_DARK = '#7a4f35';
const STONE = '#b0a290';
const BRICK = '#a5614c';
const WINDOW_GLASS = '#26323f';
const AMBER = '#ffab4a';

export interface House {
  group: Group;
  update(lightsOn: boolean, nightFactor: number): void;
}

function pentagonShellGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-1.5, 0);
  shape.lineTo(1.5, 0);
  shape.lineTo(1.5, 2.0);
  shape.lineTo(0, 3.05);
  shape.lineTo(-1.5, 2.0);
  shape.closePath();
  const geo = new ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -1.2);
  geo.computeVertexNormals();
  return geo;
}

export function createHouse(): House {
  const { mottle, wood, roof } = getTextures();
  const group = new Group();
  group.name = 'house';

  const wallMat = new MeshStandardMaterial({
    color: CREAM,
    map: variant(mottle, 0.5, 0.5),
    roughness: 0.9,
    metalness: 0,
  });
  const trimMat = new MeshStandardMaterial({ color: TRIM, roughness: 0.75 });
  const woodMat = new MeshStandardMaterial({
    color: WOOD,
    map: variant(wood, 1.4, 1.4),
    roughness: 0.8,
  });
  const doorMat = new MeshStandardMaterial({
    color: WOOD_DARK,
    map: variant(wood, 1.8, 1.8),
    roughness: 0.75,
  });
  const roofMat = new MeshStandardMaterial({
    color: '#ffffff',
    map: variant(roof, 2, 1),
    roughness: 0.85,
  });
  const roofEdgeMat = new MeshStandardMaterial({ color: '#9a4f3c', roughness: 0.85 });
  const stoneMat = new MeshStandardMaterial({ color: STONE, roughness: 0.95 });
  const brickMat = new MeshStandardMaterial({
    color: BRICK,
    map: variant(mottle, 1.2, 1.2),
    roughness: 0.9,
  });
  const paneMat = new MeshStandardMaterial({
    color: WINDOW_GLASS,
    roughness: 0.22,
    metalness: 0.15,
    emissive: new Color(AMBER),
    emissiveIntensity: 0.02,
    side: DoubleSide,
  });

  // Shell (walls + gables in one extruded pentagon)
  const shell = new Mesh(pentagonShellGeometry(), wallMat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  // Stone foundation hides any terrain gap under the walls
  const foundation = new Mesh(new BoxGeometry(3.24, 0.6, 2.64), stoneMat);
  foundation.position.set(0, 0.02, 0);
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  group.add(foundation);

  // Roof: two slabs following the pentagon slopes, plus a ridge cap
  for (const sign of [1, -1]) {
    const eave = new Vector2(sign * 1.5, 2.0);
    const apex = new Vector2(0, 3.05);
    const dir = apex.clone().sub(eave).normalize();
    const normal = new Vector2(dir.y, -dir.x).multiplyScalar(sign > 0 ? 1 : -1);
    const start = eave.clone().sub(dir.clone().multiplyScalar(0.3));
    const end = apex.clone().add(dir.clone().multiplyScalar(0.16));
    const centre = start.clone().add(end).multiplyScalar(0.5).add(normal.multiplyScalar(0.06));
    const len = start.distanceTo(end);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    const slab = new Mesh(new BoxGeometry(len + 0.1, 0.14, 2.86), roofMat);
    slab.position.set(centre.x, centre.y, 0);
    slab.rotation.z = angle;
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  }
  const ridge = new Mesh(new BoxGeometry(0.24, 0.16, 2.94), roofEdgeMat);
  ridge.position.set(0, 3.13, 0);
  ridge.castShadow = true;
  group.add(ridge);

  // Chimney
  const chimney = new Mesh(new BoxGeometry(0.44, 1.2, 0.44), brickMat);
  chimney.position.set(-0.72, 2.9, -0.45);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = new Mesh(new BoxGeometry(0.56, 0.13, 0.56), stoneMat);
  chimneyCap.position.set(-0.72, 3.55, -0.45);
  chimneyCap.castShadow = true;
  group.add(chimneyCap);

  // Front door + trim + stoop
  const door = new Mesh(new BoxGeometry(0.62, 1.16, 0.09), doorMat);
  door.position.set(0.35, 0.6, 1.21);
  group.add(door);
  for (const dx of [-0.37, 0.37]) {
    const jamb = new Mesh(new BoxGeometry(0.1, 1.3, 0.11), trimMat);
    jamb.position.set(0.35 + dx, 0.65, 1.22);
    group.add(jamb);
  }
  const lintel = new Mesh(new BoxGeometry(0.84, 0.11, 0.11), trimMat);
  lintel.position.set(0.35, 1.3, 1.22);
  group.add(lintel);
  const knob = new Mesh(
    new SphereGeometry(0.045, 10, 8),
    new MeshStandardMaterial({ color: '#d8b25a', metalness: 0.7, roughness: 0.35 }),
  );
  knob.position.set(0.54, 0.6, 1.28);
  group.add(knob);
  const stoop = new Mesh(new BoxGeometry(0.98, 0.15, 0.6), stoneMat);
  stoop.position.set(0.35, 0.04, 1.5);
  stoop.castShadow = true;
  stoop.receiveShadow = true;
  group.add(stoop);

  // Framed window helper (front/back orientation)
  const paneGeos: Array<Mesh> = [];
  const addWindow = (
    x: number,
    y: number,
    z: number,
    axis: 'z' | 'x',
    opts: { shutters?: boolean; sill?: boolean } = {},
  ): void => {
    const rotY = axis === 'x' ? Math.PI / 2 : 0;
    const trim = new Mesh(new BoxGeometry(0.74, 0.9, 0.07), trimMat);
    trim.position.set(x, y, z);
    trim.rotation.y = rotY;
    group.add(trim);

    const pane = new Mesh(new BoxGeometry(0.6, 0.76, 0.05), paneMat);
    pane.position.set(x + (axis === 'x' ? Math.sign(x) * 0.02 : 0), y, z + (axis === 'z' ? Math.sign(z) * 0.02 : 0));
    pane.rotation.y = rotY;
    group.add(pane);
    paneGeos.push(pane);

    const muntinV = new Mesh(new BoxGeometry(0.05, 0.76, 0.07), trimMat);
    muntinV.position.copy(pane.position);
    muntinV.rotation.y = rotY;
    if (axis === 'x') muntinV.rotation.y = rotY;
    muntinV.position.x += axis === 'x' ? Math.sign(x) * 0.01 : 0;
    muntinV.position.z += axis === 'z' ? Math.sign(z) * 0.01 : 0;
    muntinV.translateZ(0.005);
    group.add(muntinV);
    const muntinH = new Mesh(new BoxGeometry(0.6, 0.05, 0.07), trimMat);
    muntinH.position.copy(muntinV.position);
    muntinH.rotation.y = rotY;
    group.add(muntinH);

    if (opts.sill && axis === 'z') {
      const sill = new Mesh(new BoxGeometry(0.82, 0.07, 0.13), trimMat);
      sill.position.set(x, y - 0.48, z + Math.sign(z) * 0.03);
      group.add(sill);
    }
    if (opts.shutters && axis === 'z') {
      for (const s of [-1, 1]) {
        const shutter = new Mesh(new BoxGeometry(0.17, 0.86, 0.05), woodMat);
        shutter.position.set(x + s * 0.47, y, z + Math.sign(z) * 0.015);
        group.add(shutter);
      }
    }
  };

  addWindow(-0.78, 1.38, 1.22, 'z', { shutters: true, sill: true });
  addWindow(1.04, 1.38, 1.22, 'z', { shutters: true, sill: true });
  addWindow(1.52, 1.35, 0.1, 'x');
  addWindow(-1.52, 1.35, -0.15, 'x');
  addWindow(0.35, 1.42, -1.22, 'z');

  // Round gable window
  const gablePane = new Mesh(new CylinderGeometry(0.26, 0.26, 0.06, 20), paneMat);
  gablePane.rotation.x = Math.PI / 2;
  gablePane.position.set(0, 2.45, 1.22);
  group.add(gablePane);
  paneGeos.push(gablePane);
  const gableRing = new Mesh(new TorusGeometry(0.3, 0.055, 8, 24), trimMat);
  gableRing.position.set(0, 2.45, 1.24);
  group.add(gableRing);

  // Porch lantern
  const lanternBracket = new Mesh(new BoxGeometry(0.07, 0.18, 0.06), roofEdgeMat);
  lanternBracket.position.set(0.8, 1.5, 1.24);
  group.add(lanternBracket);
  const lantern = new Mesh(new SphereGeometry(0.075, 12, 10), paneMat);
  lantern.position.set(0.8, 1.38, 1.3);
  group.add(lantern);
  paneGeos.push(lantern);

  // Light spilling out of the house (only meaningful when lights are on)
  const spill = new PointLight('#ffb653', 0, 9, 2);
  spill.position.set(0.4, 1.7, 1.9);
  group.add(spill);

  let currentIntensity = -1;
  const update = (lightsOn: boolean, nightFactor: number): void => {
    const target = lightsOn ? 0.5 + 1.5 * nightFactor : 0.02;
    const lightTarget = lightsOn ? 1.5 + 9 * nightFactor : 0;
    if (Math.abs(target - currentIntensity) > 0.001) {
      paneMat.emissiveIntensity = target;
      currentIntensity = target;
    }
    spill.intensity = lightTarget;
  };

  return { group, update };
}
