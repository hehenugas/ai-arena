import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Frame } from '../frame';
import { mulberry32 } from '../utils/math';
import { houseToWorld, LAYOUT } from './layout';
import { MAT } from './materials';
import { islandRadiusAt, pondDistance, terrainHeight, WATER_LEVEL } from './terrain';

const box = new THREE.BoxGeometry(1, 1, 1);
const stoneGeo = new THREE.CylinderGeometry(1, 1.1, 1, 7);
const rockGeo = new THREE.DodecahedronGeometry(1, 0);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** World-space centreline of the garden path, from the front door to the jetty. */
export const PATH_POINTS: ReadonlyArray<THREE.Vector2> = [
  houseToWorld(0, 0.95),
  houseToWorld(0.08, 1.45),
  { x: 0.85, z: 1.6 },
  { x: 0.2, z: 1.9 },
  { x: -0.42, z: 1.88 },
].map((p) => new THREE.Vector2(p.x, p.z));

function distanceToPath(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const a = PATH_POINTS[i];
    const b = PATH_POINTS[i + 1];
    const abx = b.x - a.x;
    const abz = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * abz) / (abx * abx + abz * abz)));
    best = Math.min(best, Math.hypot(x - (a.x + abx * t), z - (a.y + abz * t)));
  }
  return best;
}

/** Keeps decorative scatter away from buildings, water and paths. */
function isOpenGround(x: number, z: number, pad = 0): boolean {
  const r = Math.hypot(x, z);
  if (r > islandRadiusAt(Math.atan2(z, x)) * 0.9) return false;
  if (pondDistance(x, z) < 1.3 + pad) return false;
  const h = LAYOUT.house;
  if (Math.hypot(x - h.x, z - h.z) < 1.25 + pad) return false;
  const w = LAYOUT.windmill;
  if (Math.hypot(x - w.x, z - w.z) < 0.78 + pad) return false;
  const g = LAYOUT.garden;
  if (Math.hypot(x - g.x, z - g.z) < 0.78 + pad) return false;
  for (const t of LAYOUT.trees) if (Math.hypot(x - t.x, z - t.z) < 0.22 * t.size + pad) return false;
  return distanceToPath(x, z) > 0.28 + pad;
}

export class Props {
  readonly group = new THREE.Group();
  private readonly floaters: Array<{ obj: THREE.Object3D; baseY: number; phase: number }> = [];

  constructor(quality: 'full' | 'lite') {
    this.group.name = 'props';
    const rand = mulberry32(21);
    this.buildPath(rand);
    this.buildJetty();
    this.buildGarden(rand);
    this.buildBench();
    this.buildRocks(rand);
    this.buildFlowers(rand, quality === 'full' ? 105 : 75);
    this.buildGrass(rand, quality === 'full' ? 170 : 110);
    this.buildFloaters();
  }

  private buildPath(rand: () => number) {
    const pts = PATH_POINTS;
    const tmp = new THREE.Vector2();
    let carry = 0.12;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = a.distanceTo(b);
      for (let d = carry; d < len; d += 0.3) {
        tmp.lerpVectors(a, b, d / len);
        const side = (rand() - 0.5) * 0.08;
        const nx = -(b.y - a.y) / len;
        const nz = (b.x - a.x) / len;
        const x = tmp.x + nx * side;
        const z = tmp.y + nz * side;
        const s = 0.11 + rand() * 0.035;
        const st = mesh(stoneGeo, rand() > 0.5 ? MAT.stone : MAT.stoneDark, false);
        st.scale.set(s, 0.05, s * (0.8 + rand() * 0.3));
        st.rotation.y = rand() * Math.PI;
        st.position.set(x, terrainHeight(x, z) + 0.005, z);
        this.group.add(st);
        carry = d + 0.3 - len;
      }
    }
  }

  private buildJetty() {
    const p = LAYOUT.pond;
    const start = PATH_POINTS[PATH_POINTS.length - 1];
    const dir = new THREE.Vector2(p.x - start.x, p.z - start.y).normalize();
    const len = 0.95;
    const deckY = Math.max(terrainHeight(start.x, start.y), WATER_LEVEL) + 0.07;
    const g = new THREE.Group();
    g.position.set(start.x + dir.x * 0.1, deckY, start.y + dir.y * 0.1);
    g.rotation.y = Math.atan2(dir.x, dir.y);
    for (let i = 0; i < 7; i++) {
      const plank = mesh(box, i % 2 ? MAT.wood : MAT.woodLight);
      plank.scale.set(0.42, 0.035, len / 7 - 0.015);
      plank.position.set(0, 0, (i + 0.5) * (len / 7));
      g.add(plank);
    }
    for (const px of [-0.18, 0.18]) {
      for (const pz of [0.35, len - 0.05]) {
        const post = mesh(box, MAT.woodDark);
        post.scale.set(0.05, 0.4, 0.05);
        post.position.set(px, -0.14, pz);
        g.add(post);
      }
    }
    const tip = mesh(box, MAT.woodDark);
    tip.scale.set(0.045, 0.22, 0.045);
    tip.position.set(0.18, 0.1, len - 0.05);
    g.add(tip);
    this.group.add(g);
  }

  private buildGarden(rand: () => number) {
    const { x, z } = LAYOUT.garden;
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = LAYOUT.house.ry;
    const hx = 0.5;
    const hz = 0.42;

    const bed = mesh(box, MAT.soil);
    bed.scale.set(hx * 1.6, 0.07, hz * 1.55);
    bed.position.y = 0.02;
    g.add(bed);
    const sproutGeo = new THREE.IcosahedronGeometry(0.05, 0);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const sx = -0.3 + c * 0.15;
        const sz = -0.2 + r * 0.2;
        if (r === 1 && (c === 1 || c === 3)) {
          const p = mesh(sproutGeo, MAT.pumpkin);
          p.scale.set(1.5, 1.05, 1.5);
          p.position.set(sx, 0.09, sz);
          g.add(p);
        } else {
          const s = mesh(sproutGeo, MAT.sprout);
          s.scale.setScalar(0.8 + rand() * 0.5);
          s.position.set(sx, 0.08, sz);
          g.add(s);
        }
      }
    }

    // Picket fence with a gate gap facing the path.
    const corners: Array<[number, number]> = [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ];
    const addPost = (px: number, pz: number) => {
      const post = mesh(box, MAT.woodLight);
      post.scale.set(0.04, 0.28, 0.04);
      post.position.set(px, 0.12, pz);
      g.add(post);
      const cap = mesh(box, MAT.woodLight);
      cap.scale.set(0.028, 0.028, 0.028);
      cap.rotation.set(Math.PI / 4, 0, Math.PI / 4);
      cap.position.set(px, 0.27, pz);
      g.add(cap);
    };
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 4];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 0.2);
      const isGateSide = i === 3;
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const px = ax + (bx - ax) * t;
        const pz = az + (bz - az) * t;
        if (isGateSide && Math.abs(pz) < 0.14) continue;
        addPost(px, pz);
      }
      const railRuns: Array<[number, number]> = isGateSide ? [[0, 0.33], [0.67, 1]] : [[0, 1]];
      for (const [t0, t1] of railRuns) {
        const mx = ax + (bx - ax) * ((t0 + t1) / 2);
        const mz = az + (bz - az) * ((t0 + t1) / 2);
        for (const ry of [0.08, 0.2]) {
          const rail = mesh(box, MAT.wood);
          rail.scale.set(0.025, 0.03, len * (t1 - t0));
          rail.position.set(mx, ry, mz);
          rail.rotation.y = Math.atan2(bx - ax, bz - az);
          g.add(rail);
        }
      }
    }
    this.group.add(g);
  }

  private buildBench() {
    const x = -0.95;
    const z = 0.15;
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = Math.atan2(LAYOUT.pond.x - x, LAYOUT.pond.z - z);
    const seat = mesh(box, MAT.woodLight);
    seat.scale.set(0.5, 0.035, 0.16);
    seat.position.y = 0.16;
    g.add(seat);
    const back = mesh(box, MAT.woodLight);
    back.scale.set(0.5, 0.12, 0.03);
    back.position.set(0, 0.28, -0.08);
    back.rotation.x = -0.15;
    g.add(back);
    for (const lx of [-0.2, 0.2]) {
      const leg = mesh(box, MAT.woodDark);
      leg.scale.set(0.035, 0.16, 0.14);
      leg.position.set(lx, 0.08, 0);
      g.add(leg);
    }
    this.group.add(g);
  }

  private buildRocks(rand: () => number) {
    const spots: Array<[number, number, number]> = [
      [-3.05, 0.75, 0.2],
      [-2.75, 2.35, 0.14],
      [-0.72, 0.95, 0.1],
      [-2.2, 2.55, 0.09],
      [4.05, -2.35, 0.24],
      [1.6, 3.85, 0.18],
      [-1.35, -3.95, 0.2],
      [2.65, 3.35, 0.12],
      [-4.2, 1.4, 0.16],
      [-1.75, -1.1, 0.1],
    ];
    for (const [x, z, s] of spots) {
      const r = mesh(rockGeo, rand() > 0.4 ? MAT.stone : MAT.stoneDark);
      r.scale.set(s * (1 + rand() * 0.4), s * (0.6 + rand() * 0.3), s * (1 + rand() * 0.3));
      r.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      r.position.set(x, terrainHeight(x, z) + s * 0.15, z);
      this.group.add(r);
      if (s > 0.12) {
        const pebble = mesh(rockGeo, MAT.stoneDark);
        pebble.scale.setScalar(s * 0.4);
        pebble.position.set(x + s * 1.3, terrainHeight(x + s * 1.3, z + s * 0.6) + 0.02, z + s * 0.6);
        this.group.add(pebble);
      }
    }
  }

  private buildFlowers(rand: () => number, count: number) {
    const clusters: Array<[number, number, number]> = [
      [-0.3, 0.55, 0.45],
      [1.9, 1.15, 0.4],
      [-2.9, -1.3, 0.5],
      [-0.4, 2.7, 0.55],
      [-3.35, 1.7, 0.45],
      [0.9, 2.9, 0.5],
      [3.4, 0.45, 0.45],
      [-1.4, -2.75, 0.45],
      [2.3, 2.45, 0.4],
    ];
    const palette = [0xf2c14e, 0xe98a9a, 0xf6f0e6, 0xb79ae0, 0xf08a5d].map((c) => new THREE.Color(c));
    const headGeo = new THREE.IcosahedronGeometry(0.04, 0);
    const stemGeo = new THREE.CylinderGeometry(0.006, 0.008, 1, 3);
    stemGeo.translate(0, 0.5, 0);
    const heads = new THREE.InstancedMesh(
      headGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }),
      count,
    );
    const stems = new THREE.InstancedMesh(stemGeo, MAT.sprout, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 20) {
      const [cx, cz, cr] = clusters[Math.floor(rand() * clusters.length)];
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * cr;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (!isOpenGround(x, z, -0.12)) continue;
      const h = 0.07 + rand() * 0.07;
      const y = terrainHeight(x, z);
      s.set(1, h, 1);
      p.set(x, y - 0.01, z);
      m.compose(p, q.identity(), s);
      stems.setMatrixAt(placed, m);
      const hs = 0.7 + rand() * 0.6;
      p.set(x, y + h, z);
      s.setScalar(hs);
      q.setFromEuler(new THREE.Euler(rand(), rand() * 3, rand()));
      m.compose(p, q, s);
      heads.setMatrixAt(placed, m);
      heads.setColorAt(placed, palette[Math.floor(rand() * palette.length)]);
      placed++;
    }
    heads.count = stems.count = placed;
    heads.castShadow = false;
    heads.receiveShadow = stems.receiveShadow = true;
    this.group.add(heads, stems);
  }

  private buildGrass(rand: () => number, count: number) {
    const blades: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.ConeGeometry(0.022, 0.14, 3);
      c.translate(0, 0.07, 0);
      c.rotateZ((i - 1) * 0.35);
      c.rotateY((i * Math.PI * 2) / 3);
      c.translate((i - 1) * 0.02, 0, 0);
      blades.push(c);
    }
    const tuft = mergeGeometries(blades);
    if (!tuft) return;
    const grass = new THREE.InstancedMesh(tuft, MAT.grassTuft, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 20) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 4.8;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (!isOpenGround(x, z, -0.05)) continue;
      p.set(x, terrainHeight(x, z) - 0.01, z);
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      s.setScalar(0.55 + rand() * 0.5);
      m.compose(p, q, s);
      grass.setMatrixAt(placed++, m);
    }
    grass.count = placed;
    grass.receiveShadow = true;
    this.group.add(grass);
  }

  private buildFloaters() {
    const specs: Array<[number, number, number, number]> = [
      [-6.3, -1.3, -1.8, 0.42],
      [5.6, -2.5, -2.6, 0.28],
      [1.2, -3.4, -6.3, 0.24],
    ];
    specs.forEach(([x, y, z, s], i) => {
      const g = new THREE.Group();
      const rock = mesh(rockGeo, MAT.stone);
      rock.scale.set(s, s * 1.3, s);
      rock.position.y = -s * 0.55;
      g.add(rock);
      const top = mesh(new THREE.CylinderGeometry(s * 0.95, s * 0.8, s * 0.3, 7), MAT.leaves[2]);
      top.position.y = s * 0.2;
      g.add(top);
      if (i === 0) {
        const bush = mesh(new THREE.IcosahedronGeometry(s * 0.35, 0), MAT.leaves[0]);
        bush.position.set(s * 0.2, s * 0.55, 0);
        g.add(bush);
      }
      g.position.set(x, y, z);
      this.group.add(g);
      this.floaters.push({ obj: g, baseY: y, phase: i * 2.1 });
    });
  }

  update(frame: Frame): void {
    for (const f of this.floaters) {
      f.obj.position.y = f.baseY + Math.sin(frame.elapsed * 0.6 + f.phase) * 0.1 * frame.motion;
      f.obj.rotation.y += frame.dt * 0.05 * frame.motion;
    }
  }
}
