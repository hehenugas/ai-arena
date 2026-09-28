import * as THREE from 'three';

interface Ripple {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  active: boolean;
}

export class Water {
  public group: THREE.Group;
  public pondCenter: THREE.Vector3 = new THREE.Vector3(1.8, 0.02, 1.2);
  public pondRadius: number = 1.35;

  private waterMesh!: THREE.Mesh;
  private waterMaterial!: THREE.MeshStandardMaterial;
  private ripples: Ripple[] = [];
  private rippleGeometry!: THREE.RingGeometry;
  private rippleSpawnTimer: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Water';
    this.build();
    this.initRipples();
  }

  private build() {
    // 1. Shoreline Sandy Lip
    const shoreMat = new THREE.MeshStandardMaterial({
      color: 0xd4c29a, // Sandy warm shore
      roughness: 0.85,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    const shoreGeo = new THREE.RingGeometry(this.pondRadius * 0.82, this.pondRadius * 1.15, 28);
    shoreGeo.rotateX(-Math.PI / 2);
    const shore = new THREE.Mesh(shoreGeo, shoreMat);
    shore.position.set(this.pondCenter.x, 0.01, this.pondCenter.z);
    shore.scale.set(1.0, 1.0, 0.92);
    shore.receiveShadow = true;
    this.group.add(shore);

    // 2. Translucent Water Surface
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x38b6d0, // Stylized vibrant clear turquoise
      emissive: 0x0a3242,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    const waterGeo = new THREE.CircleGeometry(this.pondRadius * 1.02, 32);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    this.waterMesh.position.copy(this.pondCenter);
    this.waterMesh.scale.set(1.0, 1.0, 0.92);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    // 3. Lily pads and Water Lilies
    this.buildLilyPads();
  }

  private buildLilyPads() {
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3e7b45,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xfcf7f8,
      roughness: 0.5,
    });

    const flowerCenterMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      roughness: 0.4,
    });

    const padLocations = [
      { x: 1.5, z: 1.6, scale: 0.22, rot: 0.4, flower: true },
      { x: 1.35, z: 1.45, scale: 0.16, rot: 1.8, flower: false },
      { x: 2.1, z: 1.7, scale: 0.2, rot: 2.3, flower: false },
      { x: 2.35, z: 1.0, scale: 0.24, rot: 0.9, flower: true },
      { x: 2.15, z: 0.85, scale: 0.15, rot: 3.1, flower: false },
    ];

    // Circle with small gap for lily pad notch
    const padGeo = new THREE.CircleGeometry(1, 16, 0, Math.PI * 1.85);
    padGeo.rotateX(-Math.PI / 2);

    padLocations.forEach((loc) => {
      const padGroup = new THREE.Group();
      padGroup.position.set(loc.x, this.pondCenter.y + 0.015, loc.z);
      padGroup.scale.set(loc.scale, 1, loc.scale);
      padGroup.rotation.y = loc.rot;

      const pad = new THREE.Mesh(padGeo, padMat);
      pad.receiveShadow = true;
      padGroup.add(pad);

      if (loc.flower) {
        // Water lily flower
        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(0.1, 0.02, 0.1);
        flowerGroup.scale.set(0.35, 0.35, 0.35);

        const petalGeo = new THREE.ConeGeometry(0.12, 0.25, 5);
        for (let p = 0; p < 6; p++) {
          const petal = new THREE.Mesh(petalGeo, flowerMat);
          const pAngle = (p * Math.PI * 2) / 6;
          petal.position.set(Math.cos(pAngle) * 0.1, 0.08, Math.sin(pAngle) * 0.1);
          petal.rotation.z = Math.sin(pAngle) * 0.35;
          petal.rotation.x = Math.cos(pAngle) * 0.35;
          flowerGroup.add(petal);
        }

        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 6),
          flowerCenterMat
        );
        center.position.y = 0.08;
        flowerGroup.add(center);

        padGroup.add(flowerGroup);
      }

      this.group.add(padGroup);
    });
  }

  private initRipples() {
    const poolSize = 16;
    this.rippleGeometry = new THREE.RingGeometry(0.85, 1.0, 24);
    this.rippleGeometry.rotateX(-Math.PI / 2);

    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xddf4f8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(this.rippleGeometry, mat);
      mesh.visible = false;
      mesh.position.y = this.pondCenter.y + 0.01;
      this.group.add(mesh);

      this.ripples.push({
        mesh,
        material: mat,
        x: 0,
        z: 0,
        radius: 0.05,
        maxRadius: 0.4 + Math.random() * 0.3,
        alpha: 0,
        active: false,
      });
    }
  }

  private spawnRipple() {
    const inactive = this.ripples.find((r) => !r.active);
    if (!inactive) return;

    // Random point inside pond
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (this.pondRadius * 0.75);
    const x = this.pondCenter.x + Math.cos(angle) * dist;
    const z = this.pondCenter.z + Math.sin(angle) * dist * 0.9;

    inactive.active = true;
    inactive.x = x;
    inactive.z = z;
    inactive.radius = 0.04;
    inactive.maxRadius = 0.25 + Math.random() * 0.25;
    inactive.alpha = 0.7;
    inactive.mesh.position.set(x, this.pondCenter.y + 0.015, z);
    inactive.mesh.scale.set(0.04, 1, 0.04);
    inactive.mesh.visible = true;
  }

  public update(delta: number, timeElapsed: number, rainBlend: number) {
    // Gentle water shimmer
    const wave = Math.sin(timeElapsed * 1.8) * 0.006;
    this.waterMesh.position.y = this.pondCenter.y + wave;

    // Spawn ripples when raining
    if (rainBlend > 0.05) {
      // Spawn interval decreases with heavier rain
      this.rippleSpawnTimer += delta;
      const interval = 0.2 / Math.max(0.1, rainBlend);
      if (this.rippleSpawnTimer >= interval) {
        this.rippleSpawnTimer = 0;
        this.spawnRipple();
        if (rainBlend > 0.5 && Math.random() < 0.5) {
          this.spawnRipple();
        }
      }
    }

    // Update active ripples
    for (const r of this.ripples) {
      if (!r.active) continue;

      r.radius += delta * 0.55;
      const progress = r.radius / r.maxRadius;

      if (progress >= 1.0) {
        r.active = false;
        r.mesh.visible = false;
      } else {
        r.mesh.scale.set(r.radius, 1, r.radius);
        // Fade out as it expands
        r.alpha = (1.0 - progress) * 0.65;
        r.material.opacity = r.alpha;
      }
    }
  }
}
