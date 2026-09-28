import * as THREE from 'three';

export class House {
  public group: THREE.Group;
  public clickableMeshes: THREE.Object3D[] = [];
  private windowMaterial: THREE.MeshStandardMaterial;
  private houseLight: THREE.PointLight;
  private lanternLight: THREE.PointLight;
  private smokeParticles: { mesh: THREE.Mesh; baseScale: number; age: number; maxAge: number; startY: number }[] = [];
  private chimneyTopPos = new THREE.Vector3();
  public lightsOn = false;
  private targetLightIntensity = 0;
  private currentLightIntensity = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'House';

    // Position house charmingly on the island (facing slightly toward center/pond)
    this.group.position.set(-1.8, 0, 0.4);
    this.group.rotation.y = Math.PI * 0.18;

    // Window material with dynamic emissive glow
    this.windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x22303c,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.25,
      metalness: 0.1
    });

    // Interior & porch lights
    this.houseLight = new THREE.PointLight(0xffa73b, 0, 6.0, 1.8);
    this.houseLight.position.set(0, 1.4, 0.2);
    this.houseLight.castShadow = false; // Keep performant
    this.group.add(this.houseLight);

    this.lanternLight = new THREE.PointLight(0xffb54c, 0, 3.5, 2.0);
    this.lanternLight.position.set(0.65, 0.9, 1.05);
    this.group.add(this.lanternLight);

    this.buildHouse();
    this.buildSmoke();
  }

  private buildHouse(): void {
    // Shared materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xede4d3, // Soft cream plaster
      roughness: 0.85
    });

    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x513521, // Warm dark chestnut wood
      roughness: 0.75
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb5482e, // Warm terracotta tile
      roughness: 0.65,
      flatShading: true
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x696f75, // Cobblestone gray
      roughness: 0.9,
      flatShading: true
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x6e4325,
      roughness: 0.7
    });

    const flowerLeafMat = new THREE.MeshStandardMaterial({
      color: 0x488b32,
      roughness: 0.8
    });

    // 1. Foundation / Stone base
    const foundationGeom = new THREE.BoxGeometry(2.3, 0.35, 1.9);
    const foundation = new THREE.Mesh(foundationGeom, stoneMat);
    foundation.position.set(0, 0.175, 0);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    this.group.add(foundation);
    this.clickableMeshes.push(foundation);

    // 2. Main Walls
    const wallGeom = new THREE.BoxGeometry(2.1, 1.4, 1.7);
    const walls = new THREE.Mesh(wallGeom, wallMat);
    walls.position.set(0, 0.35 + 0.7, 0);
    walls.castShadow = true;
    walls.receiveShadow = true;
    this.group.add(walls);
    this.clickableMeshes.push(walls);

    // 3. Timber Framing (Corner posts and horizontal beam)
    const postGeom = new THREE.BoxGeometry(0.12, 1.45, 0.12);
    const postPositions = [
      [-1.02, 0.35 + 0.72, -0.82],
      [1.02, 0.35 + 0.72, -0.82],
      [-1.02, 0.35 + 0.72, 0.82],
      [1.02, 0.35 + 0.72, 0.82]
    ];
    for (const [px, py, pz] of postPositions) {
      const post = new THREE.Mesh(postGeom, timberMat);
      post.position.set(px, py, pz);
      post.castShadow = true;
      this.group.add(post);
      this.clickableMeshes.push(post);
    }

    // Horizontal beam under roof
    const beamGeom = new THREE.BoxGeometry(2.18, 0.1, 0.12);
    const beamFront = new THREE.Mesh(beamGeom, timberMat);
    beamFront.position.set(0, 1.72, 0.84);
    this.group.add(beamFront);

    // 4. Roof (Pitched A-frame with overhang)
    // Left roof plane
    const roofSlabGeom = new THREE.BoxGeometry(2.5, 0.12, 1.35);
    const roofLeft = new THREE.Mesh(roofSlabGeom, roofMat);
    roofLeft.position.set(0, 2.22, -0.46);
    roofLeft.rotation.x = Math.PI * 0.22;
    roofLeft.castShadow = true;
    roofLeft.receiveShadow = true;
    this.group.add(roofLeft);
    this.clickableMeshes.push(roofLeft);

    // Right roof plane
    const roofRight = new THREE.Mesh(roofSlabGeom, roofMat);
    roofRight.position.set(0, 2.22, 0.46);
    roofRight.rotation.x = -Math.PI * 0.22;
    roofRight.castShadow = true;
    roofRight.receiveShadow = true;
    this.group.add(roofRight);
    this.clickableMeshes.push(roofRight);

    // Gable ridge cap
    const ridgeGeom = new THREE.BoxGeometry(2.54, 0.12, 0.16);
    const ridge = new THREE.Mesh(ridgeGeom, timberMat);
    ridge.position.set(0, 2.65, 0);
    this.group.add(ridge);

    // Gable triangular wall infills (front and back)
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(-0.85, 0);
    triangleShape.lineTo(0.85, 0);
    triangleShape.lineTo(0, 0.88);
    triangleShape.closePath();
    const extrudeSettings = { depth: 0.08, bevelEnabled: false };
    const triangleGeom = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);

    const gableFront = new THREE.Mesh(triangleGeom, wallMat);
    gableFront.position.set(-1.05, 1.75, 0.04);
    gableFront.rotation.y = Math.PI * 0.5;
    this.group.add(gableFront);

    const gableBack = new THREE.Mesh(triangleGeom, wallMat);
    gableBack.position.set(1.05, 1.75, -0.04);
    gableBack.rotation.y = -Math.PI * 0.5;
    this.group.add(gableBack);

    // 5. Front Door
    const doorFrameGeom = new THREE.BoxGeometry(0.55, 0.95, 0.06);
    const doorFrame = new THREE.Mesh(doorFrameGeom, timberMat);
    doorFrame.position.set(0.35, 0.82, 0.86);
    this.group.add(doorFrame);

    const doorPanelGeom = new THREE.BoxGeometry(0.45, 0.88, 0.06);
    const doorPanel = new THREE.Mesh(doorPanelGeom, doorMat);
    doorPanel.position.set(0.35, 0.82, 0.88);
    this.group.add(doorPanel);
    this.clickableMeshes.push(doorPanel);

    // Door knob / handle
    const handleGeom = new THREE.SphereGeometry(0.03, 6, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.set(0.5, 0.8, 0.92);
    this.group.add(handle);

    // Porch step
    const stepGeom = new THREE.BoxGeometry(0.8, 0.12, 0.45);
    const step = new THREE.Mesh(stepGeom, stoneMat);
    step.position.set(0.35, 0.06, 1.08);
    step.receiveShadow = true;
    this.group.add(step);

    // Porch lantern
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), timberMat);
    lanternPost.position.set(0.72, 1.05, 0.92);
    this.group.add(lanternPost);

    const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), this.windowMaterial);
    lanternBox.position.set(0.72, 0.92, 0.92);
    this.group.add(lanternBox);
    this.clickableMeshes.push(lanternBox);

    // 6. Windows
    // Front window next to door
    this.createWindowMesh(-0.45, 0.95, 0.86, 0.5, 0.55, 0);

    // Side window (facing pond/viewer)
    this.createWindowMesh(1.06, 1.0, 0, 0.45, 0.55, Math.PI * 0.5);

    // Back side window
    this.createWindowMesh(-1.06, 1.0, 0, 0.45, 0.55, -Math.PI * 0.5);

    // Attic round / arched window
    const atticWindowGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12);
    atticWindowGeom.rotateX(Math.PI * 0.5);
    const atticWindow = new THREE.Mesh(atticWindowGeom, this.windowMaterial);
    atticWindow.position.set(1.06, 2.05, 0);
    atticWindow.rotation.y = Math.PI * 0.5;
    this.group.add(atticWindow);
    this.clickableMeshes.push(atticWindow);

    // 7. Window Flower Box (Front)
    const flowerBoxGeom = new THREE.BoxGeometry(0.55, 0.1, 0.16);
    const flowerBox = new THREE.Mesh(flowerBoxGeom, timberMat);
    flowerBox.position.set(-0.45, 0.62, 0.93);
    this.group.add(flowerBox);

    // Flower foliage and tiny blossoms
    const foliageGeom = new THREE.BoxGeometry(0.5, 0.08, 0.14);
    const foliage = new THREE.Mesh(foliageGeom, flowerLeafMat);
    foliage.position.set(-0.45, 0.68, 0.93);
    this.group.add(foliage);

    const flowerColors = [0xff4d4d, 0xffd13b, 0xff66cc, 0xffffff];
    for (let i = 0; i < 6; i++) {
      const flowerGeom = new THREE.SphereGeometry(0.035, 5, 5);
      const flowerMat = new THREE.MeshStandardMaterial({
        color: flowerColors[i % flowerColors.length],
        roughness: 0.5
      });
      const flower = new THREE.Mesh(flowerGeom, flowerMat);
      flower.position.set(-0.64 + i * 0.075, 0.73, 0.93 + (Math.random() - 0.5) * 0.04);
      this.group.add(flower);
    }

    // 8. Stone Chimney
    const chimneyGeom = new THREE.BoxGeometry(0.42, 1.8, 0.42);
    const chimney = new THREE.Mesh(chimneyGeom, stoneMat);
    chimney.position.set(-0.7, 2.0, -0.4);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    this.group.add(chimney);
    this.clickableMeshes.push(chimney);

    // Chimney cap
    const capGeom = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const cap = new THREE.Mesh(capGeom, stoneMat);
    cap.position.set(-0.7, 2.92, -0.4);
    this.group.add(cap);

    // Save chimney smoke world position anchor
    this.chimneyTopPos.set(-0.7, 3.0, -0.4);
  }

  private createWindowMesh(x: number, y: number, z: number, w: number, h: number, rotY: number): void {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3221, roughness: 0.7 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    this.group.add(frame);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), this.windowMaterial);
    glass.position.set(x, y, z);
    glass.rotation.y = rotY;
    this.group.add(glass);
    this.clickableMeshes.push(glass);

    // Window cross-mullions
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 0.09), frameMat);
    mullionH.position.set(x, y, z);
    mullionH.rotation.y = rotY;
    this.group.add(mullionH);

    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.09), frameMat);
    mullionV.position.set(x, y, z);
    mullionV.rotation.y = rotY;
    this.group.add(mullionV);
  }

  private buildSmoke(): void {
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.9,
      transparent: true,
      opacity: 0.45
    });

    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const geom = new THREE.DodecahedronGeometry(0.12, 1);
      const mesh = new THREE.Mesh(geom, smokeMat.clone());
      const maxAge = 2.5 + Math.random() * 0.8;
      const age = (i / particleCount) * maxAge;

      mesh.position.copy(this.chimneyTopPos);
      this.group.add(mesh);

      this.smokeParticles.push({
        mesh,
        baseScale: 0.12,
        age,
        maxAge,
        startY: this.chimneyTopPos.y
      });
    }
  }

  public setLights(enabled: boolean): void {
    this.lightsOn = enabled;
    this.targetLightIntensity = enabled ? 1.0 : 0.0;
  }

  public update(delta: number, windStrength: number, timeOfDay: number): void {
    // Smooth transition for light intensity
    const blendRate = 8.0 * delta;
    this.currentLightIntensity += (this.targetLightIntensity - this.currentLightIntensity) * blendRate;

    // Window emissive color
    if (this.currentLightIntensity > 0.01) {
      // Warm amber glow, even warmer at night
      const isNight = timeOfDay < 6 || timeOfDay > 19;
      const glowMult = isNight ? 2.6 : 1.8;
      this.windowMaterial.emissive.setHex(0xffaa33);
      this.windowMaterial.emissiveIntensity = this.currentLightIntensity * glowMult;
      this.windowMaterial.color.setHex(0xffd58b);
    } else {
      this.windowMaterial.emissive.setHex(0x000000);
      this.windowMaterial.emissiveIntensity = 0;
      this.windowMaterial.color.setHex(0x22303c);
    }

    this.houseLight.intensity = this.currentLightIntensity * 1.8;
    this.lanternLight.intensity = this.currentLightIntensity * 1.4;

    // Animate chimney smoke
    const windDrift = (0.3 + windStrength * 0.9);
    for (const p of this.smokeParticles) {
      p.age += delta;
      if (p.age >= p.maxAge) {
        p.age = 0;
        p.mesh.position.set(
          this.chimneyTopPos.x + (Math.random() - 0.5) * 0.05,
          this.chimneyTopPos.y,
          this.chimneyTopPos.z + (Math.random() - 0.5) * 0.05
        );
      }

      const lifeFrac = p.age / p.maxAge; // 0 to 1
      // Scale rises from small to puffy
      const currentScale = (0.7 + lifeFrac * 1.8);
      p.mesh.scale.setScalar(currentScale);

      // Float upward and drift with wind
      p.mesh.position.y += delta * 0.45;
      p.mesh.position.x += delta * windDrift * 0.25;
      p.mesh.position.z += delta * windDrift * 0.15;

      // Fade out near end of life
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      const alpha = Math.sin(lifeFrac * Math.PI) * 0.42;
      mat.opacity = alpha;
    }
  }
}
