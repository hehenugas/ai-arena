import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mulberry32, smoothstep } from "../util";
import { WIND_DIR_X, WIND_DIR_Z } from "./wind";

export type Clouds = {
  group: THREE.Group;
  update: (dt: number, wind: number, weatherMix: number, night: number) => void;
};

const LIMIT_X = 7.6;
const LIMIT_Z = 6.4;

export function createClouds(): Clouds {
  const group = new THREE.Group();
  group.name = "clouds";
  const specs = [
    { x: -2.2, y: 2.05, z: -3.35, scale: 0.92, speed: 0.58, seed: 3 },
    { x: 0.9, y: 2.28, z: -3.95, scale: 0.78, speed: 0.44, seed: 8 },
    { x: -3.9, y: 1.82, z: -1.7, scale: 0.66, speed: 0.66, seed: 13 },
    { x: 2.55, y: 2.02, z: -3.15, scale: 0.58, speed: 0.4, seed: 21 },
    { x: -0.35, y: 2.42, z: -4.45, scale: 0.98, speed: 0.36, seed: 34 },
  ];
  const clear = new THREE.Color("#f7f4ee");
  const rain = new THREE.Color("#8d959e");
  const clouds = specs.map((spec) => {
    const material = new THREE.MeshStandardMaterial({
      color: "#f7f4ee",
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      emissive: "#b7c6dc",
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(cloudGeometry(spec.seed), material);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.scale.set(spec.scale, spec.scale * 0.52, spec.scale * 0.82);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.raycast = () => undefined;
    group.add(mesh);
    return { mesh, material, baseY: spec.y, speed: spec.speed };
  });

  return {
    group,
    update(dt, wind, weatherMix, night) {
      for (const cloud of clouds) {
        cloud.mesh.position.x += WIND_DIR_X * wind * cloud.speed * dt;
        cloud.mesh.position.z += WIND_DIR_Z * wind * cloud.speed * dt;
        if (cloud.mesh.position.x > LIMIT_X) cloud.mesh.position.x = -LIMIT_X;
        if (cloud.mesh.position.x < -LIMIT_X) cloud.mesh.position.x = LIMIT_X;
        if (cloud.mesh.position.z > LIMIT_Z) cloud.mesh.position.z = -LIMIT_Z;
        if (cloud.mesh.position.z < -LIMIT_Z) cloud.mesh.position.z = LIMIT_Z;
        cloud.mesh.position.y = cloud.baseY - weatherMix * 0.45;
        const edge = Math.max(Math.abs(cloud.mesh.position.x) / LIMIT_X, Math.abs(cloud.mesh.position.z) / LIMIT_Z);
        const fade = 1 - smoothstep(0.78, 1, edge);
        cloud.material.opacity = fade * (0.98 - weatherMix * 0.06);
        cloud.material.color.copy(clear).lerp(rain, weatherMix);
        cloud.material.emissiveIntensity = night * 0.2 * (1 - weatherMix * 0.35);
      }
    },
  };
}

function cloudGeometry(seed: number): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const puffs = 8 + Math.floor(rand() * 3);
  for (let i = 0; i < puffs; i += 1) {
    const puff = new THREE.SphereGeometry(0.16 + rand() * 0.2, 12, 9);
    puff.translate((rand() - 0.5) * 1.45, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.48);
    parts.push(puff);
  }
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) {
    throw new Error("Could not build a cloud.");
  }
  return merged;
}
