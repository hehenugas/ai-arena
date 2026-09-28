import * as THREE from 'three';

export interface IslandShape {
  getRadius(angle: number): number;
  getHeight(x: number, z: number): number;
}

export class Island {
  public group: THREE.Group;
  public shape: IslandShape;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Island';

    this.shape = {
      getRadius: (angle: number): number => {
        // Natural, gentle undulating island boundary
        return 6.6 * (
          1.0 +
          0.09 * Math.sin(angle * 3 + 0.2) -
          0.07 * Math.cos(angle * 2 - 0.4) +
          0.04 * Math.sin(angle * 5 + 1.1)
        );
      },
      getHeight: (x: number, z: number): number => {
        // Windmill hill on the upper-left (around x: -2.8, z: -2.8)
        const dWindmill = Math.hypot(x - (-2.8), z - (-2.8));
        const hill = Math.max(0, 1 - dWindmill / 3.0) * 0.55;

        // Pond depression around (x: 2.2, z: 1.2)
        const dPond = Math.hypot(x - 2.2, z - 1.2);
        const pondHole = Math.max(0, 1 - dPond / 2.6) * -0.25;

        // Subtle gentle undulations elsewhere
        const undulation = 0.04 * Math.sin(x * 0.8) * Math.cos(z * 0.8);

        return hill + pondHole + undulation;
      }
    };

    this.buildIsland();
  }

  private buildIsland(): void {
    // 1. Top Grass Surface with irregular perimeter
    const grassMesh = this.createGrassMesh();
    this.group.add(grassMesh);

    // 2. Earth / Soil Rim
    const soilMesh = this.createSoilBand();
    this.group.add(soilMesh);

    // 3. Sculpted Rocky Underside (Inverted faceted mountain)
    const rockMesh = this.createRockUnderside();
    this.group.add(rockMesh);

    // 4. Hanging Stalactite Rocks & Roots
    this.createHangingFormations();
  }

  private createGrassMesh(): THREE.Mesh {
    const segmentsR = 32;
    const segmentsTheta = 64;
    const geom = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Center vertex
    const centerH = this.shape.getHeight(0, 0);
    vertices.push(0, centerH, 0);
    uvs.push(0.5, 0.5);

    // Rings from center to perimeter
    for (let r = 1; r <= segmentsR; r++) {
      const frac = r / segmentsR;
      for (let t = 0; t < segmentsTheta; t++) {
        const angle = (t / segmentsTheta) * Math.PI * 2;
        const maxR = this.shape.getRadius(angle);
        const curR = maxR * frac;
        const x = Math.cos(angle) * curR;
        const z = Math.sin(angle) * curR;
        let y = this.shape.getHeight(x, z);

        // Near perimeter, slightly round down to meet the soil rim
        if (frac > 0.88) {
          const rimFrac = (frac - 0.88) / 0.12;
          y -= rimFrac * rimFrac * 0.18;
        }

        vertices.push(x, y, z);
        uvs.push(x / 14 + 0.5, z / 14 + 0.5);
      }
    }

    // Indices for center fan (CCW for upward normals)
    for (let t = 0; t < segmentsTheta; t++) {
      const nextT = (t + 1) % segmentsTheta;
      indices.push(0, 1 + nextT, 1 + t);
    }

    // Indices for rings (CCW for upward normals)
    for (let r = 1; r < segmentsR; r++) {
      const ringStart = 1 + (r - 1) * segmentsTheta;
      const nextRingStart = 1 + r * segmentsTheta;
      for (let t = 0; t < segmentsTheta; t++) {
        const nextT = (t + 1) % segmentsTheta;
        const a = ringStart + t;
        const b = nextRingStart + t;
        const c = nextRingStart + nextT;
        const d = ringStart + nextT;

        indices.push(a, d, b);
        indices.push(d, c, b);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x67b544,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geom, grassMat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  private createSoilBand(): THREE.Mesh {
    const segmentsTheta = 64;
    const geom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    const topYList: number[] = [];
    const xList: number[] = [];
    const zList: number[] = [];

    for (let t = 0; t < segmentsTheta; t++) {
      const angle = (t / segmentsTheta) * Math.PI * 2;
      const r = this.shape.getRadius(angle);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = this.shape.getHeight(x, z) - 0.18;
      xList.push(x);
      zList.push(z);
      topYList.push(y);
    }

    // Top ring of soil
    for (let t = 0; t < segmentsTheta; t++) {
      vertices.push(xList[t], topYList[t], zList[t]);
    }

    // Bottom ring of soil (slightly indented and dropped down)
    for (let t = 0; t < segmentsTheta; t++) {
      const x = xList[t] * 0.96;
      const z = zList[t] * 0.96;
      const y = topYList[t] - 0.55;
      vertices.push(x, y, z);
    }

    for (let t = 0; t < segmentsTheta; t++) {
      const nextT = (t + 1) % segmentsTheta;
      const a = t;
      const b = segmentsTheta + t;
      const c = segmentsTheta + nextT;
      const d = nextT;

      indices.push(a, d, b);
      indices.push(d, c, b);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x6e4b2d,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geom, soilMat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  private createRockUnderside(): THREE.Mesh {
    const layers = 5;
    const segmentsTheta = 36;
    const geom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    // Layer parameters: [fractionOfRadius, yDepth]
    const layerDefs = [
      { rFrac: 0.92, y: -0.65 },
      { rFrac: 0.78, y: -1.35 },
      { rFrac: 0.60, y: -2.3 },
      { rFrac: 0.40, y: -3.4 },
      { rFrac: 0.18, y: -4.4 }
    ];

    // Seeded pseudo-random noise for rugged low-poly facets
    for (let l = 0; l < layers; l++) {
      const { rFrac, y } = layerDefs[l];
      for (let t = 0; t < segmentsTheta; t++) {
        const angle = (t / segmentsTheta) * Math.PI * 2;
        const baseR = this.shape.getRadius(angle) * rFrac;

        // Controlled jagged rock shelf offsets (strictly within island boundary)
        const jitterR = 0.94 + 0.06 * Math.sin(t * 3.7 + l * 2.1) + 0.04 * Math.cos(t * 7.1 - l * 1.5);
        const jitterY = 0.1 * Math.sin(t * 4.3 + l * 1.8);

        const r = baseR * jitterR;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        vertices.push(x, y + jitterY, z);
      }
    }

    // Bottom tip vertex
    const tipIndex = vertices.length / 3;
    vertices.push(0.2, -5.2, -0.1);

    // Faces between layers
    for (let l = 0; l < layers - 1; l++) {
      const startCurrent = l * segmentsTheta;
      const startNext = (l + 1) * segmentsTheta;
      for (let t = 0; t < segmentsTheta; t++) {
        const nextT = (t + 1) % segmentsTheta;
        const a = startCurrent + t;
        const b = startNext + t;
        const c = startNext + nextT;
        const d = startCurrent + nextT;

        indices.push(a, d, b);
        indices.push(d, c, b);
      }
    }

    // Bottom tip fan (outward-facing)
    const lastLayerStart = (layers - 1) * segmentsTheta;
    for (let t = 0; t < segmentsTheta; t++) {
      const nextT = (t + 1) % segmentsTheta;
      indices.push(lastLayerStart + nextT, lastLayerStart + t, tipIndex);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x545b64,
      roughness: 0.88,
      metalness: 0.1,
      side: THREE.DoubleSide,
      flatShading: true // Handcrafted low-poly diorama facet aesthetic
    });

    const mesh = new THREE.Mesh(geom, rockMat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  private createHangingFormations(): void {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x484f58,
      roughness: 0.9,
      flatShading: true
    });

    // Hanging stalactite rock clusters under the island
    const stalactiteData = [
      { x: -2.2, z: 1.5, y: -2.0, scale: 0.65, len: 1.8 },
      { x: 2.8, z: -1.2, y: -1.8, scale: 0.55, len: 1.6 },
      { x: -0.8, z: -2.5, y: -2.2, scale: 0.7, len: 2.2 },
      { x: 1.4, z: 2.2, y: -1.6, scale: 0.45, len: 1.3 },
      { x: -1.5, z: 0.0, y: -2.8, scale: 0.5, len: 1.5 },
      { x: 0.5, z: -1.5, y: -2.6, scale: 0.55, len: 1.7 }
    ];

    for (const d of stalactiteData) {
      const geom = new THREE.ConeGeometry(d.scale, d.len, 5);
      geom.rotateX(Math.PI); // Point downward
      const mesh = new THREE.Mesh(geom, rockMat);
      mesh.position.set(d.x, d.y - d.len * 0.4, d.z);
      mesh.rotation.z = (Math.random() - 0.5) * 0.2;
      mesh.rotation.x = (Math.random() - 0.5) * 0.2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
}
