import * as THREE from 'three';
import { grassTexture, stoneTexture } from './textures';

const SIDES = 36;

export function islandRadius(angle: number): number {
  return 2.34 * (1 + 0.052 * Math.sin(angle * 3 + 0.4) + 0.032 * Math.cos(angle * 5 - 0.8) + 0.018 * Math.sin(angle * 8));
}

export function isOverIsland(x: number, z: number): boolean {
  const angle = Math.atan2(z, x);
  return Math.hypot(x, z) < islandRadius(angle) * 0.98;
}

function topHeight(x: number, z: number): number {
  return 0.05 + 0.018 * Math.sin(x * 2.4 + z * 0.7) + 0.014 * Math.cos(z * 2.7 - x);
}

function buildTop(): THREE.Mesh {
  const positions: number[] = [0, topHeight(0, 0), 0];
  const colors: number[] = [0.98, 0.98, 0.9];
  const rings = [0.72, 1.43, 2.16];
  const palette = [new THREE.Color('#f1f0df'), new THREE.Color('#eaf0d9'), new THREE.Color('#f5edda'), new THREE.Color('#e8edd6')];

  for (let ring = 0; ring < rings.length; ring += 1) {
    for (let i = 0; i < SIDES; i += 1) {
      const angle = i / SIDES * Math.PI * 2;
      const radius = rings[ring] * (ring === 2 ? islandRadius(angle) / 2.34 : 1 + 0.017 * Math.sin(angle * 4 + ring));
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, topHeight(x, z), z);
      const tint = palette[(i * 7 + ring * 3) % palette.length];
      const variation = 0.98 + 0.025 * Math.sin(angle * 9 + ring * 2);
      colors.push(tint.r * variation, tint.g * variation, tint.b * variation);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < SIDES; i += 1) {
    const next = (i + 1) % SIDES;
    indices.push(0, 1 + next, 1 + i);
  }
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    const inner = 1 + ring * SIDES;
    const outer = inner + SIDES;
    for (let i = 0; i < SIDES; i += 1) {
      const next = (i + 1) % SIDES;
      indices.push(inner + i, outer + next, outer + i, inner + i, inner + next, outer + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff', map: grassTexture, vertexColors: true, roughness: 0.96,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function buildCliffs(): THREE.Mesh {
  const levels = [
    { y: -0.02, radius: 2.28 },
    { y: -0.37, radius: 2.12 },
    { y: -0.86, radius: 1.74 },
    { y: -1.39, radius: 1.1 },
    { y: -1.91, radius: 0.46 },
    { y: -2.12, radius: 0.1 },
  ];
  const stoneColors = ['#918777', '#858b81', '#a39b87', '#788887', '#aca18a'].map((color) => new THREE.Color(color));
  const positions: number[] = [];
  const colors: number[] = [];

  const point = (level: number, i: number): THREE.Vector3 => {
    const angle = i / SIDES * Math.PI * 2;
    const jag = 1 + 0.052 * Math.sin(angle * 4 + level * 1.2) + 0.026 * Math.cos(angle * 7 - level);
    const radius = levels[level].radius * jag;
    return new THREE.Vector3(Math.cos(angle) * radius, levels[level].y + 0.055 * Math.sin(angle * 3 + level), Math.sin(angle) * radius);
  };
  const addTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, tint: THREE.Color) => {
    const variation = 0.89 + Math.random() * 0.2;
    for (const vertex of [a, b, c]) {
      positions.push(vertex.x, vertex.y, vertex.z);
      colors.push(tint.r * variation, tint.g * variation, tint.b * variation);
    }
  };

  for (let level = 0; level < levels.length - 1; level += 1) {
    for (let i = 0; i < SIDES; i += 1) {
      const next = (i + 1) % SIDES;
      const a = point(level, i);
      const b = point(level, next);
      const c = point(level + 1, next);
      const d = point(level + 1, i);
      const tint = stoneColors[(i * 5 + level * 3) % stoneColors.length];
      if ((i + level) % 2 === 0) {
        addTriangle(a, d, b, tint);
        addTriangle(b, d, c, stoneColors[(i + level + 2) % stoneColors.length]);
      } else {
        addTriangle(a, d, c, tint);
        addTriangle(a, c, b, stoneColors[(i + level + 1) % stoneColors.length]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', map: stoneTexture, vertexColors: true, roughness: 0.94, flatShading: true });
  const cliffs = new THREE.Mesh(geometry, material);
  cliffs.castShadow = true;
  cliffs.receiveShadow = false;
  return cliffs;
}

export function createIsland(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Floating island';
  group.add(buildCliffs(), buildTop());

  const undercut = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.48, 7, 1),
    new THREE.MeshStandardMaterial({ color: '#858a7d', map: stoneTexture, roughness: 1, flatShading: true }),
  );
  undercut.position.set(0.22, -2.12, -0.12);
  undercut.rotation.z = Math.PI;
  undercut.scale.set(1.25, 1, 0.9);
  undercut.castShadow = true;
  group.add(undercut);

  const ledges = [
    { x: -1.3, y: -0.57, z: -1.32, scale: [0.54, 0.15, 0.32], turn: 0.6 },
    { x: 1.28, y: -0.86, z: 1.08, scale: [0.46, 0.13, 0.34], turn: 2.2 },
    { x: -0.65, y: -1.37, z: 1.14, scale: [0.38, 0.17, 0.29], turn: -0.4 },
  ];
  for (const ledge of ledges) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color: '#999381', map: stoneTexture, roughness: 1, flatShading: true }),
    );
    rock.position.set(ledge.x, ledge.y, ledge.z);
    rock.scale.set(ledge.scale[0], ledge.scale[1], ledge.scale[2]);
    rock.rotation.set(0.2, ledge.turn, 0.15);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
  return group;
}
