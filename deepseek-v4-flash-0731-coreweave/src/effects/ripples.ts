import * as THREE from 'three';
import { mulberry32 } from '../utils/noise';
import { POND_POS, POND_RADIUS } from '../world/island';

const RINGS = 14;

interface Ring {
  mesh: THREE.Mesh;
  active: boolean;
  progress: number;
  duration: number;
  endScale: number;
}

export interface Ripples {
  object: THREE.Object3D;
  update: (dt: number, wind: number, weather: number) => void;
  /** Called by rain when a drop lands; only reacts if it hit the pond. */
  onRainHit: (x: number, z: number) => void;
}

/**
 * Pooled expanding rings on the pond surface. Rain drives frequent ripples;
 * between showers a slow one appears now and then, faster in a breeze.
 */
export function createRipples(surfaceY: number): Ripples {
  const group = new THREE.Group();
  const rng = mulberry32(999);

  const rings: Ring[] = [];
  const geo = new THREE.RingGeometry(0.82, 1.0, 26);
  const mat = new THREE.MeshBasicMaterial({
    color: '#e4f2ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < RINGS; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    group.add(mesh);
    rings.push({
      mesh,
      active: false,
      progress: 0,
      duration: 1.6,
      endScale: 1,
    });
  }

  function spawn(x: number, z: number, duration: number, endScale: number): void {
    const ring =
      rings.find((r) => !r.active) ??
      rings.reduce((a, b) => (a.progress > b.progress ? a : b));
    ring.active = true;
    ring.progress = 0;
    ring.duration = duration;
    ring.endScale = endScale;
    ring.mesh.visible = true;
    ring.mesh.position.set(x, surfaceY + 0.02, z);
    ring.mesh.scale.setScalar(0.35);
  }

  let ambientTimer = 1;

  const update = (dt: number, wind: number, weather: number): void => {
    if (weather > 0.5) {
      ambientTimer -= dt;
      if (ambientTimer <= 0) {
        const a = rng() * Math.PI * 2;
        const r = rng() * POND_RADIUS * 0.85;
        spawn(POND_POS.x + Math.cos(a) * r, POND_POS.y + Math.sin(a) * r, 1.4, 3.1);
        ambientTimer = 0.32 + rng() * 0.2;
      }
    } else {
      ambientTimer -= dt;
      const interval = Math.max(1.4, 3.6 - wind * 2.2);
      if (ambientTimer <= 0) {
        const a = rng() * Math.PI * 2;
        const r = rng() * POND_RADIUS * 0.7;
        spawn(POND_POS.x + Math.cos(a) * r, POND_POS.y + Math.sin(a) * r, 2.8, 2.0);
        ambientTimer = interval;
      }
    }

    for (const ring of rings) {
      if (!ring.active) continue;
      ring.progress += dt / ring.duration;
      if (ring.progress >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        continue;
      }
      const t = ring.progress;
      const ease = 1 - Math.pow(1 - t, 3);
      const scale = 0.35 + ease * (ring.endScale - 0.35);
      ring.mesh.scale.setScalar(scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.42;
    }
  };

  const onRainHit = (x: number, z: number): void => {
    const dx = x - POND_POS.x;
    const dz = z - POND_POS.y;
    if (dx * dx + dz * dz < POND_RADIUS * POND_RADIUS) {
      spawn(x, z, 1.25, 2.9);
    }
  };

  return { object: group, update, onRainHit };
}