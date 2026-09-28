// Rain particle system — 3D particles pooled and recycled
import * as THREE from 'three';

const PARTICLE_COUNT = 600;
const DROP_HEIGHT = 22;
const ISLAND_RADIUS = 8;

export interface RainSystem {
  points: THREE.Points;
  update: (dt: number, windStrength: number, isActive: boolean) => void;
  setActive: (active: boolean) => void;
}

export function createRainSystem(): RainSystem {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);

  function resetParticle(i: number): void {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * ISLAND_RADIUS * 1.4;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.random() * DROP_HEIGHT - 2;
    positions[i * 3 + 2] = Math.sin(angle) * r;
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = -(8 + Math.random() * 4);
    velocities[i * 3 + 2] = 0;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    resetParticle(i);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xaaccee,
    size: 0.07,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  let targetOpacity = 0;
  let currentOpacity = 0;

  function setActive(active: boolean): void {
    targetOpacity = active ? 0.65 : 0;
  }

  function update(dt: number, windStrength: number, isActive: boolean): void {
    targetOpacity = isActive ? 0.65 : 0;
    currentOpacity += (targetOpacity - currentOpacity) * Math.min(1, dt * 2);
    mat.opacity = currentOpacity;

    if (currentOpacity < 0.01 && !isActive) return;

    const windX = windStrength * 3.5;
    const windZ = windStrength * 1.2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] += (velocities[i * 3] + windX) * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += (velocities[i * 3 + 2] + windZ) * dt;

      // Reset if below island or too far
      if (positions[i * 3 + 1] < -5) {
        resetParticle(i);
      }
    }

    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  return { points, update, setActive };
}
