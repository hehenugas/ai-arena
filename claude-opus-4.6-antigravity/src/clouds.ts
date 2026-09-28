import * as THREE from 'three';

function buildCloudCluster(cx: number, cy: number, cz: number, puffCount: number): THREE.Group {
  const cluster = new THREE.Group();
  cluster.position.set(cx, cy, cz);

  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.95,
    transparent: true,
    opacity: 0.85,
  });

  for (let i = 0; i < puffCount; i++) {
    const sx = 0.3 + Math.random() * 0.5;
    const sy = 0.2 + Math.random() * 0.3;
    const sz = 0.3 + Math.random() * 0.4;
    const geo = new THREE.SphereGeometry(1, 8, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(sx, sy, sz);
    // Offset puffs within the cluster so they overlap into a cloud shape
    mesh.position.set(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.6,
    );
    cluster.add(mesh);
  }

  return cluster;
}

function buildDarkCloudCluster(cx: number, cy: number, cz: number, puffCount: number): THREE.Group {
  const cluster = new THREE.Group();
  cluster.position.set(cx, cy, cz);

  const mat = new THREE.MeshStandardMaterial({
    color: '#667788',
    roughness: 0.95,
    transparent: true,
    opacity: 0.9,
  });

  for (let i = 0; i < puffCount; i++) {
    const sx = 0.4 + Math.random() * 0.6;
    const sy = 0.25 + Math.random() * 0.35;
    const sz = 0.4 + Math.random() * 0.5;
    const geo = new THREE.SphereGeometry(1, 8, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(
      (Math.random() - 0.5) * 1.4,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.7,
    );
    cluster.add(mesh);
  }

  return cluster;
}

export function createClouds(): { group: THREE.Group } {
  const group = new THREE.Group();
  const cloudMeshes: THREE.Group[] = [];

  const placements = [
    { angle: 0.0, radius: 4, y: 7.2, puffs: 4 },
    { angle: 1.1, radius: 8, y: 8.0, puffs: 5 },
    { angle: 2.3, radius: 5, y: 6.5, puffs: 3 },
    { angle: 3.5, radius: 11, y: 8.5, puffs: 4 },
    { angle: 4.6, radius: 7, y: 7.0, puffs: 5 },
    { angle: 5.8, radius: 3, y: 9.0, puffs: 3 },
  ];

  for (const p of placements) {
    const cx = Math.cos(p.angle) * p.radius;
    const cz = Math.sin(p.angle) * p.radius;
    const cluster = buildCloudCluster(cx, p.y, cz, p.puffs);
    group.add(cluster);
    cloudMeshes.push(cluster);
  }

  group.userData.cloudMeshes = cloudMeshes;
  return { group };
}

export function createDarkClouds(): { group: THREE.Group } {
  const group = new THREE.Group();
  const cloudMeshes: THREE.Group[] = [];

  // Denser placement, lower altitude
  const placements = [
    { angle: 0.3, radius: 3, y: 5.5, puffs: 5 },
    { angle: 1.0, radius: 6, y: 6.2, puffs: 5 },
    { angle: 1.8, radius: 4, y: 5.8, puffs: 4 },
    { angle: 2.7, radius: 9, y: 6.8, puffs: 5 },
    { angle: 3.6, radius: 5, y: 5.2, puffs: 4 },
    { angle: 4.5, radius: 7, y: 6.5, puffs: 5 },
    { angle: 5.4, radius: 10, y: 7.0, puffs: 4 },
  ];

  for (const p of placements) {
    const cx = Math.cos(p.angle) * p.radius;
    const cz = Math.sin(p.angle) * p.radius;
    const cluster = buildDarkCloudCluster(cx, p.y, cz, p.puffs);
    group.add(cluster);
    cloudMeshes.push(cluster);
  }

  group.userData.cloudMeshes = cloudMeshes;
  group.visible = false;
  return { group };
}

export function updateClouds(
  group: THREE.Group,
  darkGroup: THREE.Group,
  dt: number,
  wind: number,
  _weather: string,
  weatherTransition: number,
): void {
  const clampedDt = Math.min(dt, 0.1);

  // Drift normal clouds
  const clouds = group.userData.cloudMeshes as THREE.Group[];
  if (clouds) {
    for (const cluster of clouds) {
      cluster.position.x += wind * 0.3 * clampedDt;
      if (cluster.position.x > 15) cluster.position.x = -15;
      if (cluster.position.x < -15) cluster.position.x = 15;
    }
  }

  // Drift dark clouds at slightly different speed for parallax
  const darkClouds = darkGroup.userData.cloudMeshes as THREE.Group[];
  if (darkClouds) {
    for (const cluster of darkClouds) {
      cluster.position.x += wind * 0.2 * clampedDt;
      if (cluster.position.x > 15) cluster.position.x = -15;
      if (cluster.position.x < -15) cluster.position.x = 15;
    }
  }

  // Cross-fade dark clouds based on weather transition
  if (weatherTransition > 0.01) {
    darkGroup.visible = true;
    darkClouds?.forEach((cluster) => {
      cluster.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.opacity = 0.9 * weatherTransition;
        }
      });
    });
  } else {
    darkGroup.visible = false;
  }

  // Fade normal clouds slightly when rain comes in
  clouds?.forEach((cluster) => {
    cluster.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.opacity = THREE.MathUtils.lerp(0.85, 0.4, weatherTransition);
      }
    });
  });
}
