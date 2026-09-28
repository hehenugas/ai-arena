import * as THREE from 'three';

export class Windmill {
  public group: THREE.Group;
  private bladesGroup: THREE.Group;
  private rotationAngle = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Windmill';

    // Position on elevated knoll on the island
    this.group.position.set(-2.8, 0.5, -2.4);
    this.group.rotation.y = Math.PI * 0.35; // Face outward/toward viewer

    this.bladesGroup = new THREE.Group();
    this.buildWindmill();
  }

  private buildWindmill(): void {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6e6a64,
      roughness: 0.9,
      flatShading: true
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xede6d8,
      roughness: 0.8
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2d,
      roughness: 0.7,
      flatShading: true
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x583b27,
      roughness: 0.75
    });

    const sailClothMat = new THREE.MeshStandardMaterial({
      color: 0xf5f2ea,
      roughness: 0.85,
      side: THREE.DoubleSide
    });

    // 1. Lower Stone Base (Octagonal cylinder)
    const baseGeom = new THREE.CylinderGeometry(1.2, 1.4, 1.0, 8);
    const base = new THREE.Mesh(baseGeom, stoneMat);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    // Stone molding ledge
    const ledgeGeom = new THREE.CylinderGeometry(1.25, 1.25, 0.1, 8);
    const ledge = new THREE.Mesh(ledgeGeom, stoneMat);
    ledge.position.y = 1.05;
    ledge.castShadow = true;
    this.group.add(ledge);

    // 2. Upper Tower (Tapered octagonal cylinder)
    const towerGeom = new THREE.CylinderGeometry(0.85, 1.15, 2.2, 8);
    const tower = new THREE.Mesh(towerGeom, wallMat);
    tower.position.y = 2.2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.group.add(tower);

    // 3. Conical Roof Cap
    const roofGeom = new THREE.ConeGeometry(1.1, 1.3, 8);
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 3.95;
    roof.castShadow = true;
    this.group.add(roof);

    // Finial ball on top of roof
    const ballGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const ball = new THREE.Mesh(ballGeom, woodMat);
    ball.position.y = 4.65;
    this.group.add(ball);

    // 4. Arched Door at base
    const doorGeom = new THREE.BoxGeometry(0.42, 0.75, 0.08);
    const door = new THREE.Mesh(doorGeom, woodMat);
    door.position.set(0, 0.45, 1.36);
    this.group.add(door);

    // High window
    const windowGeom = new THREE.BoxGeometry(0.28, 0.4, 0.08);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.3 });
    const win = new THREE.Mesh(windowGeom, windowMat);
    win.position.set(0, 2.4, 0.98);
    this.group.add(win);

    // 5. Axle Hub
    const hubAxleGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    hubAxleGeom.rotateX(Math.PI * 0.5);
    const hubAxle = new THREE.Mesh(hubAxleGeom, woodMat);
    hubAxle.position.set(0, 3.2, 0.95);
    this.group.add(hubAxle);

    // Rotating Blades assembly
    this.bladesGroup.position.set(0, 3.2, 1.22);
    this.group.add(this.bladesGroup);

    // Center cap on hub
    const centerCapGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 8);
    centerCapGeom.rotateX(Math.PI * 0.5);
    const centerCap = new THREE.Mesh(centerCapGeom, woodMat);
    this.bladesGroup.add(centerCap);

    // 4 Blades with wooden lattice spars and sailcloth
    for (let i = 0; i < 4; i++) {
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = (i * Math.PI) / 2;

      // Main spar beam
      const sparGeom = new THREE.BoxGeometry(0.08, 2.5, 0.08);
      const spar = new THREE.Mesh(sparGeom, woodMat);
      spar.position.set(0, 1.35, 0);
      spar.castShadow = true;
      bladeArm.add(spar);

      // Canvas sail sheet
      const sailGeom = new THREE.PlaneGeometry(0.48, 1.8);
      const sail = new THREE.Mesh(sailGeom, sailClothMat);
      sail.position.set(0.28, 1.5, 0.02);
      sail.castShadow = true;
      bladeArm.add(sail);

      // Lattice crossbars
      for (let j = 0; j < 4; j++) {
        const barGeom = new THREE.BoxGeometry(0.55, 0.04, 0.04);
        const bar = new THREE.Mesh(barGeom, woodMat);
        bar.position.set(0.25, 0.8 + j * 0.45, 0.04);
        bladeArm.add(bar);
      }

      this.bladesGroup.add(bladeArm);
    }
  }

  public update(delta: number, windStrength: number): void {
    // Angular velocity proportional to wind strength; completely stops at wind = 0
    const speed = windStrength * 3.2; // Radians per second
    this.rotationAngle += speed * delta;
    this.bladesGroup.rotation.z = this.rotationAngle;
  }
}
