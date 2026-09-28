import * as THREE from 'three';

export class Props {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Props';

    this.buildCobblestonePath();
    this.buildFence();
    this.buildBench();
    this.buildBoulders();
    this.buildWell();
  }

  private buildCobblestonePath(): void {
    const stoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x8b939c, roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x7a818a, roughness: 0.9, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x9ba4af, roughness: 0.85, flatShading: true })
    ];

    // Path 1: From cottage porch (-1.4, 1.2) winding to pond pier (1.0, 0.5)
    const mainPathPoints = [
      new THREE.Vector3(-1.3, 0.04, 1.2),
      new THREE.Vector3(-0.95, 0.04, 1.05),
      new THREE.Vector3(-0.6, 0.04, 0.9),
      new THREE.Vector3(-0.25, 0.04, 0.85),
      new THREE.Vector3(0.1, 0.04, 0.8),
      new THREE.Vector3(0.45, 0.04, 0.7),
      new THREE.Vector3(0.8, 0.04, 0.5)
    ];

    // Path 2: Fork branching off toward the windmill (-2.2, -1.8)
    const windmillPathPoints = [
      new THREE.Vector3(-0.6, 0.04, 0.9),
      new THREE.Vector3(-0.8, 0.04, 0.4),
      new THREE.Vector3(-1.1, 0.04, -0.2),
      new THREE.Vector3(-1.5, 0.08, -0.8),
      new THREE.Vector3(-1.9, 0.18, -1.4),
      new THREE.Vector3(-2.3, 0.32, -1.9)
    ];

    const allPaths = [...mainPathPoints, ...windmillPathPoints];

    for (let i = 0; i < allPaths.length; i++) {
      const pt = allPaths[i];
      const mat = stoneMats[i % stoneMats.length];
      const radius = 0.18 + (Math.random() - 0.5) * 0.06;
      const geom = new THREE.CylinderGeometry(radius, radius * 1.05, 0.06, 7);
      const stone = new THREE.Mesh(geom, mat);

      // Slightly perturb position for handmade feel
      const jitterX = (Math.random() - 0.5) * 0.06;
      const jitterZ = (Math.random() - 0.5) * 0.06;
      stone.position.set(pt.x + jitterX, pt.y, pt.z + jitterZ);
      stone.rotation.y = Math.random() * Math.PI;
      stone.scale.set(1.0 + (Math.random() - 0.5) * 0.2, 1.0, 1.0 + (Math.random() - 0.5) * 0.2);
      stone.receiveShadow = true;
      this.group.add(stone);
    }
  }

  private buildFence(): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x62432a,
      roughness: 0.8
    });

    const fenceGroup = new THREE.Group();

    // Fence along southern cliff edge near the cottage garden
    const fencePosts = [
      new THREE.Vector3(-3.2, 0.05, 2.2),
      new THREE.Vector3(-2.4, 0.05, 3.1),
      new THREE.Vector3(-1.5, 0.05, 3.7),
      new THREE.Vector3(-0.5, 0.05, 4.0),
      new THREE.Vector3(0.5, 0.05, 4.0)
    ];

    const postGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.65, 5);

    for (let i = 0; i < fencePosts.length; i++) {
      const p = fencePosts[i];
      const post = new THREE.Mesh(postGeom, woodMat);
      post.position.set(p.x, p.y + 0.32, p.z);
      post.rotation.z = (Math.random() - 0.5) * 0.08;
      post.castShadow = true;
      fenceGroup.add(post);

      // Horizontal rails between posts
      if (i < fencePosts.length - 1) {
        const nextP = fencePosts[i + 1];
        const dist = p.distanceTo(nextP);
        const midX = (p.x + nextP.x) / 2;
        const midZ = (p.z + nextP.z) / 2;
        const angleY = Math.atan2(nextP.x - p.x, nextP.z - p.z);

        const railGeom = new THREE.BoxGeometry(0.04, 0.05, dist);

        // Top rail
        const railTop = new THREE.Mesh(railGeom, woodMat);
        railTop.position.set(midX, p.y + 0.46, midZ);
        railTop.rotation.y = angleY;
        railTop.castShadow = true;
        fenceGroup.add(railTop);

        // Bottom rail
        const railBottom = new THREE.Mesh(railGeom, woodMat);
        railBottom.position.set(midX, p.y + 0.22, midZ);
        railBottom.rotation.y = angleY;
        railBottom.castShadow = true;
        fenceGroup.add(railBottom);
      }
    }

    this.group.add(fenceGroup);
  }

  private buildBench(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.75 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.7 });

    const bench = new THREE.Group();
    bench.position.set(0.65, 0.04, -0.6);
    bench.rotation.y = -Math.PI * 0.35; // Looking toward pond

    // Seat plank
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.28), woodMat);
    seat.position.y = 0.22;
    seat.castShadow = true;
    bench.add(seat);

    // Backrest plank
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.04), woodMat);
    back.position.set(0, 0.38, -0.12);
    back.rotation.x = -0.15;
    back.castShadow = true;
    bench.add(back);

    // Iron legs
    const legGeom = new THREE.BoxGeometry(0.04, 0.22, 0.24);
    const legLeft = new THREE.Mesh(legGeom, ironMat);
    legLeft.position.set(-0.34, 0.11, 0);
    bench.add(legLeft);

    const legRight = new THREE.Mesh(legGeom, ironMat);
    legRight.position.set(0.34, 0.11, 0);
    bench.add(legRight);

    this.group.add(bench);
  }

  private buildBoulders(): void {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x68707a,
      roughness: 0.88,
      flatShading: true
    });

    const boulders = [
      { x: -3.8, y: 0.05, z: -0.2, scale: 0.5 },
      { x: 1.8, y: 0.02, z: -2.8, scale: 0.4 },
      { x: -1.2, y: 0.25, z: -3.4, scale: 0.45 },
      { x: 4.2, y: -0.05, z: -1.2, scale: 0.35 }
    ];

    for (const b of boulders) {
      const geom = new THREE.DodecahedronGeometry(b.scale, 1);
      const mesh = new THREE.Mesh(geom, rockMat);
      mesh.position.set(b.x, b.y + b.scale * 0.4, b.z);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private buildWell(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x636a73, roughness: 0.9, flatShading: true });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x513521, roughness: 0.75 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1f4552, roughness: 0.2 });

    const well = new THREE.Group();
    well.position.set(-2.6, 0.05, 0.2);

    // Round stone rim
    const rimGeom = new THREE.CylinderGeometry(0.38, 0.42, 0.4, 10);
    const rim = new THREE.Mesh(rimGeom, stoneMat);
    rim.position.y = 0.2;
    rim.castShadow = true;
    rim.receiveShadow = true;
    well.add(rim);

    // Water inside
    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(0.32, 10), waterMat);
    waterDisc.rotation.x = -Math.PI * 0.5;
    waterDisc.position.y = 0.15;
    well.add(waterDisc);

    // Wooden upright posts
    const postGeom = new THREE.BoxGeometry(0.05, 0.7, 0.05);
    const post1 = new THREE.Mesh(postGeom, woodMat);
    post1.position.set(-0.32, 0.45, 0);
    well.add(post1);

    const post2 = new THREE.Mesh(postGeom, woodMat);
    post2.position.set(0.32, 0.45, 0);
    well.add(post2);

    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.05), woodMat);
    crossbar.position.set(0, 0.78, 0);
    well.add(crossbar);

    // Small pitched well roof
    const roofGeom = new THREE.ConeGeometry(0.48, 0.35, 4);
    roofGeom.rotateY(Math.PI * 0.25);
    const roof = new THREE.Mesh(roofGeom, woodMat);
    roof.position.set(0, 0.95, 0);
    roof.castShadow = true;
    well.add(roof);

    this.group.add(well);
  }
}
