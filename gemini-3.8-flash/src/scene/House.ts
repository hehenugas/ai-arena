import * as THREE from 'three';

export class House {
  public group: THREE.Group;
  public clickableMeshes: THREE.Object3D[] = [];

  // Lighting & emissive components
  private windowMaterials: THREE.MeshStandardMaterial[] = [];
  private lanternMaterial!: THREE.MeshStandardMaterial;
  private housePointLight!: THREE.PointLight;
  private lanternPointLight!: THREE.PointLight;

  // Chimney smoke particles
  private smokeParticles: Array<{
    mesh: THREE.Mesh;
    baseY: number;
    age: number;
    lifespan: number;
    initScale: number;
    driftOffset: number;
  }> = [];
  private smokeGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'House';
    this.smokeGroup = new THREE.Group();
    this.smokeGroup.name = 'ChimneySmoke';
    this.group.add(this.smokeGroup);

    this.build();
    this.initSmoke();
    this.updateLights(false);
  }

  private build() {
    // Position house on the left-back plateau
    this.group.position.set(-1.6, 0.16, -1.2);
    this.group.rotation.y = 0.35; // Angled attractively towards camera

    // Materials
    const foundationMat = new THREE.MeshStandardMaterial({
      color: 0x6e6e72,
      roughness: 0.9,
      flatShading: true,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5eedb, // Cream plaster wall
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
    });

    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28, // Dark warm wood
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb35336, // Warm terracotta tile
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x7a4927,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
    });

    // 1. Foundation Base
    const foundationGeo = new THREE.BoxGeometry(1.65, 0.25, 1.35);
    const foundation = new THREE.Mesh(foundationGeo, foundationMat);
    foundation.position.y = 0.125;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    this.group.add(foundation);
    this.clickableMeshes.push(foundation);

    // 2. Main Cottage Body
    const bodyGeo = new THREE.BoxGeometry(1.5, 1.1, 1.2);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = 0.8;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);
    this.clickableMeshes.push(body);

    // 3. Exposed Timber Beams (Corners and horizontal lintels)
    const beamThickness = 0.07;
    // 4 vertical corner beams
    const cornerOffsets = [
      { x: -0.75, z: -0.6 },
      { x: 0.75, z: -0.6 },
      { x: -0.75, z: 0.6 },
      { x: 0.75, z: 0.6 },
    ];
    const cornerBeamGeo = new THREE.BoxGeometry(beamThickness, 1.12, beamThickness);
    cornerOffsets.forEach((co) => {
      const beam = new THREE.Mesh(cornerBeamGeo, timberMat);
      beam.position.set(co.x, 0.8, co.z);
      beam.castShadow = true;
      this.group.add(beam);
      this.clickableMeshes.push(beam);
    });

    // Horizontal top lintel beam
    const lintelGeo = new THREE.BoxGeometry(1.52, 0.07, 1.22);
    const lintel = new THREE.Mesh(lintelGeo, timberMat);
    lintel.position.y = 1.35;
    this.group.add(lintel);
    this.clickableMeshes.push(lintel);

    // 4. Pitched Roof with Gables
    const roofWidth = 1.75;
    const roofDepth = 1.45;
    const roofHeight = 0.75;

    // Roof slope geometry using triangular prism / custom shape
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-roofWidth / 2, 0);
    roofShape.lineTo(0, roofHeight);
    roofShape.lineTo(roofWidth / 2, 0);
    roofShape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: roofDepth,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 1,
    };

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    roofGeo.center();
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.7, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.group.add(roof);
    this.clickableMeshes.push(roof);

    // Ridge beam along top of roof
    const ridgeBeamGeo = new THREE.BoxGeometry(0.08, 0.08, roofDepth + 0.16);
    const ridgeBeam = new THREE.Mesh(ridgeBeamGeo, timberMat);
    ridgeBeam.position.set(0, 2.1, 0);
    ridgeBeam.castShadow = true;
    this.group.add(ridgeBeam);

    // 5. Chimney with stone texture and lip
    const chimneyBaseGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    const chimney = new THREE.Mesh(chimneyBaseGeo, foundationMat);
    chimney.position.set(0.45, 2.05, -0.25);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    this.group.add(chimney);
    this.clickableMeshes.push(chimney);

    const chimneyCapGeo = new THREE.BoxGeometry(0.36, 0.06, 0.36);
    const chimneyCap = new THREE.Mesh(chimneyCapGeo, timberMat);
    chimneyCap.position.set(0.45, 2.52, -0.25);
    chimneyCap.castShadow = true;
    this.group.add(chimneyCap);

    // 6. Front Door & Porch Step
    const stepGeo = new THREE.BoxGeometry(0.45, 0.1, 0.25);
    const step = new THREE.Mesh(stepGeo, foundationMat);
    step.position.set(0.2, 0.05, 0.68);
    step.receiveShadow = true;
    this.group.add(step);

    const doorFrameGeo = new THREE.BoxGeometry(0.38, 0.68, 0.04);
    const doorFrame = new THREE.Mesh(doorFrameGeo, timberMat);
    doorFrame.position.set(0.2, 0.6, 0.6);
    this.group.add(doorFrame);

    const doorPanelGeo = new THREE.BoxGeometry(0.32, 0.62, 0.03);
    const door = new THREE.Mesh(doorPanelGeo, doorMat);
    door.position.set(0.2, 0.6, 0.62);
    door.castShadow = true;
    this.group.add(door);
    this.clickableMeshes.push(door);

    const doorknobGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const doorknob = new THREE.Mesh(doorknobGeo, brassMat);
    doorknob.position.set(0.31, 0.58, 0.64);
    this.group.add(doorknob);

    // 7. Windows with Panes & Emissive Materials
    this.buildWindows();

    // 8. Hanging Porch Lantern
    this.buildLantern();

    // 9. Flower Planter Box under Front Window
    this.buildFlowerBox();

    // 10. Warm Interior / Porch Lighting
    this.housePointLight = new THREE.PointLight(0xffaa44, 0, 4.5, 1.8);
    this.housePointLight.position.set(-0.3, 0.9, 0.8);
    this.housePointLight.castShadow = true;
    this.housePointLight.shadow.bias = -0.002;
    this.group.add(this.housePointLight);
  }

  private buildWindows() {
    // Window specs: front window, side left window, attic gable window
    const windowConfigs = [
      // Front window (to left of door)
      { pos: new THREE.Vector3(-0.35, 0.78, 0.61), w: 0.42, h: 0.46, rotY: 0 },
      // Side window (left wall)
      { pos: new THREE.Vector3(-0.76, 0.8, 0.0), w: 0.38, h: 0.44, rotY: -Math.PI / 2 },
      // Side window (right wall)
      { pos: new THREE.Vector3(0.76, 0.8, 0.0), w: 0.38, h: 0.44, rotY: Math.PI / 2 },
      // Attic gable window (front gable)
      { pos: new THREE.Vector3(0.0, 1.55, 0.66), w: 0.28, h: 0.28, rotY: 0 },
    ];

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x4a321f,
      roughness: 0.7,
      flatShading: true,
    });

    windowConfigs.forEach((cfg) => {
      const winGroup = new THREE.Group();
      winGroup.position.copy(cfg.pos);
      winGroup.rotation.y = cfg.rotY;

      // Wooden outer frame
      const frameGeo = new THREE.BoxGeometry(cfg.w + 0.06, cfg.h + 0.06, 0.04);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.castShadow = true;
      winGroup.add(frame);

      // Glass pane
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x3d352e,
        emissive: 0x000000,
        roughness: 0.2,
        metalness: 0.1,
      });
      this.windowMaterials.push(glassMat);

      const glassGeo = new THREE.PlaneGeometry(cfg.w, cfg.h);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.z = 0.025;
      winGroup.add(glass);
      this.clickableMeshes.push(glass);

      // Wooden cross mullions
      const mullionMat = frameMat;
      const hMullionGeo = new THREE.BoxGeometry(cfg.w, 0.025, 0.02);
      const hMullion = new THREE.Mesh(hMullionGeo, mullionMat);
      hMullion.position.z = 0.03;
      winGroup.add(hMullion);

      const vMullionGeo = new THREE.BoxGeometry(0.025, cfg.h, 0.02);
      const vMullion = new THREE.Mesh(vMullionGeo, mullionMat);
      vMullion.position.z = 0.03;
      winGroup.add(vMullion);

      this.group.add(winGroup);
    });
  }

  private buildLantern() {
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(0.48, 0.85, 0.65);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.4,
      metalness: 0.8,
    });

    // Bracket
    const armGeo = new THREE.BoxGeometry(0.04, 0.03, 0.12);
    const arm = new THREE.Mesh(armGeo, metalMat);
    arm.position.z = -0.04;
    lanternGroup.add(arm);

    // Lantern glass/bulb
    this.lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xffeeaa,
      emissive: 0x000000,
      roughness: 0.2,
    });

    const lanternCapGeo = new THREE.ConeGeometry(0.06, 0.05, 5);
    const lanternCap = new THREE.Mesh(lanternCapGeo, metalMat);
    lanternCap.position.y = 0.05;
    lanternGroup.add(lanternCap);

    const bulbGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.08, 6);
    const bulb = new THREE.Mesh(bulbGeo, this.lanternMaterial);
    bulb.position.y = -0.01;
    lanternGroup.add(bulb);
    this.clickableMeshes.push(bulb);

    this.lanternPointLight = new THREE.PointLight(0xffba55, 0, 2.5, 2.0);
    this.lanternPointLight.position.set(0, -0.01, 0.05);
    lanternGroup.add(this.lanternPointLight);

    this.group.add(lanternGroup);
  }

  private buildFlowerBox() {
    const boxGroup = new THREE.Group();
    boxGroup.position.set(-0.35, 0.5, 0.65);

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x6e4727,
      roughness: 0.8,
    });

    const boxGeo = new THREE.BoxGeometry(0.46, 0.1, 0.1);
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.castShadow = true;
    boxGroup.add(box);

    // Colorful tiny flower blossoms
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3d7a2f, roughness: 0.8 });
    const flowerColors = [0xff4d6d, 0xffbe0b, 0x9b5de5, 0xf15bb5];
    const flowerMat = flowerColors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })
    );

    const leafGeo = new THREE.DodecahedronGeometry(0.05, 0);
    const petalGeo = new THREE.DodecahedronGeometry(0.03, 0);

    for (let i = 0; i < 6; i++) {
      const x = -0.18 + i * 0.07;
      const leaf = new THREE.Mesh(leafGeo, foliageMat);
      leaf.position.set(x, 0.07, (i % 2) * 0.02);
      boxGroup.add(leaf);

      const flower = new THREE.Mesh(petalGeo, flowerMat[i % flowerMat.length]);
      flower.position.set(x + 0.01, 0.12, (i % 2) * 0.02 + 0.01);
      boxGroup.add(flower);
    }

    this.group.add(boxGroup);
  }

  private initSmoke() {
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xe6e6ea,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.55,
      flatShading: true,
    });

    const smokeGeo = new THREE.DodecahedronGeometry(0.09, 1);
    const particleCount = 7;

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const pData = {
        mesh,
        baseY: 2.6,
        age: (i / particleCount) * 2.8,
        lifespan: 2.8,
        initScale: 0.7 + Math.random() * 0.5,
        driftOffset: (Math.random() - 0.5) * 0.1,
      };

      this.smokeParticles.push(pData);
      this.smokeGroup.add(mesh);
    }
  }

  public update(delta: number, windStrength: number) {
    // Animate chimney smoke particles
    for (const p of this.smokeParticles) {
      p.age += delta;
      if (p.age > p.lifespan) {
        p.age = 0;
      }

      const t = p.age / p.lifespan; // 0 to 1
      // Ascend upwards
      const y = p.baseY + t * 1.5;
      // Drift with wind along X & Z
      const windDrift = (windStrength + 0.15) * t * 1.2;
      const x = 0.45 + windDrift + Math.sin(t * Math.PI * 2) * 0.05 + p.driftOffset;
      const z = -0.25 + windDrift * 0.4 + Math.cos(t * Math.PI) * 0.05;

      // Expand as it rises and fade
      const scale = p.initScale * (0.5 + t * 1.8);
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.position.set(x, y, z);

      // Fade out opacity
      const opacity = Math.sin(t * Math.PI) * 0.45;
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
    }
  }

  public updateLights(lightsOn: boolean) {
    const emissiveColor = lightsOn ? 0xffb732 : 0x000000;
    const emissiveIntensity = lightsOn ? 1.6 : 0.0;

    for (const mat of this.windowMaterials) {
      mat.emissive.setHex(emissiveColor);
      mat.emissiveIntensity = emissiveIntensity;
      mat.color.setHex(lightsOn ? 0xffe6a8 : 0x3d352e);
    }

    if (this.lanternMaterial) {
      this.lanternMaterial.emissive.setHex(emissiveColor);
      this.lanternMaterial.emissiveIntensity = emissiveIntensity;
    }

    if (this.housePointLight) {
      this.housePointLight.intensity = lightsOn ? 2.5 : 0.0;
    }

    if (this.lanternPointLight) {
      this.lanternPointLight.intensity = lightsOn ? 1.5 : 0.0;
    }
  }
}
