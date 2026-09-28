import * as THREE from 'three';
import type { Frame } from '../frame';
import { mulberry32 } from '../utils/math';
import { LAYOUT } from './layout';
import { MAT } from './materials';
import { terrainHeight } from './terrain';

const blobGeo = new THREE.IcosahedronGeometry(1, 1);
const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 1, 6);
trunkGeo.translate(0, 0.5, 0);
const coneGeo = new THREE.ConeGeometry(1, 1, 7);

interface TreeRig {
  root: THREE.Group;
  crown: THREE.Group;
  phase: number;
  offset: number;
  stiffness: number;
}

export interface TreeFootprint {
  x: number;
  z: number;
  radius: number;
  top: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const axis = new THREE.Vector3();
const q = new THREE.Quaternion();
const qJitter = new THREE.Quaternion();
const jitterAxis = new THREE.Vector3();

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class Trees {
  readonly group = new THREE.Group();
  readonly footprints: TreeFootprint[] = [];
  private readonly rigs: TreeRig[] = [];
  private readonly baseRotations: THREE.Quaternion[];

  constructor() {
    this.group.name = 'trees';
    const rand = mulberry32(7);
    LAYOUT.trees.forEach((t, i) => {
      const root = new THREE.Group();
      root.position.set(t.x, terrainHeight(t.x, t.z) - 0.03, t.z);
      root.rotation.y = rand() * Math.PI * 2;
      const crown = new THREE.Group();
      const s = t.size;
      let trunkH: number;
      let top: number;
      let radius: number;

      if (t.kind === 'round') {
        trunkH = 0.62 * s;
        const trunk = mesh(trunkGeo, MAT.trunk);
        trunk.scale.set(s, trunkH, s);
        root.add(trunk);
        const leaf = MAT.leaves[i % MAT.leaves.length];
        const alt = MAT.leaves[(i + 1) % MAT.leaves.length];
        const blobs: Array<[number, number, number, number, THREE.Material]> = [
          [0, 0.32, 0, 0.5, leaf],
          [0.28, 0.12, 0.12, 0.34, alt],
          [-0.24, 0.16, -0.14, 0.36, leaf],
          [0.05, 0.62, -0.05, 0.3, alt],
        ];
        for (const [bx, by, bz, br, m] of blobs) {
          const b = mesh(blobGeo, m);
          b.position.set(bx * s, by * s, bz * s);
          b.scale.set(br * s, br * s * 0.92, br * s);
          b.rotation.set(rand() * 3, rand() * 3, 0);
          crown.add(b);
        }
        top = trunkH + 0.9 * s;
        radius = 0.62 * s;
      } else if (t.kind === 'pine') {
        trunkH = 0.35 * s;
        const trunk = mesh(trunkGeo, MAT.trunk);
        trunk.scale.set(s * 0.9, trunkH + 0.2, s * 0.9);
        root.add(trunk);
        const tiers: Array<[number, number, number]> = [
          [0.52, 0.72, 0.28],
          [0.41, 0.62, 0.62],
          [0.29, 0.52, 0.94],
        ];
        tiers.forEach(([r, h, y], k) => {
          const c = mesh(coneGeo, k % 2 ? MAT.pineLight : MAT.pine);
          c.scale.set(r * s, h * s, r * s);
          c.position.y = y * s;
          c.rotation.y = k * 0.4;
          crown.add(c);
        });
        top = trunkH + 1.2 * s;
        radius = 0.52 * s;
      } else {
        trunkH = 0.45 * s;
        const trunk = mesh(trunkGeo, MAT.birch);
        trunk.scale.set(s * 0.8, trunkH + 0.3, s * 0.8);
        root.add(trunk);
        const b = mesh(blobGeo, MAT.leaves[2]);
        b.scale.set(0.34 * s, 0.85 * s, 0.34 * s);
        b.position.y = 0.72 * s;
        crown.add(b);
        const b2 = mesh(blobGeo, MAT.leaves[0]);
        b2.scale.set(0.24 * s, 0.5 * s, 0.24 * s);
        b2.position.set(0.14 * s, 0.4 * s, 0.1 * s);
        crown.add(b2);
        top = trunkH + 1.55 * s;
        radius = 0.36 * s;
      }
      crown.position.y = trunkH;
      root.add(crown);
      this.group.add(root);
      this.rigs.push({ root, crown, phase: rand() * 10, offset: rand() * Math.PI * 2, stiffness: 0.8 + rand() * 0.4 });
      this.footprints.push({ x: t.x, z: t.z, radius, top: root.position.y + top });
    });
    this.baseRotations = this.rigs.map((r) => r.root.quaternion.clone());
  }

  update(frame: Frame): void {
    const w = frame.wind;
    // Axis perpendicular to the wind, so rotating about it tips the crown downwind.
    axis.crossVectors(UP, frame.windDir).normalize();
    const freq = 1.1 + w * 1.6;
    this.rigs.forEach((rig, i) => {
      rig.phase += frame.dt * freq * rig.stiffness;
      const gust = Math.sin(rig.phase + rig.offset) + 0.35 * Math.sin(rig.phase * 2.3 + rig.offset * 1.7);
      const lean = w * 0.06 / rig.stiffness;
      const sway = w * (0.018 + 0.024 * w) * gust * (0.5 + 0.5 * frame.motion);
      const angle = lean + sway;

      q.setFromAxisAngle(axis, angle * 0.25);
      rig.root.quaternion.copy(q).multiply(this.baseRotations[i]);

      // Crown is a child of the rotated root, so express the wind axis in its local frame.
      jitterAxis.copy(axis).applyQuaternion(qJitter.copy(rig.root.quaternion).invert());
      rig.crown.quaternion.setFromAxisAngle(jitterAxis, angle * 0.9);
    });
  }
}
