import * as THREE from 'three';
import { mulberry32 } from './util';

/** Subtle procedural grass texture (allowed: canvas-generated, no external assets). */
function grassTexture(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#71a851';
  g.fillRect(0, 0, S, S);
  const rand = mulberry32(7);
  const tones = [
    'rgba(104,160,72,0.20)',
    'rgba(133,190,94,0.16)',
    'rgba(88,142,62,0.18)',
    'rgba(148,200,110,0.12)',
  ];
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = tones[Math.floor(rand() * tones.length)];
    const r = 1 + rand() * 2.2;
    g.beginPath();
    g.arc(rand() * S, rand() * S, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = 'rgba(70,120,52,0.25)';
  for (let i = 0; i < 420; i++) {
    g.fillRect(rand() * S, rand() * S, 1 + rand() * 2, 1 + rand() * 1.2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(0.33, 0.33);
  tex.anisotropy = 4;
  return tex;
}

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

/** Shared material library — reused across every builder. */
export const M = {
  grass: std({ map: grassTexture(), roughness: 0.95 }),
  dirt: std({ color: '#7a6248', roughness: 1 }),
  rock: std({ color: '#ffffff', vertexColors: true, flatShading: true, roughness: 0.95 }),
  rockGray: std({ color: '#8d9297', flatShading: true, roughness: 0.9 }),
  stone: std({ color: '#a7abb1', roughness: 0.85 }),
  stoneDark: std({ color: '#8a9096', roughness: 0.9 }),
  wood: std({ color: '#8a5a38', roughness: 0.8 }),
  woodDark: std({ color: '#66422a', roughness: 0.75 }),
  wall: std({ color: '#f3e9d6', roughness: 0.9 }),
  trim: std({ color: '#e6d8bf', roughness: 0.9 }),
  roof: std({ color: '#b0573c', roughness: 0.85, flatShading: true }),
  roofDark: std({ color: '#8c4230', roughness: 0.85 }),
  leaf1: std({ color: '#4e8a3c', flatShading: true, roughness: 0.9 }),
  leaf2: std({ color: '#63a84e', flatShading: true, roughness: 0.9 }),
  leaf3: std({ color: '#3c6e30', flatShading: true, roughness: 0.9 }),
  pine: std({ color: '#3f7d4d', flatShading: true, roughness: 0.9 }),
  trunk: std({ color: '#6e4a30', roughness: 0.9 }),
  sail: std({ color: '#efe6d0', roughness: 0.9, side: THREE.DoubleSide }),
  metal: std({ color: '#9a8f80', roughness: 0.45, metalness: 0.55 }),
  cloud: std({ color: '#f2efe6', roughness: 1, flatShading: true, emissive: '#f2efe6', emissiveIntensity: 0.3 }),
  cloudStorm: std({ color: '#5d6874', roughness: 1, flatShading: true, emissive: '#5d6874', emissiveIntensity: 0.18 }),
  water: std({
    color: '#6fa8c9',
    roughness: 0.14,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }),
  shore: std({
    color: '#b9a887',
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }),
  /** Single shared glass material — house-light state drives its emissive. */
  glass: std({ color: '#33404e', roughness: 0.25, metalness: 0.2, emissive: '#ffb45e', emissiveIntensity: 0 }),
};

export function makeSmokeMaterial(): THREE.MeshStandardMaterial {
  return std({ color: '#dcdcd8', transparent: true, opacity: 0, roughness: 1, depthWrite: false });
}
