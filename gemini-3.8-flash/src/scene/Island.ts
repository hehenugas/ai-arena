import * as THREE from 'three';

export interface IslandHeightData {
  containsPond: (x: number, z: number) => boolean;
  getHeight: (x: number, z: number) => number;
  radiusAtAngle: (angle: number) => number;
}

export class Island {
  public group: THREE.Group;
  public islandBoundsRadius: number = 5.2;

  // Materials for daytime & weather updates
  private grassMaterial!: THREE.MeshStandardMaterial;
  private dirtMaterial!: THREE.MeshStandardMaterial;
  private rockMaterial!: THREE.MeshStandardMaterial;
  private pathMaterial!: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Island';
    this.build();
  }

  private build() {
    this.createMaterials();
    this.buildUndersideRock();
    this.buildGrassPlateau();
    this.buildCobblestonePath();
    this.buildScatteredRocks();
    this.buildFences();
  }

  private createMaterials() {
    this.grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x6e9f50,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.dirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x634a34,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    this.rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a5c64,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    this.pathMaterial = new THREE.MeshStandardMaterial({
      color: 0xb5a78d,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    });
  }

  /**
   * Sculpted rocky underside tapering downward
   */
  private buildUndersideRock() {
    const segmentsRadial = 26;
    const segmentsHeight = 9;
    const topRadius = 4.8;
    const height = 4.0;

    // Use cylinder or custom buffer geometry for organic faceted cone
    const geometry = new THREE.CylinderGeometry(
      topRadius,
      0.15, // tapered tip
      height,
      segmentsRadial,
      segmentsHeight,
      true
    );

    // Perturb vertices to create handmade, geological faceted strata
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Normalized height: 0 at top, 1 at bottom
      const t = (height / 2 - v.y) / height;

      // Angular coordinates
      const angle = Math.atan2(v.z, v.x);
      
      // Irregular perimeter profile with distinct crags
      const perimeterWobble =
        Math.sin(angle * 3) * 0.4 +
        Math.cos(angle * 5) * 0.25 +
        Math.sin(angle * 7) * 0.15;

      // Vertical strata shelf effect
      const strataNoise = Math.sin(v.y * 3.5 + angle * 2) * 0.25;

      // Asymmetry to look handmade
      const asymX = Math.cos(angle * 2.2) * 0.2;
      const asymZ = Math.sin(angle * 1.8) * 0.2;

      // Apply perturbations, tapering towards the tip
      const factor = (1 - t * 0.85);
      v.x += (Math.cos(angle) * (perimeterWobble + strataNoise) + asymX) * factor;
      v.z += (Math.sin(angle) * (perimeterWobble + strataNoise) + asymZ) * factor;

      // Tip curl slightly
      if (t > 0.7) {
        v.x += (t - 0.7) * 0.5;
        v.z += (t - 0.7) * -0.3;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const undersideMesh = new THREE.Mesh(geometry, this.rockMaterial);
    undersideMesh.position.y = -height / 2;
    undersideMesh.castShadow = true;
    undersideMesh.receiveShadow = true;
    this.group.add(undersideMesh);

    // Add earthy dirt shelf just below grass lip
    const shelfGeo = new THREE.CylinderGeometry(
      topRadius + 0.15,
      topRadius - 0.2,
      0.4,
      segmentsRadial,
      2
    );
    const shelfMesh = new THREE.Mesh(shelfGeo, this.dirtMaterial);
    shelfMesh.position.y = -0.2;
    shelfMesh.castShadow = true;
    shelfMesh.receiveShadow = true;
    this.group.add(shelfMesh);

    // Add a few hanging crystal or rock stalactites at bottom
    this.buildHangingDetails();
  }

  private buildHangingDetails() {
    const hangingRockGeo = new THREE.ConeGeometry(0.35, 1.2, 5);
    const posOffsets = [
      { x: -0.6, y: -3.8, z: 0.4, s: 0.8, rz: 0.2 },
      { x: 0.8, y: -3.6, z: -0.5, s: 0.6, rz: -0.15 },
      { x: -0.3, y: -4.1, z: -0.4, s: 0.7, rx: 0.1 },
    ];

    posOffsets.forEach((p) => {
      const rock = new THREE.Mesh(hangingRockGeo, this.rockMaterial);
      rock.scale.set(p.s, p.s, p.s);
      rock.position.set(p.x, p.y, p.z);
      rock.rotation.x = Math.PI + (p.rx || 0);
      rock.rotation.z = p.rz || 0;
      rock.castShadow = true;
      this.group.add(rock);
    });
  }

  /**
   * Grassy top plateau with rolling mounds and pond depression
   */
  private buildGrassPlateau() {
    const radialSegs = 32;
    const ringSegs = 14;
    const radius = 5.0;

    // Disc geometry with rings for organic height carving
    const geometry = new THREE.RingGeometry(0.01, radius, radialSegs, ringSegs);
    geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    // Pond center is around (x: 1.8, z: 1.2)
    const pondCenter = new THREE.Vector2(1.8, 1.2);
    const pondRadius = 1.4;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      const dPond = pondCenter.distanceTo(new THREE.Vector2(v.x, v.z));
      const angle = Math.atan2(v.z, v.x);
      const distFromCenter = Math.sqrt(v.x * v.x + v.z * v.z);

      // Irregular perimeter edging
      const perimeterWobble =
        Math.sin(angle * 3) * 0.35 +
        Math.cos(angle * 5) * 0.2 +
        Math.sin(angle * 7) * 0.12;

      // Soft mounds on the terrain (higher near the windmill and house)
      let height = 0.12;

      // Rise towards back left (house area: x: -1.6, z: -1.2)
      const dHouse = Math.hypot(v.x + 1.6, v.z + 1.2);
      if (dHouse < 2.5) {
        height += (2.5 - dHouse) * 0.08;
      }

      // Rise slightly near windmill (x: -1.2, z: 2.0)
      const dMill = Math.hypot(v.x + 1.2, v.z - 2.0);
      if (dMill < 2.0) {
        height += (2.0 - dMill) * 0.07;
      }

      // Pond depression: dip smoothly down
      if (dPond < pondRadius) {
        const pondFactor = Math.cos((dPond / pondRadius) * (Math.PI / 2));
        height -= pondFactor * 0.35;
      }

      // Cliff drop at the perimeter
      const normDist = distFromCenter / radius;
      if (normDist > 0.8) {
        const dropT = (normDist - 0.8) / 0.2;
        height -= dropT * 0.25;
      }

      // Add gentle micro-hills
      height += Math.sin(v.x * 1.5) * Math.cos(v.z * 1.5) * 0.05;

      // Perturb outer radial positions to match perimeter wobble
      if (distFromCenter > 2.0) {
        const wFactor = (distFromCenter - 2.0) / (radius - 2.0);
        v.x += Math.cos(angle) * perimeterWobble * wFactor;
        v.z += Math.sin(angle) * perimeterWobble * wFactor;
      }

      v.y = height;
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const grassMesh = new THREE.Mesh(geometry, this.grassMaterial);
    grassMesh.receiveShadow = true;
    grassMesh.castShadow = true;
    this.group.add(grassMesh);
  }

  /**
   * Cobblestone path winding from house to pond and windmill
   */
  private buildCobblestonePath() {
    const pathGroup = new THREE.Group();
    pathGroup.name = 'Path';

    // Waypoints connecting House (-1.5, -0.6) -> Fork (0.0, 0.2) -> Pond (0.8, 0.8) & Mill (-0.8, 1.6)
    const pathPoints: Array<{ x: number; z: number; size: number }> = [
      // House doorstep
      { x: -1.4, z: -0.4, size: 0.38 },
      { x: -1.1, z: -0.2, size: 0.32 },
      { x: -0.8, z: 0.0, size: 0.35 },
      { x: -0.5, z: 0.15, size: 0.33 },
      { x: -0.2, z: 0.25, size: 0.36 },
      // Fork to pond
      { x: 0.15, z: 0.35, size: 0.32 },
      { x: 0.45, z: 0.5, size: 0.35 },
      { x: 0.75, z: 0.7, size: 0.33 },
      { x: 0.95, z: 0.9, size: 0.30 },
      // Path towards windmill
      { x: -0.4, z: 0.55, size: 0.34 },
      { x: -0.6, z: 0.9, size: 0.32 },
      { x: -0.85, z: 1.3, size: 0.35 },
      { x: -1.0, z: 1.7, size: 0.36 },
      // Path towards back garden
      { x: -1.8, z: -0.6, size: 0.28 },
      { x: -2.2, z: -0.7, size: 0.26 },
    ];

    const stoneGeo = new THREE.CylinderGeometry(1, 1.1, 0.08, 6);

    pathPoints.forEach((pt, index) => {
      const stone = new THREE.Mesh(stoneGeo, this.pathMaterial);
      stone.scale.set(pt.size, 1, pt.size * (0.8 + (index % 3) * 0.15));
      stone.position.set(pt.x, 0.14, pt.z);
      stone.rotation.y = (index * 0.9) % Math.PI;
      stone.receiveShadow = true;
      pathGroup.add(stone);

      // Add a couple of tiny side stepping stones
      if (index % 2 === 0) {
        const sideStone = new THREE.Mesh(stoneGeo, this.pathMaterial);
        const offsetX = (index % 4 === 0 ? 0.25 : -0.25);
        sideStone.scale.set(pt.size * 0.5, 1, pt.size * 0.5);
        sideStone.position.set(pt.x + offsetX, 0.13, pt.z + 0.1);
        sideStone.rotation.y = (index * 1.3) % Math.PI;
        sideStone.receiveShadow = true;
        pathGroup.add(sideStone);
      }
    });

    this.group.add(pathGroup);
  }

  /**
   * Scattered low-poly rocks and shoreline boulders
   */
  private buildScatteredRocks() {
    const rocksGroup = new THREE.Group();
    rocksGroup.name = 'Rocks';

    const rockGeo = new THREE.DodecahedronGeometry(1, 0);

    const rockLocations = [
      // Along pond shoreline
      { x: 0.8, y: 0.05, z: 0.6, s: 0.22, r: 0.3 },
      { x: 2.6, y: 0.06, z: 0.7, s: 0.28, r: 1.1 },
      { x: 2.8, y: 0.05, z: 1.6, s: 0.32, r: 2.2 },
      { x: 1.5, y: 0.04, z: 2.4, s: 0.25, r: 0.7 },
      { x: 0.7, y: 0.05, z: 1.9, s: 0.2, r: 1.8 },
      // Near cliffs & edges
      { x: 3.8, y: 0.05, z: -1.2, s: 0.45, r: 0.5 },
      { x: 3.5, y: 0.04, z: -1.7, s: 0.3, r: 1.4 },
      { x: -3.4, y: 0.1, z: 1.8, s: 0.42, r: 2.8 },
      { x: -3.8, y: 0.08, z: 1.3, s: 0.32, r: 0.9 },
      { x: -3.2, y: 0.12, z: -1.8, s: 0.5, r: 1.6 },
      { x: 0.2, y: 0.1, z: -3.6, s: 0.48, r: 2.1 },
      { x: 0.8, y: 0.08, z: -3.8, s: 0.35, r: 0.4 },
    ];

    rockLocations.forEach((loc) => {
      const rock = new THREE.Mesh(rockGeo, this.rockMaterial);
      rock.scale.set(loc.s, loc.s * 0.75, loc.s * 1.1);
      rock.position.set(loc.x, loc.y, loc.z);
      rock.rotation.set(loc.r, loc.r * 1.4, loc.r * 0.7);
      rock.castShadow = true;
      rock.receiveShadow = true;
      rocksGroup.add(rock);
    });

    this.group.add(rocksGroup);
  }

  /**
   * Rustic wooden post-and-rail fences
   */
  private buildFences() {
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'Fences';

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x82593b,
      roughness: 0.85,
      metalness: 0.05,
    });

    const postGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.55, 5);
    const railGeo = new THREE.BoxGeometry(0.7, 0.04, 0.03);

    // Fence segment along back-left pasture
    const fencePosts = [
      { x: -2.8, z: -0.2, rot: 0.1 },
      { x: -2.8, z: 0.4, rot: -0.1 },
      { x: -2.7, z: 1.0, rot: 0.15 },
      { x: -2.5, z: 1.6, rot: -0.05 },
    ];

    fencePosts.forEach((post, i) => {
      const postMesh = new THREE.Mesh(postGeo, woodMat);
      postMesh.position.set(post.x, 0.35, post.z);
      postMesh.rotation.y = post.rot;
      postMesh.castShadow = true;
      postMesh.receiveShadow = true;
      fenceGroup.add(postMesh);

      // Horizontal rails between posts
      if (i < fencePosts.length - 1) {
        const next = fencePosts[i + 1];
        const midX = (post.x + next.x) / 2;
        const midZ = (post.z + next.z) / 2;
        const angle = Math.atan2(next.z - post.z, next.x - post.x);
        const dist = Math.hypot(next.x - post.x, next.z - post.z);

        // Top rail
        const rail1 = new THREE.Mesh(railGeo, woodMat);
        rail1.scale.x = dist / 0.7;
        rail1.position.set(midX, 0.48, midZ);
        rail1.rotation.y = -angle;
        rail1.castShadow = true;
        fenceGroup.add(rail1);

        // Lower rail
        const rail2 = new THREE.Mesh(railGeo, woodMat);
        rail2.scale.x = dist / 0.7;
        rail2.position.set(midX, 0.32, midZ);
        rail2.rotation.y = -angle;
        rail2.castShadow = true;
        fenceGroup.add(rail2);
      }
    });

    this.group.add(fenceGroup);
  }

  /**
   * Adapts island materials based on weather (e.g. wet sheen during rain)
   */
  public updateWeather(_weather: 'clear' | 'rain', rainBlend: number) {
    // When wet, grass and rock become slightly darker and glossier (lower roughness)
    const wetRoughnessGrass = THREE.MathUtils.lerp(0.85, 0.65, rainBlend);
    const wetRoughnessRock = THREE.MathUtils.lerp(0.9, 0.6, rainBlend);

    this.grassMaterial.roughness = wetRoughnessGrass;
    this.rockMaterial.roughness = wetRoughnessRock;
    this.dirtMaterial.roughness = THREE.MathUtils.lerp(0.95, 0.7, rainBlend);
  }
}
