import * as THREE from 'three';

interface SwayingObject {
  group: THREE.Group;
  baseRotX: number;
  baseRotZ: number;
  phase: number;
  freq: number;
  stiffness: number;
}

export class Vegetation {
  public group: THREE.Group;
  private swayingTrees: SwayingObject[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Vegetation';

    this.buildTrees();
    this.buildBushes();
    this.buildFlowers();
    this.buildGrassTufts();
  }

  private buildTrees(): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5a3c26,
      roughness: 0.85
    });

    const leafMatDark = new THREE.MeshStandardMaterial({
      color: 0x3d7b32,
      roughness: 0.8,
      flatShading: true
    });

    const leafMatMid = new THREE.MeshStandardMaterial({
      color: 0x519b42,
      roughness: 0.8,
      flatShading: true
    });

    const leafMatLight = new THREE.MeshStandardMaterial({
      color: 0x67b552,
      roughness: 0.8,
      flatShading: true
    });

    const pineMat1 = new THREE.MeshStandardMaterial({
      color: 0x245436,
      roughness: 0.85,
      flatShading: true
    });

    const pineMat2 = new THREE.MeshStandardMaterial({
      color: 0x1d442b,
      roughness: 0.85,
      flatShading: true
    });

    // 1. Large Deciduous Oak (near the cottage and path)
    const oak1 = this.createDeciduousTree(
      woodMat,
      [leafMatDark, leafMatMid, leafMatLight],
      1.3,
      true // Has little red fruit/blossom accents
    );
    oak1.position.set(-0.3, 0.05, -1.8);
    oak1.rotation.y = 0.4;
    this.group.add(oak1);
    this.registerSway(oak1, 0.8, 1.0);

    // 2. Medium Round Tree (near pond edge)
    const oak2 = this.createDeciduousTree(
      woodMat,
      [leafMatMid, leafMatLight],
      0.95,
      false
    );
    oak2.position.set(3.4, -0.05, -0.4);
    oak2.rotation.y = 1.8;
    this.group.add(oak2);
    this.registerSway(oak2, 1.1, 1.2);

    // 3. Compact Tree behind cottage
    const oak3 = this.createDeciduousTree(
      woodMat,
      [leafMatDark, leafMatMid],
      0.8,
      false
    );
    oak3.position.set(-3.4, 0.05, 1.2);
    oak3.rotation.y = 2.5;
    this.group.add(oak3);
    this.registerSway(oak3, 1.3, 1.4);

    // 4. Tall Pine Tree (near windmill knoll)
    const pine1 = this.createPineTree(woodMat, [pineMat1, pineMat2], 1.35);
    pine1.position.set(-1.8, 0.35, -3.8);
    this.group.add(pine1);
    this.registerSway(pine1, 0.9, 0.9);

    // 5. Medium Pine Tree (cliff edge)
    const pine2 = this.createPineTree(woodMat, [pineMat1, pineMat2], 1.0);
    pine2.position.set(0.8, 0.0, -3.6);
    this.group.add(pine2);
    this.registerSway(pine2, 1.2, 1.1);

    // 6. Slender Pine Tree (near pond southern edge)
    const pine3 = this.createPineTree(woodMat, [pineMat1, pineMat2], 0.85);
    pine3.position.set(1.4, -0.05, 3.4);
    this.group.add(pine3);
    this.registerSway(pine3, 1.4, 1.3);
  }

  private createDeciduousTree(
    trunkMat: THREE.Material,
    foliageMats: THREE.Material[],
    scale: number,
    hasFruits: boolean
  ): THREE.Group {
    const tree = new THREE.Group();

    // Curved organic trunk
    const trunkGeom = new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 1.6 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = (1.6 * scale) / 2;
    trunk.rotation.z = -0.06;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Main canopy clusters (3-4 low poly spheres grouped)
    const clusterData = [
      { x: 0, y: 1.8 * scale, z: 0, r: 0.95 * scale, mat: foliageMats[0] },
      { x: -0.45 * scale, y: 1.6 * scale, z: 0.3 * scale, r: 0.72 * scale, mat: foliageMats[1] },
      { x: 0.45 * scale, y: 1.65 * scale, z: -0.25 * scale, r: 0.75 * scale, mat: foliageMats[foliageMats.length - 1] },
      { x: 0.1 * scale, y: 2.3 * scale, z: 0.1 * scale, r: 0.7 * scale, mat: foliageMats[1] }
    ];

    for (const c of clusterData) {
      const geom = new THREE.DodecahedronGeometry(c.r, 1);
      const mesh = new THREE.Mesh(geom, c.mat);
      mesh.position.set(c.x, c.y, c.z);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      tree.add(mesh);
    }

    // Optional little red apples / berries
    if (hasFruits) {
      const fruitMat = new THREE.MeshStandardMaterial({ color: 0xdf2929, roughness: 0.4 });
      const fruitCount = 7;
      for (let i = 0; i < fruitCount; i++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 5, 5), fruitMat);
        const theta = (i / fruitCount) * Math.PI * 2;
        const rad = 0.8 * scale;
        fruit.position.set(
          Math.cos(theta) * rad,
          1.5 * scale + (Math.random() - 0.5) * 0.4 * scale,
          Math.sin(theta) * rad
        );
        tree.add(fruit);
      }
    }

    return tree;
  }

  private createPineTree(trunkMat: THREE.Material, pineMats: THREE.Material[], scale: number): THREE.Group {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, 1.2 * scale, 6);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = (1.2 * scale) / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // 3 Tiered Cones
    const tiers = [
      { y: 1.0 * scale, r: 0.95 * scale, h: 1.1 * scale, mat: pineMats[0] },
      { y: 1.65 * scale, r: 0.75 * scale, h: 1.0 * scale, mat: pineMats[1] },
      { y: 2.25 * scale, r: 0.52 * scale, h: 0.9 * scale, mat: pineMats[0] }
    ];

    for (const t of tiers) {
      const coneGeom = new THREE.ConeGeometry(t.r, t.h, 7);
      const mesh = new THREE.Mesh(coneGeom, t.mat);
      mesh.position.y = t.y;
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      tree.add(mesh);
    }

    return tree;
  }

  private buildBushes(): void {
    const bushMats = [
      new THREE.MeshStandardMaterial({ color: 0x4a8d38, roughness: 0.85, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x5fa74c, roughness: 0.85, flatShading: true })
    ];

    const bushPositions = [
      { x: -0.8, y: 0.08, z: 1.5, scale: 0.38 },
      { x: -2.6, y: 0.08, z: -0.6, scale: 0.42 },
      { x: 1.0, y: 0.08, z: -1.2, scale: 0.35 },
      { x: 3.8, y: -0.05, z: 0.8, scale: 0.4 },
      { x: 0.2, y: 0.05, z: 2.8, scale: 0.36 }
    ];

    for (let i = 0; i < bushPositions.length; i++) {
      const p = bushPositions[i];
      const geom = new THREE.DodecahedronGeometry(p.scale, 1);
      const bush = new THREE.Mesh(geom, bushMats[i % bushMats.length]);
      bush.position.set(p.x, p.y + p.scale * 0.7, p.z);
      bush.scale.set(1.2, 0.85, 1.1);
      bush.castShadow = true;
      bush.receiveShadow = true;
      this.group.add(bush);
    }
  }

  private buildFlowers(): void {
    const flowerMats = {
      yellow: new THREE.MeshStandardMaterial({ color: 0xf5d038, roughness: 0.6 }),
      red: new THREE.MeshStandardMaterial({ color: 0xe64a38, roughness: 0.6 }),
      purple: new THREE.MeshStandardMaterial({ color: 0xb57edc, roughness: 0.6 }),
      white: new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.6 }),
      stem: new THREE.MeshStandardMaterial({ color: 0x3d7829, roughness: 0.8 })
    };

    const flowerPatches = [
      // Along path near cottage
      { cx: -0.8, cz: 0.9, count: 8, colors: ['yellow', 'white'] as const },
      // Near pond bank
      { cx: 1.1, cz: 0.4, count: 6, colors: ['purple', 'yellow'] as const },
      // Garden corner
      { cx: -2.4, cz: 1.6, count: 7, colors: ['red', 'yellow'] as const },
      // Sunny meadow edge
      { cx: -0.2, cz: 2.2, count: 9, colors: ['purple', 'white', 'yellow'] as const }
    ];

    for (const patch of flowerPatches) {
      for (let i = 0; i < patch.count; i++) {
        const flowerGroup = new THREE.Group();
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 0.55;
        const fx = patch.cx + Math.cos(angle) * dist;
        const fz = patch.cz + Math.sin(angle) * dist;

        // Stem
        const stemGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4);
        const stem = new THREE.Mesh(stemGeom, flowerMats.stem);
        stem.position.y = 0.11;
        stem.rotation.z = (Math.random() - 0.5) * 0.2;
        flowerGroup.add(stem);

        // Blossom (small star/fan)
        const colKey = patch.colors[i % patch.colors.length];
        const blossomGeom = new THREE.DodecahedronGeometry(0.045, 0);
        const blossom = new THREE.Mesh(blossomGeom, flowerMats[colKey]);
        blossom.position.y = 0.22;
        flowerGroup.add(blossom);

        flowerGroup.position.set(fx, 0.02, fz);
        this.group.add(flowerGroup);
      }
    }
  }

  private buildGrassTufts(): void {
    const grassBladeMat = new THREE.MeshStandardMaterial({
      color: 0x5ca33d,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    const tuftLocations = [
      [-1.2, 0.02, -0.6],
      [-2.1, 0.02, -1.5],
      [0.6, 0.02, 1.4],
      [1.8, 0.02, -1.8],
      [-0.4, 0.02, -2.8],
      [2.8, -0.05, 2.2],
      [-2.9, 0.2, 0.6]
    ];

    for (const [gx, gy, gz] of tuftLocations) {
      const tuftGroup = new THREE.Group();
      tuftGroup.position.set(gx, gy, gz);

      // 3 curved blades
      for (let b = 0; b < 3; b++) {
        const bladeGeom = new THREE.ConeGeometry(0.035, 0.24, 3);
        const blade = new THREE.Mesh(bladeGeom, grassBladeMat);
        blade.position.y = 0.12;
        blade.rotation.y = (b * Math.PI * 2) / 3;
        blade.rotation.z = 0.28 + (b * 0.08);
        tuftGroup.add(blade);
      }

      this.group.add(tuftGroup);
    }
  }

  private registerSway(group: THREE.Group, stiffness: number, freq: number): void {
    this.swayingTrees.push({
      group,
      baseRotX: group.rotation.x,
      baseRotZ: group.rotation.z,
      phase: Math.random() * Math.PI * 2,
      freq,
      stiffness
    });
  }

  public update(_delta: number, windStrength: number, elapsed: number): void {
    // Sway driven strictly by windStrength (stops at wind = 0)
    const swayAmp = windStrength * 0.08;

    for (const tree of this.swayingTrees) {
      const time = elapsed * (1.8 * tree.freq) + tree.phase;
      const swayX = Math.sin(time) * swayAmp * tree.stiffness;
      const swayZ = Math.cos(time * 0.85) * (swayAmp * 0.6) * tree.stiffness;

      tree.group.rotation.x = tree.baseRotX + swayX;
      tree.group.rotation.z = tree.baseRotZ + swayZ;
    }
  }
}
