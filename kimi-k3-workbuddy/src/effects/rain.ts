import * as THREE from 'three';

export interface RainSystem {
  points: THREE.Points;
  update(dt: number, wind: number, intensity: number): void;
}

const COUNT = 900;
const AREA = 9;      // horizontal half-extent
const TOP = 10;      // spawn height
const FLOOR = -6.5;  // recycle below the island

export function buildRain(): RainSystem {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * AREA;
    positions[i * 3 + 1] = Math.random() * (TOP - FLOOR) + FLOOR;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * AREA;
    speeds[i] = 7 + Math.random() * 4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xaFC8dc,
    size: 0.09,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.visible = false;

  return {
    points,
    update(dt, wind, intensity) {
      material.opacity = 0.55 * intensity;
      points.visible = intensity > 0.02;
      if (!points.visible) return;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const drift = wind * 4.5;
      for (let i = 0; i < COUNT; i++) {
        let y = arr[i * 3 + 1] - speeds[i] * dt;
        let x = arr[i * 3] + drift * dt;
        if (y < FLOOR) {
          y = TOP;
          x = (Math.random() * 2 - 1) * AREA;
          arr[i * 3 + 2] = (Math.random() * 2 - 1) * AREA;
        }
        if (x > AREA) x -= AREA * 2;
        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
      }
      pos.needsUpdate = true;
    }
  };
}
