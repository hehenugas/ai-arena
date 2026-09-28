import * as THREE from "three";
import { WIND_DIR_X, WIND_DIR_Z } from "./wind";
import type { Materials } from "./materials";

const BODY_W = 1.36;
const BODY_H = 0.9;
const BODY_D = 1.04;
const PLINTH = 0.15;

export type HouseUpdate = {
  lightsMix: number;
  night: number;
  wind: number;
  weatherMix: number;
  elapsed: number;
  reduced: boolean;
};

export type House = {
  root: THREE.Group;
  update: (frame: HouseUpdate) => void;
};

export function isHouseObject(object: THREE.Object3D | null): boolean {
  let current = object;
  while (current) {
    if (current.userData.house === true) return true;
    current = current.parent;
  }
  return false;
}

export function createHouse(materials: Materials): House {
  const root = new THREE.Group();
  root.name = "house";
  const pick = new THREE.Group();
  pick.userData.house = true;
  root.add(pick);

  const wallTop = PLINTH + BODY_H;
  const halfW = BODY_W / 2;
  const halfD = BODY_D / 2;

  add(pick, box(BODY_W + 0.16, PLINTH, BODY_D + 0.14), materials.stone, 0, PLINTH / 2 - 0.02, 0, true);
  add(pick, box(BODY_W, BODY_H, BODY_D), materials.plaster, 0, PLINTH + BODY_H / 2 - 0.02, 0, true);

  const corners: Array<[number, number]> = [
    [halfW, halfD],
    [-halfW, halfD],
    [halfW, -halfD],
    [-halfW, -halfD],
  ];
  for (const [x, z] of corners) {
    add(pick, box(0.055, BODY_H + 0.02, 0.055), materials.wood, x, PLINTH + BODY_H / 2 - 0.02, z, true);
  }

  const rise = 0.5;
  const overhangX = 0.8;
  const slopeLen = Math.hypot(overhangX, rise);
  const slopeAngle = Math.atan2(rise, overhangX);
  const roofDepth = BODY_D + 0.28;
  const eaveY = wallTop - 0.02;
  const ridgeY = eaveY + rise;
  const slopeGeo = box(slopeLen + 0.04, 0.07, roofDepth);
  const left = add(pick, slopeGeo, materials.roof, -overhangX / 2, eaveY + rise / 2, 0, true);
  left.rotation.z = slopeAngle;
  const right = add(pick, slopeGeo, materials.roof, overhangX / 2, eaveY + rise / 2, 0, true);
  right.rotation.z = -slopeAngle;
  add(pick, box(0.1, 0.07, roofDepth + 0.04), materials.woodDark, 0, ridgeY + 0.01, 0, true);

  const gableGeo = createGable(BODY_W, rise, eaveY);
  const frontGable = new THREE.Mesh(gableGeo, materials.plaster);
  frontGable.position.z = halfD;
  frontGable.castShadow = true;
  frontGable.receiveShadow = true;
  pick.add(frontGable);
  const backGable = new THREE.Mesh(gableGeo, materials.plaster);
  backGable.position.z = -halfD;
  backGable.rotation.y = Math.PI;
  backGable.castShadow = true;
  backGable.receiveShadow = true;
  pick.add(backGable);

  const chimney = add(pick, box(0.2, 0.48, 0.2), materials.brick, -0.34, ridgeY - 0.02, -0.16, true);
  add(pick, box(0.26, 0.05, 0.26), materials.brick, -0.34, ridgeY + 0.22, -0.16, true);
  add(pick, box(0.12, 0.08, 0.12), materials.rock, -0.34, ridgeY + 0.28, -0.16, false);

  add(pick, box(0.3, 0.54, 0.04), materials.woodDark, 0, PLINTH + 0.25, halfD + 0.02, true);
  add(pick, box(0.22, 0.16, 0.015), materials.wood, 0, PLINTH + 0.34, halfD + 0.045, false);
  add(pick, box(0.22, 0.16, 0.015), materials.wood, 0, PLINTH + 0.14, halfD + 0.045, false);
  const knob = add(pick, new THREE.SphereGeometry(0.025, 8, 6), materials.metal, 0.09, PLINTH + 0.26, halfD + 0.05, false);
  knob.scale.set(1, 1, 0.7);
  add(pick, box(0.42, 0.05, 0.06), materials.wood, 0, PLINTH + 0.56, halfD + 0.03, false);
  add(pick, box(0.5, 0.06, 0.18), materials.stone, 0, 0.05, halfD + 0.16, false);
  add(pick, box(0.38, 0.045, 0.12), materials.stone, 0, 0.09, halfD + 0.1, false);

  const frameGeo = box(0.26, 0.32, 0.04);
  const glassGeo = box(0.18, 0.22, 0.02);
  const mullV = box(0.016, 0.22, 0.025);
  const mullH = box(0.18, 0.016, 0.025);
  const sillGeo = box(0.3, 0.035, 0.07);
  const windowY = PLINTH + 0.58;

  addWindow(pick, materials, frameGeo, glassGeo, mullV, mullH, sillGeo, -0.4, windowY, halfD + 0.02, 0);
  addWindow(pick, materials, frameGeo, glassGeo, mullV, mullH, sillGeo, 0.4, windowY, halfD + 0.02, 0);
  addWindow(pick, materials, frameGeo, glassGeo, mullV, mullH, sillGeo, -halfW - 0.01, windowY, -0.16, -Math.PI / 2);
  addWindow(pick, materials, frameGeo, glassGeo, mullV, mullH, sillGeo, -halfW - 0.01, windowY, 0.24, -Math.PI / 2);
  addWindow(pick, materials, frameGeo, glassGeo, mullV, mullH, sillGeo, halfW + 0.01, windowY, 0.02, Math.PI / 2);
  addWindow(pick, materials, frameGeo, glassGeo, mullV, mullH, sillGeo, 0.22, windowY, -halfD - 0.01, Math.PI);

  const atticRing = new THREE.Mesh(new THREE.RingGeometry(0.065, 0.095, 18), materials.wood);
  atticRing.position.set(0.08, eaveY + 0.24, halfD + 0.025);
  pick.add(atticRing);
  const attic = new THREE.Mesh(new THREE.CircleGeometry(0.065, 18), materials.glass);
  attic.position.set(0.08, eaveY + 0.24, halfD + 0.03);
  pick.add(attic);

  add(pick, box(0.28, 0.08, 0.1), materials.wood, -0.4, windowY - 0.22, halfD + 0.08, false);
  const bloomGeo = new THREE.SphereGeometry(0.035, 7, 5);
  const blooms: Array<[number, string]> = [
    [-0.08, "#e7b1a2"],
    [0, "#f0d48a"],
    [0.08, "#f7f3ea"],
  ];
  for (const [x, color] of blooms) {
    const bloom = new THREE.Mesh(
      bloomGeo,
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 }),
    );
    bloom.position.set(-0.4 + x, windowY - 0.14, halfD + 0.08);
    pick.add(bloom);
  }

  add(pick, new THREE.CylinderGeometry(0.018, 0.024, 0.34, 6), materials.woodDark, 0.34, 0.16, halfD + 0.22, false);
  const lamp = add(pick, box(0.1, 0.12, 0.1), materials.lantern, 0.34, 0.38, halfD + 0.22, false);
  lamp.castShadow = false;
  add(pick, new THREE.ConeGeometry(0.075, 0.06, 6), materials.woodDark, 0.34, 0.47, halfD + 0.22, false);

  const hit = new THREE.Mesh(
    box(1.72, 1.9, 1.48),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  hit.position.y = 0.95;
  hit.castShadow = false;
  hit.receiveShadow = false;
  pick.add(hit);

  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.15, 28), materials.glow);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.025;
  glow.raycast = () => undefined;
  root.add(glow);

  const light = new THREE.PointLight("#ffb86a", 0, 6.5, 2);
  light.position.set(0, 0.72, 0.12);
  root.add(light);

  const puffs = createSmoke(root, chimney.position);

  const dayGlass = new THREE.Color("#8eb6c8");
  const nightGlass = new THREE.Color("#1d3148");
  const litGlass = new THREE.Color("#ffc56a");

  return {
    root,
    update(frame) {
      const prominence = frame.lightsMix * (0.4 + frame.night * 1.25);
      materials.glass.color.copy(dayGlass).lerp(nightGlass, frame.night);
      materials.glass.color.lerp(litGlass, frame.lightsMix);
      materials.glass.emissiveIntensity = prominence * 2.15;
      materials.lantern.emissiveIntensity = frame.lightsMix * (0.85 + frame.night * 2.5);
      light.intensity = frame.lightsMix * (4.2 + frame.night * 10);
      materials.glow.opacity = frame.lightsMix * (0.1 + frame.night * 0.34);
      updateSmoke(puffs, chimney.position, frame);
    },
  };
}

function createGable(width: number, height: number, y0: number): THREE.BufferGeometry {
  const hw = width / 2;
  const positions = new Float32Array([-hw, y0, 0, hw, y0, 0, 0, y0 + height, 0]);
  const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

function add(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  cast: boolean,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWindow(
  parent: THREE.Object3D,
  materials: Materials,
  frameGeo: THREE.BoxGeometry,
  glassGeo: THREE.BoxGeometry,
  mullV: THREE.BoxGeometry,
  mullH: THREE.BoxGeometry,
  sillGeo: THREE.BoxGeometry,
  x: number,
  y: number,
  z: number,
  rotationY: number,
): void {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(frameGeo, materials.wood);
  frame.castShadow = false;
  frame.receiveShadow = true;
  const glass = new THREE.Mesh(glassGeo, materials.glass);
  glass.position.z = 0.02;
  glass.castShadow = false;
  glass.receiveShadow = true;
  const vertical = new THREE.Mesh(mullV, materials.woodDark);
  vertical.position.z = 0.028;
  const horizontal = new THREE.Mesh(mullH, materials.woodDark);
  horizontal.position.z = 0.028;
  const sill = new THREE.Mesh(sillGeo, materials.woodLight);
  sill.position.set(0, -0.18, 0.03);
  sill.receiveShadow = true;
  group.add(frame, glass, vertical, horizontal, sill);
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  parent.add(group);
}

type Puff = { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; offset: number };

function createSmoke(parent: THREE.Object3D, chimney: THREE.Vector3): Puff[] {
  const puffs: Puff[] = [];
  const geometry = new THREE.SphereGeometry(0.08, 8, 6);
  for (let i = 0; i < 4; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: "#f3f0ea",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.raycast = () => undefined;
    mesh.position.copy(chimney);
    parent.add(mesh);
    puffs.push({ mesh, material, offset: i / 4 });
  }
  return puffs;
}

function updateSmoke(puffs: Puff[], chimney: THREE.Vector3, frame: HouseUpdate): void {
  const ry = parentRotation(puffs[0].mesh);
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  const localX = cos * WIND_DIR_X - sin * WIND_DIR_Z;
  const localZ = sin * WIND_DIR_X + cos * WIND_DIR_Z;
  for (const puff of puffs) {
    const t = frame.reduced ? puff.offset : (frame.elapsed * 0.22 + puff.offset) % 1;
    const drift = t * (0.08 + frame.wind * 0.7);
    puff.mesh.position.set(
      chimney.x + localX * drift,
      chimney.y + 0.28 + t * 0.62,
      chimney.z + localZ * drift,
    );
    const scale = 0.55 + t * 1.15;
    puff.mesh.scale.setScalar(scale);
    puff.material.opacity = (1 - t) * 0.2 * (1 - frame.weatherMix * 0.55);
  }
}

function parentRotation(mesh: THREE.Object3D): number {
  let rotation = 0;
  let current: THREE.Object3D | null = mesh.parent;
  while (current) {
    rotation += current.rotation.y;
    current = current.parent;
  }
  return rotation;
}
