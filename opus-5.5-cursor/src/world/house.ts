import * as THREE from 'three';
import type { Frame } from '../frame';
import { glowTexture } from '../utils/textures';
import { LAYOUT } from './layout';
import { MAT } from './materials';
import { terrainHeight } from './terrain';

const W = 1.5;
const D = 1.2;
const BASE = 0.18;
const WALL_H = 1.0;
const TOP = BASE + WALL_H;
const RISE = 0.62;

const box = new THREE.BoxGeometry(1, 1, 1);
const flowerGeo = new THREE.IcosahedronGeometry(0.035, 0);
const flowerMats = [0xf2c14e, 0xe98a9a, 0xf6f0e6, 0xb79ae0].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true }),
);

function block(
  mat: THREE.Material,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(box, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeWindow(w: number, h: number, withBox: boolean): THREE.Group {
  const g = new THREE.Group();
  g.add(block(MAT.woodDark, w + 0.08, h + 0.08, 0.04, 0, 0, 0));
  const pane = block(MAT.glass, w, h, 0.03, 0, 0, 0.015);
  pane.castShadow = false;
  g.add(pane);
  g.add(block(MAT.woodDark, 0.025, h, 0.02, 0, 0, 0.035));
  g.add(block(MAT.woodDark, w, 0.025, 0.02, 0, 0, 0.035));
  g.add(block(MAT.woodLight, w + 0.14, 0.035, 0.08, 0, -h / 2 - 0.05, 0.03));
  if (withBox) {
    g.add(block(MAT.wood, w + 0.06, 0.08, 0.1, 0, -h / 2 - 0.1, 0.06));
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(flowerGeo, flowerMats[(i + (w > 0.3 ? 1 : 0)) % flowerMats.length]);
      f.position.set(-w / 2 + 0.05 + (i * (w - 0.1)) / 3, -h / 2 - 0.035, 0.07 + (i % 2) * 0.02);
      g.add(f);
    }
  }
  return g;
}

export class House {
  readonly group = new THREE.Group();
  readonly pickTargets: THREE.Object3D[] = [];
  /** World-space top of the chimney, where smoke is emitted. */
  readonly chimneyTop = new THREE.Vector3();

  private readonly lamp: THREE.PointLight;
  private readonly halos: THREE.Sprite[] = [];
  private readonly haloMat: THREE.SpriteMaterial;
  private readonly body = new THREE.Group();
  private readonly chimneyLocal = new THREE.Vector3();
  private bounce = 1;

  constructor(maxLights: 'full' | 'lite') {
    const { x, z, ry } = LAYOUT.house;
    this.group.position.set(x, terrainHeight(x, z), z);
    this.group.rotation.y = ry;
    this.group.name = 'house';
    this.group.add(this.body);
    const b = this.body;

    // Foundation, walls and timber frame.
    b.add(block(MAT.stone, W + 0.12, 0.26, D + 0.12, 0, 0.05, 0));
    b.add(block(MAT.wall, W, WALL_H, D, 0, BASE + WALL_H / 2, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.add(block(MAT.woodDark, 0.09, WALL_H, 0.09, (sx * W) / 2, BASE + WALL_H / 2, (sz * D) / 2));
      }
    }
    b.add(block(MAT.woodDark, W + 0.06, 0.07, D + 0.06, 0, TOP - 0.02, 0));
    b.add(block(MAT.wood, W + 0.04, 0.05, D + 0.04, 0, BASE + 0.03, 0));

    // Gable roof: triangular prism of plaster capped by stepped shingle rows.
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2, 0);
    tri.lineTo(D / 2, 0);
    tri.lineTo(0, RISE);
    tri.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false });
    gableGeo.translate(0, 0, -W / 2);
    gableGeo.rotateY(Math.PI / 2);
    const gable = new THREE.Mesh(gableGeo, MAT.plaster);
    gable.position.y = TOP;
    gable.castShadow = gable.receiveShadow = true;
    b.add(gable);

    const run = D / 2 + 0.17;
    const slope = Math.atan2(RISE, D / 2);
    const len = run / Math.cos(slope);
    const rows = 5;
    for (const side of [1, -1]) {
      const dir = new THREE.Vector3(0, -Math.sin(slope), Math.cos(slope) * side);
      const normal = new THREE.Vector3(0, Math.cos(slope), Math.sin(slope) * side);
      for (let r = 0; r < rows; r++) {
        const along = ((r + 0.5) / rows) * len;
        const lift = 0.045 + (r % 2) * 0.012;
        const p = new THREE.Vector3(0, TOP + RISE, 0).addScaledVector(dir, along).addScaledVector(normal, lift);
        const row = block(r % 2 ? MAT.roofDark : MAT.roof, W + 0.3, 0.07, (len / rows) * 1.12, 0, p.y, p.z);
        row.rotation.x = slope * side;
        b.add(row);
      }
    }
    b.add(block(MAT.woodDark, W + 0.34, 0.08, 0.1, 0, TOP + RISE + 0.07, 0));

    // Round attic windows on both gables.
    const attic = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16);
    const ring = new THREE.TorusGeometry(0.105, 0.022, 6, 18);
    for (const sx of [-1, 1]) {
      const pane = new THREE.Mesh(attic, MAT.glass);
      pane.rotation.z = Math.PI / 2;
      pane.position.set((sx * W) / 2 + sx * 0.012, TOP + 0.24, 0);
      b.add(pane);
      const frame = new THREE.Mesh(ring, MAT.woodDark);
      frame.rotation.y = Math.PI / 2;
      frame.position.copy(pane.position).setX(pane.position.x + sx * 0.012);
      frame.castShadow = true;
      b.add(frame);
    }

    // Chimney on the back slope.
    const chX = -0.42;
    const chZ = -0.3;
    b.add(block(MAT.brick, 0.22, 0.78, 0.22, chX, TOP + 0.52, chZ));
    b.add(block(MAT.stoneDark, 0.3, 0.06, 0.3, chX, TOP + 0.93, chZ));
    this.chimneyLocal.set(chX, TOP + 1.0, chZ);

    // Front: door, step, awning, windows with flower boxes.
    const fz = D / 2;
    b.add(block(MAT.woodLight, 0.44, 0.7, 0.03, 0, BASE + 0.35, fz + 0.01));
    b.add(block(MAT.wood, 0.34, 0.62, 0.05, 0, BASE + 0.31, fz + 0.025));
    for (const px of [-0.085, 0.085]) b.add(block(MAT.woodDark, 0.012, 0.56, 0.01, px, BASE + 0.31, fz + 0.052));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), MAT.brass);
    knob.position.set(0.11, BASE + 0.3, fz + 0.06);
    b.add(knob);
    b.add(block(MAT.stone, 0.56, 0.1, 0.26, 0, 0.1, fz + 0.14));
    const awning = block(MAT.roofDark, 0.62, 0.04, 0.3, 0, BASE + 0.8, fz + 0.12);
    awning.rotation.x = 0.35;
    b.add(awning);
    for (const px of [-0.26, 0.26]) {
      const brace = block(MAT.woodDark, 0.03, 0.03, 0.2, px, BASE + 0.74, fz + 0.08);
      brace.rotation.x = -0.6;
      b.add(brace);
    }

    const windows: Array<[THREE.Group, number, number, number]> = [
      [makeWindow(0.26, 0.3, true), -0.47, fz + 0.02, 0],
      [makeWindow(0.26, 0.3, true), 0.47, fz + 0.02, 0],
      [makeWindow(0.34, 0.32, true), W / 2 + 0.02, 0, Math.PI / 2],
      [makeWindow(0.34, 0.32, false), -W / 2 - 0.02, 0, -Math.PI / 2],
      [makeWindow(0.3, 0.3, false), 0.3, -fz - 0.02, Math.PI],
    ];
    const tex = glowTexture();
    this.haloMat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xffb257,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const [win, wx, wz, rot] of windows) {
      win.position.set(wx, BASE + 0.56, wz);
      win.rotation.y = rot;
      b.add(win);
      const halo = new THREE.Sprite(this.haloMat);
      const out = new THREE.Vector3(0, 0, 0.14).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      halo.position.copy(win.position).add(out);
      halo.scale.setScalar(0.85);
      halo.renderOrder = 2;
      b.add(halo);
      this.halos.push(halo);
    }

    // Lamp post beside the door; its light warms the path and the front wall.
    const post = block(MAT.woodDark, 0.05, 0.78, 0.05, 0.5, 0.39, fz + 0.42);
    b.add(post);
    b.add(block(MAT.woodDark, 0.18, 0.03, 0.03, 0.44, 0.76, fz + 0.42));
    b.add(block(MAT.metal, 0.11, 0.02, 0.11, 0.38, 0.725, fz + 0.42));
    const lantern = block(MAT.lantern, 0.08, 0.1, 0.08, 0.38, 0.665, fz + 0.42);
    lantern.castShadow = false;
    b.add(lantern);
    b.add(block(MAT.metal, 0.1, 0.02, 0.1, 0.38, 0.605, fz + 0.42));

    this.lamp = new THREE.PointLight(0xffb35c, 0, maxLights === 'full' ? 6 : 5, 2);
    this.lamp.position.set(0.3, 0.8, fz + 0.5);
    b.add(this.lamp);

    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) this.pickTargets.push(o);
    });
    this.group.updateMatrixWorld(true);
    this.chimneyTop.copy(this.chimneyLocal).applyMatrix4(this.group.matrixWorld);
  }

  /** A quick squash-and-stretch so toggling feels tactile. */
  poke(): void {
    this.bounce = 0;
  }

  update(frame: Frame): void {
    const l = frame.lights;
    const n = frame.night;
    MAT.glass.emissiveIntensity = l * (0.9 + 2.1 * n);
    MAT.lantern.emissiveIntensity = l * (1.0 + 2.5 * n);
    this.lamp.intensity = l * (0.6 + 4.2 * n);
    this.lamp.visible = l > 0.01;
    this.haloMat.opacity = l * (0.08 + 0.5 * n);
    for (const h of this.halos) h.visible = l > 0.01;

    if (this.bounce < 1) {
      this.bounce = Math.min(1, this.bounce + frame.dt * 3.2);
      const t = this.bounce;
      const amp = 0.05 * frame.motion * Math.sin(t * Math.PI * 2.5) * (1 - t);
      this.body.scale.set(1 + amp * 0.5, 1 - amp, 1 + amp * 0.5);
    }
  }
}
