import * as THREE from 'three';

interface SwayingTree {
  group: THREE.Group;
  baseRotZ: number;
  baseRotX: number;
  phaseOffset: number;
  frequency: number;
  flexibility: number;
}

export class Foliage {
  public group: THREE.Group;
  private trees: SwayingTree[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Foliage';
    this.build();
  }

  private build() {
    this.buildTrees();
    this.buildBushes();
    this.buildFlowerPatches();
  }

  private buildTrees() {
    // Shared materials
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5a3e28, // Dark warm bark
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    const leafMatGreen1 = new THREE.MeshStandardMaterial({
      color: 0x588b39, // Rich leafy green
      roughness: 0.8,
      flatShading: true,
    });

    const leafMatGreen2 = new THREE.MeshStandardMaterial({
      color: 0x76a345, // Soft light green
      roughness: 0.8,
      flatShading: true,
    });

    const leafMatAutumn = new THREE.MeshStandardMaterial({
      color: 0xd97736, // Warm amber / autumn accent tree
      roughness: 0.8,
      flatShading: true,
    });

    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x2e5c3c, // Deep evergreen
      roughness: 0.85,
      flatShading: true,
    });

    // Tree definitions (position, type, scale, materials)
    const treeDefs = [
      // 1. Large majestic puff tree near pond & back-right
      {
        type: 'puff',
        pos: new THREE.Vector3(2.5, 0.12, -0.6),
        scale: 1.25,
        trunkMat,
        foliageMat: leafMatGreen1,
        rotY: 0.3,
        flexibility: 1.0,
      },
      // 2. Medium puff tree behind house
      {
        type: 'puff',
        pos: new THREE.Vector3(-2.6, 0.18, -1.8),
        scale: 0.95,
        trunkMat,
        foliageMat: leafMatGreen2,
        rotY: 1.4,
        flexibility: 1.1,
      },
      // 3. Autumn accent puff tree near front-left
      {
        type: 'puff',
        pos: new THREE.Vector3(-2.8, 0.14, 0.6),
        scale: 0.85,
        trunkMat,
        foliageMat: leafMatAutumn,
        rotY: 2.1,
        flexibility: 1.2,
      },
      // 4. Tall conical pine tree near back rim
      {
        type: 'pine',
        pos: new THREE.Vector3(0.5, 0.12, -2.8),
        scale: 1.15,
        trunkMat,
        foliageMat: pineMat,
        rotY: 0.8,
        flexibility: 0.7,
      },
      // 5. Medium pine tree near pond edge
      {
        type: 'pine',
        pos: new THREE.Vector3(3.2, 0.08, 1.4),
        scale: 0.85,
        trunkMat,
        foliageMat: pineMat,
        rotY: 1.9,
        flexibility: 0.8,
      },
      // 6. Cute small puff tree near windmill
      {
        type: 'puff',
        pos: new THREE.Vector3(-2.0, 0.15, 2.5),
        scale: 0.75,
        trunkMat,
        foliageMat: leafMatGreen2,
        rotY: 3.0,
        flexibility: 1.3,
      },
    ];

    treeDefs.forEach((def, index) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.copy(def.pos);
      treeGroup.scale.set(def.scale, def.scale, def.scale);
      treeGroup.rotation.y = def.rotY;

      if (def.type === 'puff') {
        this.createPuffTree(treeGroup, def.trunkMat, def.foliageMat);
      } else {
        this.createPineTree(treeGroup, def.trunkMat, def.foliageMat);
      }

      this.group.add(treeGroup);

      this.trees.push({
        group: treeGroup,
        baseRotZ: 0,
        baseRotX: 0,
        phaseOffset: index * 1.35,
        frequency: 1.8 + (index % 3) * 0.3,
        flexibility: def.flexibility,
      });
    });
  }

  private createPuffTree(
    parent: THREE.Group,
    trunkMat: THREE.Material,
    foliageMat: THREE.Material
  ) {
    // Sculpted trunk with branch
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1.4, 7);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    parent.add(trunk);

    // Branch
    const branchGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.6, 6);
    branchGeo.rotateZ(-Math.PI / 4);
    const branch = new THREE.Mesh(branchGeo, trunkMat);
    branch.position.set(0.2, 1.0, 0);
    branch.castShadow = true;
    parent.add(branch);

    // Stylized foliage puffs using faceted icosahedrons
    const puffGeo = new THREE.IcosahedronGeometry(0.75, 1);

    const puffs = [
      { x: 0, y: 1.85, z: 0, s: 1.0 },
      { x: -0.35, y: 1.6, z: 0.25, s: 0.75 },
      { x: 0.38, y: 1.65, z: -0.2, s: 0.8 },
      { x: 0.2, y: 1.5, z: 0.35, s: 0.7 },
      { x: 0, y: 2.3, z: 0, s: 0.65 },
    ];

    puffs.forEach((p) => {
      const puff = new THREE.Mesh(puffGeo, foliageMat);
      puff.position.set(p.x, p.y, p.z);
      puff.scale.set(p.s, p.s * 0.95, p.s);
      puff.castShadow = true;
      puff.receiveShadow = true;
      parent.add(puff);
    });
  }

  private createPineTree(
    parent: THREE.Group,
    trunkMat: THREE.Material,
    pineMat: THREE.Material
  ) {
    // Straight sturdy trunk
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.18, 1.2, 7);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    parent.add(trunk);

    // Stacked conical tiers
    const tiers = [
      { y: 1.2, r: 0.95, h: 0.9 },
      { y: 1.75, r: 0.75, h: 0.8 },
      { y: 2.25, r: 0.55, h: 0.7 },
      { y: 2.7, r: 0.35, h: 0.6 },
    ];

    tiers.forEach((t) => {
      const coneGeo = new THREE.ConeGeometry(t.r, t.h, 7);
      const cone = new THREE.Mesh(coneGeo, pineMat);
      cone.position.y = t.y;
      cone.castShadow = true;
      cone.receiveShadow = true;
      parent.add(cone);
    });
  }

  private buildBushes() {
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x62963d,
      roughness: 0.85,
      flatShading: true,
    });

    const bushGeo = new THREE.DodecahedronGeometry(0.32, 1);

    const bushLocs = [
      // Along path
      { x: -0.9, y: 0.2, z: -0.2, s: 0.9 },
      { x: -0.1, y: 0.16, z: 0.6, s: 0.8 },
      // Near house corner
      { x: -0.7, y: 0.18, z: -1.7, s: 1.0 },
      // Near pond edge
      { x: 1.0, y: 0.12, z: 1.7, s: 0.85 },
      { x: 2.8, y: 0.12, z: 0.2, s: 0.95 },
      // Near windmill base
      { x: -0.4, y: 0.18, z: 2.1, s: 0.75 },
    ];

    bushLocs.forEach((loc) => {
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.set(loc.x, loc.y, loc.z);
      bush.scale.set(loc.s, loc.s * 0.8, loc.s * 1.1);
      bush.castShadow = true;
      bush.receiveShadow = true;
      this.group.add(bush);
    });
  }

  private buildFlowerPatches() {
    const flowerColors = [
      0xff5964, // Poppy red
      0xfff15c, // Daisy yellow
      0x8ac926, // Meadow green
      0x7b2cbf, // Lavender purple
      0xff99c8, // Soft pink
    ];

    const materials = flowerColors.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.6,
          flatShading: true,
        })
    );

    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d702b, roughness: 0.8 });
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.15, 4);
    const blossomGeo = new THREE.DodecahedronGeometry(0.045, 0);

    const patchCenters = [
      // Near house path
      { x: -1.2, z: 0.2, count: 8, radius: 0.4 },
      // By pond shore
      { x: 0.9, z: 1.3, count: 10, radius: 0.5 },
      // Near windmill
      { x: -1.4, z: 1.3, count: 7, radius: 0.35 },
      // Open meadow
      { x: 0.6, z: -1.4, count: 12, radius: 0.6 },
    ];

    patchCenters.forEach((patch) => {
      for (let i = 0; i < patch.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * patch.radius;
        const x = patch.x + Math.cos(angle) * dist;
        const z = patch.z + Math.sin(angle) * dist;

        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(x, 0.14, z);

        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.075;
        stem.rotation.z = (Math.random() - 0.5) * 0.2;
        flowerGroup.add(stem);

        const blossom = new THREE.Mesh(
          blossomGeo,
          materials[Math.floor(Math.random() * materials.length)]
        );
        blossom.position.y = 0.15;
        flowerGroup.add(blossom);

        this.group.add(flowerGroup);
      }
    });
  }

  public update(_delta: number, timeElapsed: number, windStrength: number) {
    // Sway trees realistically based on wind strength
    // When wind = 0, sway is 0
    if (windStrength <= 0.001) {
      for (const t of this.trees) {
        t.group.rotation.z = 0;
        t.group.rotation.x = 0;
      }
      return;
    }

    for (const t of this.trees) {
      // Primary sway along wind direction (X axis) with secondary flutter (Z axis)
      const sway =
        Math.sin(timeElapsed * t.frequency + t.phaseOffset) *
        windStrength *
        0.09 *
        t.flexibility;

      const flutter =
        Math.cos(timeElapsed * (t.frequency * 1.5) + t.phaseOffset) *
        windStrength *
        0.03 *
        t.flexibility;

      // Base tilt in direction of wind
      const constantLean = windStrength * 0.05 * t.flexibility;

      t.group.rotation.z = sway + constantLean;
      t.group.rotation.x = flutter;
    }
  }
}
