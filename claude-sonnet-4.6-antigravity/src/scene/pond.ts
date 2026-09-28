// Pond with water plane, shoreline rocks, and ripple system
import * as THREE from 'three';

export interface PondObjects {
  group: THREE.Group;
  waterMesh: THREE.Mesh;
  ripples: RippleObject[];
  update: (dt: number, isRaining: boolean) => void;
}

interface RippleObject {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  x: number;
  z: number;
}

const RIPPLE_COUNT = 12;
const POND_RADIUS = 2.0;

export function createPond(): PondObjects {
  const group = new THREE.Group();

  // Pond basin (depression shape)
  const basinMat = new THREE.MeshLambertMaterial({ color: 0x4a6a50 });
  const basinGeo = new THREE.CylinderGeometry(POND_RADIUS + 0.3, POND_RADIUS + 0.1, 0.35, 20);
  const basin = new THREE.Mesh(basinGeo, basinMat);
  basin.position.y = -0.18;
  basin.receiveShadow = true;
  group.add(basin);

  // Water plane
  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x4a7aaa,
    transparent: true,
    opacity: 0.82,
  });
  const waterGeo = new THREE.CircleGeometry(POND_RADIUS, 32);
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.01;
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // Shoreline rocks
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x808878 });
  const rockPositions: [number, number, number, number][] = [
    [1.9, 0, 0.4, 0.22],
    [-1.7, 0, 0.8, 0.18],
    [0.5, 0, 1.95, 0.25],
    [-0.8, 0, -1.85, 0.20],
    [1.5, 0, -1.3, 0.17],
    [-1.5, 0, -0.7, 0.19],
  ];
  for (const [rx, ry, rz, rs] of rockPositions) {
    const rGeo = new THREE.IcosahedronGeometry(rs, 1);
    const rMesh = new THREE.Mesh(rGeo, rockMat);
    rMesh.position.set(rx, ry + 0.05, rz);
    rMesh.scale.y = 0.5;
    rMesh.rotation.y = Math.random() * Math.PI;
    group.add(rMesh);
  }

  // Lily pads (decorative)
  const lilyMat = new THREE.MeshLambertMaterial({ color: 0x3a7a30, side: THREE.DoubleSide });
  const lilyPositions: [number, number][] = [[0.6, 0.8], [-0.9, 0.4], [0.2, -1.1]];
  for (const [lx, lz] of lilyPositions) {
    const lGeo = new THREE.CircleGeometry(0.22, 8);
    const lily = new THREE.Mesh(lGeo, lilyMat);
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(lx, 0.02, lz);
    group.add(lily);
  }

  // Ripple pool (pre-allocated)
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xaaccee,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const ripples: RippleObject[] = [];
  for (let i = 0; i < RIPPLE_COUNT; i++) {
    const rGeo = new THREE.RingGeometry(0.01, 0.08, 16);
    const rMesh = new THREE.Mesh(rGeo, rippleMat.clone());
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.y = 0.03;
    rMesh.visible = false;
    group.add(rMesh);
    ripples.push({ mesh: rMesh, age: -1, maxAge: 1.5, x: 0, z: 0 });
  }

  let rippleTimer = 0;
  let rippleIndex = 0;

  function spawnRipple(): void {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (POND_RADIUS - 0.2);
    const ro = ripples[rippleIndex % RIPPLE_COUNT];
    ro.x = Math.cos(angle) * r;
    ro.z = Math.sin(angle) * r;
    ro.age = 0;
    ro.maxAge = 1.2 + Math.random() * 0.6;
    ro.mesh.position.set(ro.x, 0.03, ro.z);
    ro.mesh.visible = true;
    rippleIndex++;
  }

  function update(dt: number, isRaining: boolean): void {
    if (isRaining) {
      rippleTimer -= dt;
      if (rippleTimer <= 0) {
        spawnRipple();
        rippleTimer = 0.08 + Math.random() * 0.12;
      }
    }

    for (const rip of ripples) {
      if (rip.age < 0) continue;
      rip.age += dt;
      if (rip.age >= rip.maxAge) {
        rip.age = -1;
        rip.mesh.visible = false;
        continue;
      }
      const t = rip.age / rip.maxAge;
      const scale = 0.5 + t * 3.5;
      rip.mesh.scale.setScalar(scale);
      const mat = rip.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * (1 - t);
    }
  }

  return { group, waterMesh, ripples, update };
}
