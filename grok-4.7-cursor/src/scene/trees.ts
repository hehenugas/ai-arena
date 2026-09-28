import * as THREE from "three";
import { TREES, type TreeSpec } from "./layout";
import { WIND_DIR_X, WIND_DIR_Z } from "./wind";
import { surfaceHeight } from "./island";
import type { Materials } from "./materials";

type SwayTree = {
  group: THREE.Group;
  phase: number;
  amplitude: number;
  yaw: number;
};

export type TreeField = {
  group: THREE.Group;
  update: (elapsed: number, wind: number, reduced: boolean) => void;
};

export function createTrees(materials: Materials): TreeField {
  const group = new THREE.Group();
  group.name = "trees";
  const trees: SwayTree[] = TREES.map((spec) => {
    const tree = buildTree(spec, materials);
    tree.position.set(spec.x, surfaceHeight(spec.x, spec.z) - 0.02, spec.z);
    tree.scale.setScalar(spec.scale);
    group.add(tree);
    const amplitude = spec.kind === "pine" ? 0.032 : spec.kind === "bush" ? 0.045 : spec.kind === "small" ? 0.08 : 0.068;
    return { group: tree, phase: spec.phase, amplitude, yaw: spec.yaw };
  });

  return {
    group,
    update(elapsed, wind, reduced) {
      const frequency = reduced ? 0.35 : 1.2;
      for (const tree of trees) {
        const osc = Math.sin(elapsed * frequency + tree.phase);
        const amount = (osc * 0.72 + 0.28) * tree.amplitude * wind;
        tree.group.rotation.set(amount * WIND_DIR_Z, tree.yaw, -amount * WIND_DIR_X);
      }
    },
  };
}

function buildTree(spec: TreeSpec, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  if (spec.kind === "pine") {
    trunk(group, materials, 0.48, 0.035, 0.07);
    cone(group, materials.pine, 0.46, 0.58, 0.4);
    cone(group, materials.pine, 0.34, 0.5, 0.78);
    cone(group, materials.leafDark, 0.2, 0.4, 1.16);
    return group;
  }
  if (spec.kind === "bush") {
    trunk(group, materials, 0.12, 0.03, 0.05);
    sphere(group, materials.leaf, 0.28, 0, 0.28, 0);
    sphere(group, materials.leafLight, 0.2, 0.14, 0.24, 0.06);
    sphere(group, materials.leafDark, 0.18, -0.12, 0.22, -0.04);
    return group;
  }
  if (spec.kind === "small") {
    trunk(group, materials, 0.38, 0.035, 0.06);
    sphere(group, materials.leaf, 0.28, 0, 0.62, 0);
    sphere(group, materials.leafLight, 0.2, 0.12, 0.5, 0.06);
    sphere(group, materials.leafDark, 0.16, -0.08, 0.72, -0.02);
    return group;
  }
  trunk(group, materials, 0.62, 0.05, 0.09);
  sphere(group, materials.leaf, 0.4, 0, 0.98, 0);
  sphere(group, materials.leafLight, 0.3, 0.22, 0.78, 0.08);
  sphere(group, materials.leafDark, 0.28, -0.18, 0.8, -0.06);
  sphere(group, materials.leafLight, 0.22, 0.04, 1.22, -0.02);
  return group;
}

function trunk(group: THREE.Group, materials: Materials, height: number, radiusTop: number, radiusBottom: number): void {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 6);
  geometry.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(geometry, materials.trunk);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function sphere(group: THREE.Group, material: THREE.Material, radius: number, x: number, y: number, z: number): void {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 9), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function cone(group: THREE.Group, material: THREE.Material, radius: number, height: number, yBase: number): void {
  const geometry = new THREE.ConeGeometry(radius, height, 8);
  geometry.translate(0, yBase + height / 2, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}
