import * as THREE from 'three';
import { MAT } from './materials';

export interface PondRefs {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  center: THREE.Vector3;
  radius: number;
}

export const POND_CENTER = new THREE.Vector3(1.9, 0, 1.4);
export const POND_RADIUS = 1.15;

export function buildPond(): PondRefs {
  const geo = new THREE.CircleGeometry(POND_RADIUS, 36);
  geo.rotateX(-Math.PI / 2);
  // slightly irregular shoreline
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    if (r > 0.01) {
      const a = Math.atan2(z, x);
      const w = 1 + 0.09 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 5);
      pos.setX(i, x * w);
      pos.setZ(i, z * w);
    }
  }
  const mesh = new THREE.Mesh(geo, MAT.water);
  mesh.position.set(POND_CENTER.x, 0.18, POND_CENTER.z);
  mesh.receiveShadow = true;
  return { mesh, material: MAT.water, center: POND_CENTER.clone(), radius: POND_RADIUS };
}

/** Sandy shoreline ring under the water edge. */
export function buildShore(): THREE.Mesh {
  const geo = new THREE.RingGeometry(POND_RADIUS * 0.9, POND_RADIUS * 1.32, 36);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8c89a, roughness: 1, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(POND_CENTER.x, 0.17, POND_CENTER.z);
  mesh.receiveShadow = true;
  return mesh;
}

export interface RippleSystem {
  group: THREE.Group;
  /** spawn a ripple; used by rain */
  spawn(x: number, z: number): void;
  update(dt: number): void;
  setActive(on: boolean): void;
}

const RIPPLE_COUNT = 24;

export function buildRipples(pond: PondRefs): RippleSystem {
  const group = new THREE.Group();
  const geo = new THREE.RingGeometry(0.06, 0.085, 20);
  geo.rotateX(-Math.PI / 2);
  const pool: { mesh: THREE.Mesh; age: number; life: number; active: boolean }[] = [];
  for (let i = 0; i < RIPPLE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xdff0f5,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    group.add(m);
    pool.push({ mesh: m, age: 0, life: 1.1, active: false });
  }
  let cursor = 0;
  let enabled = false;

  return {
    group,
    spawn(x, z) {
      if (!enabled) return;
      const r = pool[cursor];
      cursor = (cursor + 1) % pool.length;
      r.active = true;
      r.age = 0;
      r.mesh.position.set(x, 0.075, z);
      r.mesh.visible = true;
    },
    setActive(on) {
      enabled = on;
      if (!on) pool.forEach((r) => { r.active = false; r.mesh.visible = false; });
    },
    update(dt) {
      pool.forEach((r) => {
        if (!r.active) return;
        r.age += dt;
        const t = r.age / r.life;
        if (t >= 1) {
          r.active = false;
          r.mesh.visible = false;
          return;
        }
        const s = 1 + t * 3.2;
        r.mesh.scale.setScalar(s);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
      });
    }
  };
}
