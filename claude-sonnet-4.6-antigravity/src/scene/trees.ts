// Trees with varied sizes and silhouettes
import * as THREE from 'three';

const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5530 });
const leaf1Mat = new THREE.MeshLambertMaterial({ color: 0x4a8a30 });
const leaf2Mat = new THREE.MeshLambertMaterial({ color: 0x3a7a20 });
const leaf3Mat = new THREE.MeshLambertMaterial({ color: 0x5a9a40 });

export interface TreeObject {
  group: THREE.Group;
  initialRotation: number;
  swayPhase: number;
}

// Layered cone tree (pine-like)
function makePineTree(trunkH: number, leafLayers: number, baseRadius: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, trunkH, 7),
    trunkMat
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);

  for (let i = 0; i < leafLayers; i++) {
    const t = i / (leafLayers - 1);
    const r = baseRadius * (1 - t * 0.55);
    const layerH = trunkH * 0.55 + i * (trunkH * 0.22);
    const h = trunkH * 0.45 / leafLayers;
    const leafMat = i % 2 === 0 ? leaf1Mat : leaf2Mat;
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(r, h * 2.5, 8),
      leafMat
    );
    leaf.position.y = layerH;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

// Round canopy tree (oak-like)
function makeOakTree(trunkH: number, canopyR: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, trunkH, 7),
    trunkMat
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);

  // Multi-sphere canopy
  const canopyY = trunkH + canopyR * 0.6;
  const offsets: [number, number, number][] = [
    [0, 0, 0],
    [canopyR * 0.4, -canopyR * 0.2, 0],
    [-canopyR * 0.35, -canopyR * 0.15, canopyR * 0.2],
    [0, -canopyR * 0.25, -canopyR * 0.35],
    [canopyR * 0.2, canopyR * 0.15, canopyR * 0.3],
  ];
  for (const [ox, oy, oz] of offsets) {
    const r = canopyR * (0.7 + Math.random() * 0.3);
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(r, 7, 5),
      Math.random() > 0.5 ? leaf1Mat : leaf3Mat
    );
    leaf.position.set(ox, canopyY + oy, oz);
    leaf.scale.y = 0.82;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

export interface TreeConfig {
  x: number;
  z: number;
  type: 'pine' | 'oak';
  scale: number;
  rotY: number;
}

export const TREE_CONFIGS: TreeConfig[] = [
  { x: -5.5, z: 1.5,  type: 'pine', scale: 1.0, rotY: 0.3 },
  { x: -4.8, z: -2.0, type: 'pine', scale: 0.8, rotY: 1.2 },
  { x: 4.5,  z: -2.5, type: 'pine', scale: 1.15, rotY: 0.7 },
  { x: 5.2,  z: 1.8,  type: 'oak',  scale: 0.9, rotY: 2.1 },
  { x: -3.0, z: 3.8,  type: 'oak',  scale: 0.75, rotY: 1.5 },
  { x: 2.5,  z: 4.0,  type: 'pine', scale: 0.65, rotY: 0.9 },
];

export function createTrees(): TreeObject[] {
  return TREE_CONFIGS.map((cfg, i) => {
    const tree = cfg.type === 'pine'
      ? makePineTree(1.8 * cfg.scale, 4, 0.85 * cfg.scale)
      : makeOakTree(1.5 * cfg.scale, 0.8 * cfg.scale);
    tree.position.set(cfg.x, 0.7, cfg.z);
    tree.rotation.y = cfg.rotY;
    tree.scale.setScalar(cfg.scale);
    return {
      group: tree,
      initialRotation: cfg.rotY,
      swayPhase: i * 1.2,
    };
  });
}
