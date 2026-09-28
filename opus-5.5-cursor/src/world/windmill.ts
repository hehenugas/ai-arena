import * as THREE from 'three';
import type { Frame } from '../frame';
import { damp } from '../utils/math';
import { LAYOUT } from './layout';
import { MAT } from './materials';
import { terrainHeight } from './terrain';

const box = new THREE.BoxGeometry(1, 1, 1);

function part(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(box, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

const TOWER_BASE = 0.16;
const TOWER_H = 1.75;
const HUB_Y = 2.08;

export class Windmill {
  readonly group = new THREE.Group();
  private readonly rotor = new THREE.Group();
  private omega = 0;

  constructor() {
    const { x, z, ry } = LAYOUT.windmill;
    this.group.position.set(x, terrainHeight(x, z) - 0.02, z);
    this.group.rotation.y = ry;
    this.group.name = 'windmill';
    const g = this.group;

    const octa = (rt: number, rb: number, h: number, mat: THREE.Material, y: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8), mat);
      m.rotation.y = Math.PI / 8;
      m.position.y = y;
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      return m;
    };
    octa(0.56, 0.62, 0.24, MAT.stone, 0.06);
    octa(0.33, 0.5, TOWER_H, MAT.wall, TOWER_BASE + TOWER_H / 2);
    const radiusAt = (y: number) => 0.5 - 0.17 * ((y - TOWER_BASE) / TOWER_H);
    for (const by of [0.72, 1.36]) {
      const r = radiusAt(by) + 0.012;
      octa(r, r + 0.004, 0.05, MAT.woodDark, by);
    }
    octa(0.4, 0.4, 0.09, MAT.woodDark, TOWER_BASE + TOWER_H + 0.02);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.47, 0.62, 8), MAT.roof);
    cap.rotation.y = Math.PI / 8;
    cap.position.y = TOWER_BASE + TOWER_H + 0.37;
    cap.castShadow = true;
    g.add(cap);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), MAT.brass);
    finial.position.y = cap.position.y + 0.33;
    g.add(finial);

    // Door and window sit on the flat front face of the octagon.
    const faceZ = (y: number) => radiusAt(y) * Math.cos(Math.PI / 8);
    g.add(part(MAT.woodLight, 0.3, 0.5, 0.03, 0, TOWER_BASE + 0.25, faceZ(0.4) + 0.01));
    g.add(part(MAT.wood, 0.24, 0.44, 0.04, 0, TOWER_BASE + 0.22, faceZ(0.4) + 0.02));
    const win = part(MAT.glass, 0.16, 0.2, 0.03, 0, 1.22, faceZ(1.22) + 0.005);
    g.add(win);
    g.add(part(MAT.woodDark, 0.22, 0.26, 0.02, 0, 1.22, faceZ(1.22) - 0.005));
    g.add(part(MAT.stone, 0.4, 0.08, 0.2, 0, 0.04, faceZ(0.1) + 0.1));

    // Tail beam at the back, as on a traditional mill.
    const tail = part(MAT.woodDark, 0.045, 0.045, 2.05, 0, 0.98, -0.78);
    tail.rotation.x = -1.07;
    g.add(tail);
    g.add(part(MAT.stoneDark, 0.14, 0.08, 0.14, 0, 0.04, -1.25));

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.34, 10), MAT.woodDark);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, HUB_Y, 0.38);
    hub.castShadow = true;
    g.add(hub);

    this.rotor.position.set(0, HUB_Y, 0.58);
    g.add(this.rotor);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 10), MAT.brass);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.06;
    this.rotor.add(cone);

    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group();
      arm.rotation.z = (k * Math.PI) / 2 + 0.3;
      arm.add(part(MAT.woodDark, 0.055, 1.28, 0.045, 0, 0.64, 0));
      arm.add(part(MAT.sail, 0.26, 0.96, 0.012, 0.16, 0.74, -0.01));
      arm.add(part(MAT.wood, 0.02, 0.98, 0.025, 0.3, 0.74, 0));
      for (let i = 0; i < 5; i++) {
        arm.add(part(MAT.wood, 0.3, 0.016, 0.02, 0.15, 0.3 + i * 0.22, 0.012));
      }
      this.rotor.add(arm);
    }
  }

  update(frame: Frame): void {
    const target = frame.wind * 3.4 * (0.55 + 0.45 * frame.motion);
    this.omega = damp(this.omega, target, 1.8, frame.dt);
    if (target < 1e-3 && this.omega < 0.02) this.omega = 0;
    this.rotor.rotation.z -= this.omega * frame.dt;
  }
}
