import * as THREE from 'three';

interface Ripple {
  mesh: THREE.Mesh;
  active: boolean;
  x: number;
  z: number;
  age: number;
  maxAge: number;
  startScale: number;
  maxScale: number;
}

export class Water {
  public group: THREE.Group;
  private waterMesh: THREE.Mesh;
  private ripples: Ripple[] = [];
  private rippleSpawnTimer = 0;
  private pondCenter = new THREE.Vector2(2.1, 1.2);
  private pondRadius = 1.8;
  private waterMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Pond';

    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d9cb8,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.84,
      flatShading: false
    });

    const waterGeom = new THREE.CircleGeometry(this.pondRadius, 32);
    waterGeom.rotateX(-Math.PI * 0.5);
    this.waterMesh = new THREE.Mesh(waterGeom, this.waterMaterial);
    this.waterMesh.position.set(this.pondCenter.x, -0.05, this.pondCenter.y);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    this.buildShoreline();
    this.buildPier();
    this.buildLilyPads();
    this.initRipplePool();
  }

  private buildShoreline(): void {
    const stoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x737d89, roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x5a636c, roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x8a95a1, roughness: 0.85, flatShading: true })
    ];

    // Smooth shoreline pebbles and boulders surrounding the pond
    const stoneCount = 26;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const r = this.pondRadius + 0.1 + (Math.random() * 0.2);
      const x = this.pondCenter.x + Math.cos(angle) * r;
      const z = this.pondCenter.y + Math.sin(angle) * r;

      const sizeX = 0.16 + Math.random() * 0.22;
      const sizeY = 0.12 + Math.random() * 0.16;
      const sizeZ = 0.16 + Math.random() * 0.22;

      const geom = new THREE.DodecahedronGeometry(1, 1);
      const mat = stoneMats[i % stoneMats.length];
      const stone = new THREE.Mesh(geom, mat);
      stone.scale.set(sizeX, sizeY, sizeZ);
      stone.position.set(x, sizeY * 0.35 - 0.05, z);
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.group.add(stone);
    }
  }

  private buildPier(): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5a3e28,
      roughness: 0.8
    });

    const dockGroup = new THREE.Group();
    dockGroup.position.set(this.pondCenter.x - 1.1, 0, this.pondCenter.y - 0.7);
    dockGroup.rotation.y = Math.PI * 0.28;

    // Planks extending into water
    for (let i = 0; i < 4; i++) {
      const plankGeom = new THREE.BoxGeometry(0.85, 0.07, 0.24);
      const plank = new THREE.Mesh(plankGeom, woodMat);
      plank.position.set(0, 0.08, i * 0.28);
      plank.castShadow = true;
      plank.receiveShadow = true;
      dockGroup.add(plank);
    }

    // Wooden support posts
    const postGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6);
    const postPositions = [
      [-0.38, -0.05, 0.1],
      [0.38, -0.05, 0.1],
      [-0.38, -0.05, 0.9],
      [0.38, -0.05, 0.9]
    ];

    for (const [px, py, pz] of postPositions) {
      const post = new THREE.Mesh(postGeom, woodMat);
      post.position.set(px, py, pz);
      post.castShadow = true;
      dockGroup.add(post);
    }

    this.group.add(dockGroup);
  }

  private buildLilyPads(): void {
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3d8536,
      roughness: 0.6,
      side: THREE.DoubleSide
    });

    const padPositions = [
      { x: this.pondCenter.x + 0.65, z: this.pondCenter.y + 0.35, scale: 0.32 },
      { x: this.pondCenter.x + 0.9, z: this.pondCenter.y + 0.1, scale: 0.24 },
      { x: this.pondCenter.x - 0.4, z: this.pondCenter.y + 0.85, scale: 0.28 }
    ];

    for (const p of padPositions) {
      // Cylinder with a slight slice missing for classic lily pad notch
      const padGeom = new THREE.CylinderGeometry(p.scale, p.scale, 0.02, 16, 1, false, 0, Math.PI * 1.85);
      const pad = new THREE.Mesh(padGeom, padMat);
      pad.position.set(p.x, -0.03, p.z);
      pad.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(pad);
    }

    // Tiny pink waterlily flower on one pad
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfcb4d5, roughness: 0.5 });
    const flowerCenterMat = new THREE.MeshStandardMaterial({ color: 0xffdb4d, roughness: 0.4 });

    const flowerGroup = new THREE.Group();
    flowerGroup.position.set(this.pondCenter.x + 0.65, -0.01, this.pondCenter.y + 0.35);

    for (let i = 0; i < 6; i++) {
      const petalGeom = new THREE.ConeGeometry(0.04, 0.12, 4);
      petalGeom.rotateX(Math.PI * 0.4);
      const petal = new THREE.Mesh(petalGeom, flowerMat);
      petal.rotation.y = (i / 6) * Math.PI * 2;
      flowerGroup.add(petal);
    }

    const centerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), flowerCenterMat);
    centerMesh.position.y = 0.04;
    flowerGroup.add(centerMesh);

    this.group.add(flowerGroup);
  }

  private initRipplePool(): void {
    const rippleCount = 14;
    const ringGeom = new THREE.RingGeometry(0.85, 1.0, 24);
    ringGeom.rotateX(-Math.PI * 0.5);

    for (let i = 0; i < rippleCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9be2f5,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(ringGeom, mat);
      mesh.visible = false;
      this.group.add(mesh);

      this.ripples.push({
        mesh,
        active: false,
        x: 0,
        z: 0,
        age: 0,
        maxAge: 1.2,
        startScale: 0.08,
        maxScale: 0.65 + Math.random() * 0.25
      });
    }
  }

  private spawnRipple(): void {
    const available = this.ripples.find((r) => !r.active);
    if (!available) return;

    // Pick random location inside pond
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (this.pondRadius - 0.35);
    const x = this.pondCenter.x + Math.cos(angle) * dist;
    const z = this.pondCenter.y + Math.sin(angle) * dist;

    available.active = true;
    available.x = x;
    available.z = z;
    available.age = 0;
    available.maxAge = 1.0 + Math.random() * 0.6;
    available.mesh.position.set(x, -0.04, z);
    available.mesh.scale.setScalar(available.startScale);
    available.mesh.visible = true;
    (available.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75;
  }

  public update(delta: number, isRaining: boolean, rainIntensity: number, elapsed: number): void {
    // Subtle gentle water color pulsation / shimmer
    const shimmer = Math.sin(elapsed * 1.5) * 0.03;
    this.waterMaterial.roughness = 0.15 + shimmer;

    // During rain, spawn ripples continuously based on rain intensity
    if (isRaining || rainIntensity > 0.05) {
      this.rippleSpawnTimer += delta * (rainIntensity * 16.0);
      while (this.rippleSpawnTimer >= 1.0) {
        this.rippleSpawnTimer -= 1.0;
        this.spawnRipple();
      }
    }

    // Update active ripples
    for (const r of this.ripples) {
      if (!r.active) continue;

      r.age += delta;
      const progress = r.age / r.maxAge;

      if (progress >= 1.0) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }

      // Expand outward smoothly
      const currentScale = r.startScale + (r.maxScale - r.startScale) * Math.sqrt(progress);
      r.mesh.scale.setScalar(currentScale);

      // Fade out
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - progress) * 0.65;
    }
  }
}
