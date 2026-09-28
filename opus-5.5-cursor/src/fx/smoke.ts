import * as THREE from 'three';
import type { Frame } from '../frame';

interface Puff {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  age: number;
  seed: number;
}

const LIFE = 4.2;

/** A small, recycled pool of chimney puffs that rise and drift with the shared wind. */
export class Smoke {
  readonly group = new THREE.Group();
  private readonly puffs: Puff[] = [];
  private timer = 0;
  private next = 0;

  constructor(private readonly origin: THREE.Vector3, size: number) {
    this.group.name = 'smoke';
    const geo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe9e6e1,
        roughness: 1,
        flatShading: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.puffs.push({ mesh, mat, age: LIFE, seed: Math.random() * 10 });
    }
  }

  update(frame: Frame): void {
    this.timer -= frame.dt;
    const interval = 0.55 / (0.35 + 0.65 * frame.motion);
    if (this.timer <= 0) {
      this.timer = interval;
      const p = this.puffs[this.next];
      this.next = (this.next + 1) % this.puffs.length;
      p.age = 0;
      p.mesh.position.copy(this.origin);
      p.mesh.visible = true;
    }
    const drift = frame.wind * 1.1;
    for (const p of this.puffs) {
      if (!p.mesh.visible) continue;
      p.age += frame.dt;
      const t = p.age / LIFE;
      if (t >= 1) {
        p.mesh.visible = false;
        continue;
      }
      const rise = 0.32 * (1 - frame.rain * 0.4) * (1 - frame.wind * 0.5);
      p.mesh.position.y += rise * frame.dt;
      p.mesh.position.x += (frame.windDir.x * drift + Math.sin(p.age * 1.3 + p.seed) * 0.03) * frame.dt;
      p.mesh.position.z += (frame.windDir.z * drift + Math.cos(p.age * 1.1 + p.seed) * 0.03) * frame.dt;
      p.mesh.scale.setScalar(0.06 + t * 0.22);
      p.mesh.rotation.y = p.seed + t;
      p.mat.opacity = Math.sin(Math.min(t * 4, 1) * Math.PI * 0.5) * (1 - t) * 0.5;
    }
  }
}
