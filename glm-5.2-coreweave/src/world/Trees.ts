import * as THREE from 'three';
import { clamp01 } from '../utils';

type TreeKind = 'round' | 'conifer' | 'bonsai';

interface Tree {
  group: THREE.Group;
  kind: TreeKind;
  phase: number;
  swayAmp: number;
  baseRotZ: number;
}

/**
 * A small collection of stylized trees of varied sizes and silhouettes.
 * Whole-tree sway pivots at the base; amplitude scales with shared wind state.
 */
export class Trees {
  readonly group = new THREE.Group();
  private readonly trees: Tree[] = [];
  private readonly trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6e4a2c,
    roughness: 0.9,
    metalness: 0,
  });
  private readonly leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x6fb55a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x82c266, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x5a9e4a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x4f8c52, roughness: 0.85 }), // conifer dark
  ];

  /**
   * @param spots array of [x, z, kind, scale] — positions chosen by World to
   * avoid the pond/house and balance the composition.
   */
  constructor(spots: Array<[number, number, TreeKind, number]>) {
    for (const [x, z, kind, scale] of spots) {
      const t = this.build(kind, scale);
      t.group.position.set(x, 0, z);
      this.group.add(t.group);
      this.trees.push(t);
    }
  }

  private build(kind: TreeKind, scale: number): Tree {
    const g = new THREE.Group();
    const leafMat = this.leafMats[Math.floor(Math.random() * (kind === 'conifer' ? 1 : 3))];

    if (kind === 'conifer') {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, 0.45 * scale, 6),
        this.trunkMat,
      );
      trunk.position.y = 0.225 * scale;
      trunk.castShadow = true;
      g.add(trunk);
      let y = 0.42 * scale;
      let r = 0.55 * scale;
      const coneMat = this.leafMats[3];
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(r, 0.5 * scale, 7),
          coneMat,
        );
        cone.position.y = y + 0.25 * scale;
        cone.castShadow = true;
        g.add(cone);
        y += 0.34 * scale;
        r *= 0.72;
      }
    } else if (kind === 'bonsai') {
      // a tiny gnarled bonsai-ish tree for variety
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.09, 0.3, 6),
        this.trunkMat,
      );
      trunk.position.y = 0.15;
      trunk.rotation.z = 0.2;
      trunk.castShadow = true;
      g.add(trunk);
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 10, 8),
        leafMat,
      );
      blob.position.set(0.05, 0.42, 0);
      blob.scale.set(1.3, 0.7, 1.1);
      blob.castShadow = true;
      g.add(blob);
    } else {
      // round leafy tree
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * scale, 0.11 * scale, 0.5 * scale, 6),
        this.trunkMat,
      );
      trunk.position.y = 0.25 * scale;
      trunk.castShadow = true;
      g.add(trunk);
      const blobs: Array<[number, number, number, number, number]> = [
        [0, 0.65, 0, 0.45, 0],
        [-0.22, 0.58, 0.1, 0.32, 0.3],
        [0.24, 0.6, -0.12, 0.34, -0.4],
        [0, 0.78, 0, 0.36, 0],
      ];
      for (const [bx, by, bz, bs, br] of blobs) {
        const b = new THREE.Mesh(
          new THREE.SphereGeometry(bs * scale, 10, 8),
          leafMat,
        );
        b.position.set(bx * scale, by * scale, bz * scale);
        b.rotation.z = br;
        b.scale.y = 0.92;
        b.castShadow = true;
        g.add(b);
      }
    }

    return {
      group: g,
      kind,
      phase: Math.random() * Math.PI * 2,
      swayAmp: 0.05 + Math.random() * 0.05,
      baseRotZ: (Math.random() - 0.5) * 0.06,
    };
  }

  /**
   * @param wind 0..1 shared wind state
   * @param time elapsed seconds (for oscillation)
   */
  update(wind: number, time: number): void {
    const w = clamp01(wind);
    if (w < 0.001 && this.trees.every((t) => Math.abs(t.group.rotation.z) < 0.002 && Math.abs(t.group.rotation.x) < 0.002)) {
      // at rest and already near zero — cheap skip
      return;
    }
    for (const t of this.trees) {
      const amp = t.swayAmp * w;
      const s1 = Math.sin(time * 1.7 + t.phase);
      const s2 = Math.sin(time * 1.1 + t.phase * 1.7);
      t.group.rotation.z = t.baseRotZ + amp * s1;
      t.group.rotation.x = amp * 0.6 * s2;
    }
  }

  dispose(): void {
    this.trunkMat.dispose();
    this.leafMats.forEach((m) => m.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
