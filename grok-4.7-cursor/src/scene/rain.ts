import * as THREE from "three";
import { islandRadius, surfaceHeight } from "./island";
import { WIND_DIR_X, WIND_DIR_Z } from "./wind";

export type Rain = {
  mesh: THREE.InstancedMesh;
  update: (dt: number, weatherMix: number, wind: number) => void;
};

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Quaternion(1, 0, 0, 0);

export function createRain(count: number): Rain {
  const geometry = new THREE.BoxGeometry(0.012, 0.2, 0.012);
  const material = new THREE.MeshBasicMaterial({
    color: "#c5d5e4",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "rain";
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 4;
  mesh.raycast = () => undefined;
  mesh.visible = false;

  const px = new Float32Array(count);
  const py = new Float32Array(count);
  const pz = new Float32Array(count);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i += 1) respawn(px, py, pz, speed, i, false);

  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();

  return {
    mesh,
    update(dt, weatherMix, wind) {
      material.opacity = Math.min(0.72, weatherMix * 0.66);
      mesh.visible = weatherMix > 0.004;
      for (let i = 0; i < count; i += 1) {
        const vx = WIND_DIR_X * wind * 3.15 * speed[i];
        const vz = WIND_DIR_Z * wind * 3.15 * speed[i];
        const vy = -2.55 * speed[i];
        px[i] += vx * dt;
        py[i] += vy * dt;
        pz[i] += vz * dt;
        const theta = Math.atan2(pz[i], px[i]);
        const radius = islandRadius(theta);
        const distance = Math.hypot(px[i], pz[i]);
        const landed = distance <= radius * 1.02 && py[i] <= surfaceHeight(px[i], pz[i]) + 0.045;
        if (landed || py[i] < -2.8) respawn(px, py, pz, speed, i, true);
        if (!mesh.visible) continue;
        direction.set(vx, vy, vz).normalize();
        dummy.position.set(px[i], py[i], pz[i]);
        if (direction.y < -0.992) dummy.quaternion.copy(DOWN);
        else dummy.quaternion.setFromUnitVectors(UP, direction);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function respawn(
  px: Float32Array,
  py: Float32Array,
  pz: Float32Array,
  speed: Float32Array,
  index: number,
  fromTop: boolean,
): void {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * 5.3;
  px[index] = Math.cos(angle) * radius - WIND_DIR_X * 1.3;
  pz[index] = Math.sin(angle) * radius - WIND_DIR_Z * 1.3;
  py[index] = fromTop ? 3.8 + Math.random() * 1.5 : 1.2 + Math.random() * 3.5;
  speed[index] = 0.72 + Math.random() * 0.55;
}
