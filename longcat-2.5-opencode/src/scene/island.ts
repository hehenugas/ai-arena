import * as THREE from 'three';
import { fbm, createCanvasTexture } from '../utils';

export function createIsland(): THREE.Group {
  const group = new THREE.Group();
  const radius = 8;
  const segments = 64;
  const rings = 12;

  const grassTexture = createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 3 + 1;
      const shade = Math.random() * 30 - 15;
      ctx.fillStyle = `rgb(${74 + shade},${124 + shade},${63 + shade})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 20 + 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, 'rgba(100, 160, 80, 0.3)');
      gradient.addColorStop(1, 'rgba(100, 160, 80, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const rockTexture = createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b5d4f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 4 + 1;
      const shade = Math.random() * 40 - 20;
      ctx.fillStyle = `rgb(${107 + shade},${93 + shade},${79 + shade})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(60, 50, 40, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });

  const topGeometry = createIslandTop(radius, segments, rings);
  const grassMaterial = new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 0.9, metalness: 0 });
  const topMesh = new THREE.Mesh(topGeometry, grassMaterial);
  topMesh.receiveShadow = true;
  topMesh.castShadow = true;
  group.add(topMesh);

  const bottomGeometry = createIslandBottom(radius, segments, rings);
  const rockMaterial = new THREE.MeshStandardMaterial({ map: rockTexture, roughness: 0.95, metalness: 0 });
  const bottomMesh = new THREE.Mesh(bottomGeometry, rockMaterial);
  bottomMesh.receiveShadow = true;
  bottomMesh.castShadow = true;
  group.add(bottomMesh);

  const edgeGeometry = createIslandEdge(radius, segments);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9, metalness: 0 });
  const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
  edgeMesh.receiveShadow = true;
  edgeMesh.castShadow = true;
  group.add(edgeMesh);

  return group;
}

function createIslandTop(radius: number, segments: number, rings: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  vertices.push(0, 0, 0);
  uvs.push(0.5, 0.5);

  for (let r = 1; r <= rings; r++) {
    const ringRadius = (r / rings) * radius;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      const edgeNoise = fbm(Math.cos(angle) * 2 + 10, Math.sin(angle) * 2 + 10, 3);
      const edgeFactor = r === rings ? 0.8 + edgeNoise * 0.4 : 1;
      const heightNoise = fbm(x * 0.3, z * 0.3, 3) * 0.3;
      const y = heightNoise * (1 - (r / rings) * 0.5);
      vertices.push(x * edgeFactor, y, z * edgeFactor);
      uvs.push(0.5 + (x / radius) * 0.5, 0.5 + (z / radius) * 0.5);
    }
  }

  for (let s = 0; s < segments; s++) {
    const next = (s + 1) % segments;
    indices.push(0, 1 + s, 1 + next);
  }

  for (let r = 0; r < rings - 1; r++) {
    const ringStart = 1 + r * segments;
    const nextRingStart = 1 + (r + 1) * segments;
    for (let s = 0; s < segments; s++) {
      const next = (s + 1) % segments;
      indices.push(ringStart + s, nextRingStart + s, nextRingStart + next);
      indices.push(ringStart + s, nextRingStart + next, ringStart + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIslandBottom(radius: number, segments: number, rings: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const depth = 6;

  for (let s = 0; s < segments; s++) {
    const angle = (s / segments) * Math.PI * 2;
    const edgeNoise = fbm(Math.cos(angle) * 2 + 10, Math.sin(angle) * 2 + 10, 3);
    const r = radius * (0.8 + edgeNoise * 0.4);
    vertices.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    uvs.push(s / segments, 0);
  }

  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    const ringRadius = radius * (1 - t) * 0.3;
    const y = -depth * t;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const noise = fbm(Math.cos(angle) * 3 + r, Math.sin(angle) * 3 + r, 3);
      const nr = ringRadius * (0.7 + noise * 0.6);
      const yOffset = fbm(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 2) * 0.5;
      vertices.push(Math.cos(angle) * nr, y + yOffset, Math.sin(angle) * nr);
      uvs.push(s / segments, t);
    }
  }

  const bottomIndex = vertices.length / 3;
  vertices.push(0, -depth - 0.5, 0);
  uvs.push(0.5, 1);

  for (let r = 0; r < rings - 1; r++) {
    const ringStart = r * segments;
    const nextRingStart = (r + 1) * segments;
    for (let s = 0; s < segments; s++) {
      const next = (s + 1) % segments;
      indices.push(ringStart + s, nextRingStart + s, nextRingStart + next);
      indices.push(ringStart + s, nextRingStart + next, ringStart + next);
    }
  }

  const lastRingStart = (rings - 1) * segments;
  for (let s = 0; s < segments; s++) {
    const next = (s + 1) % segments;
    indices.push(lastRingStart + s, bottomIndex, lastRingStart + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIslandEdge(radius: number, segments: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const height = 0.5;

  for (let s = 0; s < segments; s++) {
    const angle = (s / segments) * Math.PI * 2;
    const edgeNoise = fbm(Math.cos(angle) * 2 + 10, Math.sin(angle) * 2 + 10, 3);
    const r = radius * (0.8 + edgeNoise * 0.4);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    vertices.push(x, 0, z);
    vertices.push(x, -height, z);
  }

  for (let s = 0; s < segments; s++) {
    const next = (s + 1) % segments;
    indices.push(s * 2, s * 2 + 1, next * 2 + 1);
    indices.push(s * 2, next * 2 + 1, next * 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
