import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Color,
  SphereGeometry,
} from 'three';
import { groundHeight } from './island';
import { hash3 } from './noise';

const TRUNK = 0x7c5233;
const LEAF_A = 0x5f9a4c;
const LEAF_B = 0x74ad58;
const PINE_A = 0x3f7040;
const PINE_B = 0x4a7f46;

interface SwayTree {
  group: Group;
  phase: number;
  amp: number;
}

export interface Vegetation {
  group: Group;
  update(elapsed: number, wind: number, reducedMotion: boolean): void;
}

function leafMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
}

function roundTree(scale: number): Group {
  const g = new Group();
  const trunk = new Mesh(
    new CylinderGeometry(0.09 * scale, 0.14 * scale, 0.6 * scale, 7),
    leafMaterial(TRUNK)
  );
  trunk.position.y = 0.3 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const puffs: Array<[number, number, number, number, number]> = [
    [0, 1.0, 0, 0.56, LEAF_A],
    [0.34, 1.3, 0.08, 0.42, LEAF_B],
    [-0.3, 1.34, -0.14, 0.38, LEAF_B],
    [0.02, 1.55, -0.05, 0.34, LEAF_A],
  ];
  for (const [x, y, z, r, c] of puffs) {
    const m = new Mesh(new IcosahedronGeometry(r * scale, 1), leafMaterial(c));
    m.position.set(x * scale, y * scale, z * scale);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

function pineTree(scale: number): Group {
  const g = new Group();
  const trunk = new Mesh(
    new CylinderGeometry(0.07 * scale, 0.11 * scale, 0.5 * scale, 7),
    leafMaterial(TRUNK)
  );
  trunk.position.y = 0.25 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const tiers: Array<[number, number, number, number]> = [
    [0.62, 0.72, 0.72, PINE_A],
    [0.48, 0.6, 1.2, PINE_B],
    [0.34, 0.5, 1.62, PINE_A],
  ];
  for (const [r, h, y, c] of tiers) {
    const m = new Mesh(new ConeGeometry(r * scale, h * scale, 8), leafMaterial(c));
    m.position.y = y * scale;
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

function slenderTree(scale: number): Group {
  const g = new Group();
  const trunk = new Mesh(
    new CylinderGeometry(0.07 * scale, 0.1 * scale, 0.95 * scale, 7),
    leafMaterial(TRUNK)
  );
  trunk.position.y = 0.47 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const crown = new Mesh(new IcosahedronGeometry(0.46 * scale, 1), leafMaterial(LEAF_B));
  crown.position.y = 1.32 * scale;
  crown.scale.set(0.85, 1.35, 0.85);
  crown.castShadow = true;
  g.add(crown);
  return g;
}

export function createVegetation(): Vegetation {
  const group = new Group();
  const trees: SwayTree[] = [];

  const plant = (tree: Group, x: number, z: number, spin: number) => {
    tree.position.set(x, groundHeight(x, z) - 0.03, z);
    tree.rotation.y = spin;
    group.add(tree);
    trees.push({ group: tree, phase: hash3(x, z, 2) * Math.PI * 2, amp: 0.03 + hash3(z, x, 4) * 0.015 });
  };

  plant(roundTree(1.25), -3.3, -0.3, 0.4);
  plant(pineTree(1.3), -3.75, 1.5, 2.1);
  plant(roundTree(0.85), -3.3, 2.5, 2.6);
  plant(pineTree(0.9), 4.1, -2.4, 1.2);
  plant(slenderTree(1.0), 1.3, 3.0, 2.6);
  plant(roundTree(0.8), 3.3, -3.2, 1.7);
  plant(roundTree(1.0), -0.6, -3.3, 0.2);

  // Garden fence: posts and two rails beside the house.
  const postGeo = new BoxGeometry(0.07, 0.42, 0.07);
  postGeo.translate(0, 0.21, 0);
  const railGeo = new BoxGeometry(1, 0.05, 0.045);
  const fenceMat = leafMaterial(0x8a6238);
  const fencePoints: Array<[number, number]> = [
    [-2.85, -0.42],
    [-2.3, -0.2],
    [-1.78, -0.14],
    [-1.32, -0.3],
  ];
  for (const [x, z] of fencePoints) {
    const post = new Mesh(postGeo, fenceMat);
    post.position.set(x, groundHeight(x, z), z);
    post.rotation.y = 0.4;
    post.castShadow = true;
    group.add(post);
  }
  for (const railY of [0.14, 0.3]) {
    const a = fencePoints[0];
    const b = fencePoints[fencePoints.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const rail = new Mesh(railGeo, fenceMat);
    rail.scale.x = len;
    rail.position.set((a[0] + b[0]) / 2, railY, (a[1] + b[1]) / 2);
    rail.rotation.y = Math.atan2(a[1] - b[1], a[0] - b[0]);
    rail.castShadow = true;
    group.add(rail);
  }

  // Stepping-stone path from the door toward the windmill and the pond.
  const stoneMat = leafMaterial(0xbcaa8c);
  const pathPoints: Array<[number, number]> = [
    [-1.5, 0.35],
    [-1.0, 0.5],
    [-0.45, 0.62],
    [0.2, 0.6],
    [0.9, 0.35],
    [1.55, -0.05],
    [2.2, -0.42],
    [2.85, -0.68],
    [0.15, 0.95],
  ];
  pathPoints.forEach(([x, z], i) => {
    const stone = new Mesh(new CylinderGeometry(0.16, 0.14, 0.06, 7), stoneMat);
    stone.position.set(x + (hash3(x, i, 1) - 0.5) * 0.1, groundHeight(x, z) + 0.02, z);
    stone.scale.setScalar(0.85 + hash3(z, i, 3) * 0.45);
    stone.rotation.y = hash3(i, x, z) * Math.PI;
    stone.receiveShadow = true;
    stone.castShadow = true;
    group.add(stone);
  });

  // Flower clusters near the fence, the pond shore and the path bend.
  const stems = new InstancedMesh(
    new CylinderGeometry(0.012, 0.018, 0.17, 5),
    leafMaterial(0x57853f),
    15
  );
  const heads = new InstancedMesh(new SphereGeometry(0.05, 7, 6), leafMaterial(0xffffff), 15);
  const dummy = new Object3D();
  const tint = new Color();
  const clusters: Array<[number, number, number]> = [
    [-2.55, 0.45, 5],
    [-0.1, 3.0, 5],
    [1.65, 0.95, 5],
  ];
  let fi = 0;
  for (const [cx, cz, n] of clusters) {
    for (let k = 0; k < n; k++) {
      const x = cx + (hash3(cx, k, 11) - 0.5) * 0.5;
      const z = cz + (hash3(cz, k, 17) - 0.5) * 0.4;
      dummy.position.set(x, groundHeight(x, z) + 0.08, z);
      dummy.updateMatrix();
      stems.setMatrixAt(fi, dummy.matrix);
      dummy.position.y += 0.1;
      dummy.scale.setScalar(0.8 + hash3(x, z, 19) * 0.5);
      dummy.updateMatrix();
      heads.setMatrixAt(fi, dummy.matrix);
      dummy.scale.setScalar(1);
      tint.setHex([0xd96a5a, 0xe6c15a, 0xf2e3b8, 0xdd8a6a][fi % 4]);
      heads.setColorAt(fi, tint);
      fi++;
    }
  }
  stems.count = fi;
  heads.count = fi;
  stems.castShadow = true;
  group.add(stems, heads);

  // A few rocks: pond shore, cliff edge, meadow.
  const rockMat = leafMaterial(0x8d8177);
  const rockSpecs: Array<[number, number, number]> = [
    [0.6, 2.9, 0.3],
    [4.15, -0.75, 0.38],
    [-0.25, 3.75, 0.22],
    [1.95, -2.7, 0.18],
    [-3.9, 2.3, 0.26],
  ];
  for (const [x, z, s] of rockSpecs) {
    const rock = new Mesh(new IcosahedronGeometry(s, 0), rockMat);
    rock.position.set(x, groundHeight(x, z) + s * 0.35, z);
    rock.scale.set(1, 0.62, 0.8);
    rock.rotation.y = hash3(x, z, 23) * Math.PI;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  return {
    group,
    update(elapsed, wind, reducedMotion) {
      const motion = (0.12 + 0.88 * wind) * (reducedMotion ? 0.3 : 1);
      for (const t of trees) {
        t.group.rotation.z = Math.sin(elapsed * 1.35 + t.phase) * t.amp * motion;
        t.group.rotation.x = Math.cos(elapsed * 1.05 + t.phase) * t.amp * 0.6 * motion;
      }
    },
  };
}
