import * as THREE from 'three';

export class Windmill {
  public group: THREE.Group;
  private bladesGroup: THREE.Group;
  private rotationAngle: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Windmill';
    this.bladesGroup = new THREE.Group();
    this.bladesGroup.name = 'Blades';

    this.build();
  }

  private build() {
    // Position on right-back or mid-left edge
    // Place at (-1.1, 0.18, 1.8) on the grassy mound
    this.group.position.set(-1.1, 0.18, 1.8);
    this.group.rotation.y = -0.4; // Face blades angled towards camera

    // Materials
    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0x7a7975,
      roughness: 0.9,
      flatShading: true,
    });

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe8dfc8, // Warm parchment / timber tone
      roughness: 0.8,
      flatShading: true,
    });

    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.75,
      flatShading: true,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4f6d7a, // Muted slate blue roof cap
      roughness: 0.6,
      flatShading: true,
    });

    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ea, // Off-white sailcloth
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    // 1. Octagonal Stone Base
    const baseGeo = new THREE.CylinderGeometry(0.7, 0.82, 0.45, 8);
    const base = new THREE.Mesh(baseGeo, stoneBaseMat);
    base.position.y = 0.225;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    // 2. Tapered Windmill Body
    const towerGeo = new THREE.CylinderGeometry(0.48, 0.68, 1.7, 8);
    const tower = new THREE.Mesh(towerGeo, bodyMat);
    tower.position.y = 1.3;
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.group.add(tower);

    // Horizontal wooden trim rings
    const ringGeo = new THREE.CylinderGeometry(0.64, 0.64, 0.05, 8);
    const ring1 = new THREE.Mesh(ringGeo, timberMat);
    ring1.position.y = 0.55;
    this.group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, timberMat);
    ring2.scale.set(0.85, 1, 0.85);
    ring2.position.y = 1.35;
    this.group.add(ring2);

    // 3. Arched Door
    const doorGeo = new THREE.BoxGeometry(0.24, 0.42, 0.05);
    const door = new THREE.Mesh(doorGeo, timberMat);
    door.position.set(0, 0.35, 0.75);
    door.rotation.y = 0;
    this.group.add(door);

    // 4. Roof Cap (Rotating Cap with Conical Top)
    const capBaseGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.15, 8);
    const capBase = new THREE.Mesh(capBaseGeo, timberMat);
    capBase.position.y = 2.22;
    this.group.add(capBase);

    const roofGeo = new THREE.ConeGeometry(0.58, 0.75, 8);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.65;
    roof.castShadow = true;
    this.group.add(roof);

    // Weather vane on top of roof
    const vanePoleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6);
    const vanePole = new THREE.Mesh(vanePoleGeo, timberMat);
    vanePole.position.y = 3.15;
    this.group.add(vanePole);

    const vaneArrowGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
    vaneArrowGeo.rotateZ(Math.PI / 2);
    const vaneArrow = new THREE.Mesh(vaneArrowGeo, timberMat);
    vaneArrow.position.set(0.04, 3.25, 0);
    this.group.add(vaneArrow);

    // 5. Axle Hub
    const hubAxleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
    hubAxleGeo.rotateX(Math.PI / 2);
    const hubAxle = new THREE.Mesh(hubAxleGeo, timberMat);
    hubAxle.position.set(0, 2.25, 0.5);
    this.group.add(hubAxle);

    // 6. Rotating Blades System
    this.bladesGroup.position.set(0, 2.25, 0.65);

    // Central hub cap
    const hubCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    hubCapGeo.rotateX(Math.PI / 2);
    const hubCap = new THREE.Mesh(hubCapGeo, timberMat);
    hubCap.castShadow = true;
    this.bladesGroup.add(hubCap);

    // 4 Blades with wooden spar and canvas sails
    const bladeLength = 1.35;
    const sparGeo = new THREE.BoxGeometry(0.04, bladeLength, 0.04);
    const sailGeo = new THREE.PlaneGeometry(0.24, bladeLength * 0.75);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = angle;

      // Wooden spar
      const spar = new THREE.Mesh(sparGeo, timberMat);
      spar.position.y = bladeLength / 2 + 0.08;
      spar.castShadow = true;
      bladeArm.add(spar);

      // Canvas sail cloth (offset to one side of the spar like traditional sails)
      const sail = new THREE.Mesh(sailGeo, sailMat);
      sail.position.set(0.13, bladeLength * 0.58, 0.01);
      sail.rotation.y = 0.12; // slight aerofoil twist
      sail.castShadow = true;
      sail.receiveShadow = true;
      bladeArm.add(sail);

      // Wooden sail ribs
      for (let r = 0; r < 4; r++) {
        const ribGeo = new THREE.BoxGeometry(0.25, 0.02, 0.02);
        const rib = new THREE.Mesh(ribGeo, timberMat);
        rib.position.set(0.12, bladeLength * 0.35 + r * 0.22, 0.02);
        bladeArm.add(rib);
      }

      this.bladesGroup.add(bladeArm);
    }

    this.group.add(this.bladesGroup);
  }

  public update(delta: number, windStrength: number) {
    // Rotation speed proportional to wind strength
    // At wind = 0, speed = 0. At wind = 0.3, speed = ~1.2 rad/s. At wind = 1.0, speed = ~4.0 rad/s
    const speed = windStrength * 3.8;
    this.rotationAngle += speed * delta;
    this.bladesGroup.rotation.z = -this.rotationAngle;
  }
}
