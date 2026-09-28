import * as THREE from 'three';
import type { Frame } from '../frame';
import { LAYOUT } from '../world/layout';
import { pondDistance, WATER_LEVEL } from '../world/terrain';

interface Ripple {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  size: number;
}

/** Fixed pool of expanding rings on the pond surface; the oldest is recycled when full. */
export class Ripples {
  readonly group = new THREE.Group();
  private readonly pool: Ripple[] = [];
  private next = 0;
  private idleTimer = 2;

  constructor(size: number) {
    this.group.name = 'ripples';
    const geo = new THREE.RingGeometry(0.82, 1, 28);
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe4eef4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 1;
      mesh.position.y = WATER_LEVEL + 0.004;
      this.group.add(mesh);
      this.pool.push({ mesh, mat, age: 0, life: 1, size: 0.3 });
    }
  }

  spawn(x: number, z: number, size = 0.26 + Math.random() * 0.12): void {
    const r = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    r.age = 0;
    r.life = 0.8 + Math.random() * 0.4;
    r.size = size;
    r.mesh.position.x = x;
    r.mesh.position.z = z;
    r.mesh.visible = true;
  }

  update(frame: Frame): void {
    // The occasional lazy ring in calm weather, as if a fish surfaced.
    this.idleTimer -= frame.dt * frame.motion * (1 - frame.rain);
    if (this.idleTimer <= 0) {
      this.idleTimer = 2.5 + Math.random() * 4;
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 0.6;
      const x = LAYOUT.pond.x + Math.cos(a) * d;
      const z = LAYOUT.pond.z + Math.sin(a) * d;
      if (pondDistance(x, z) < 0.7) this.spawn(x, z, 0.45);
    }

    for (const r of this.pool) {
      if (!r.mesh.visible) continue;
      r.age += frame.dt;
      const t = r.age / r.life;
      if (t >= 1) {
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(0.03 + r.size * Math.sqrt(t));
      r.mat.opacity = Math.pow(1 - t, 1.6) * 0.7;
    }
  }
}
