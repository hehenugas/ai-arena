import * as THREE from 'three';
import { clamp01, damp } from '../utils';

interface Cloud {
  group: THREE.Group;
  speed: number;
  phase: number;
}

/**
 * A handful of stylized puffy clouds. They drift horizontally with the
 * shared wind (wrapping around) and darken as rain approaches.
 */
export class Clouds {
  readonly group = new THREE.Group();
  private readonly clouds: Cloud[] = [];
  private readonly mats: THREE.MeshStandardMaterial[] = [];
  private curRain = 0;

  constructor() {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const c = this.build();
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const rad = 18 + Math.random() * 12;
      c.group.position.set(
        Math.cos(a) * rad,
        16 + Math.random() * 7,
        Math.sin(a) * rad * 0.5,
      );
      c.group.scale.setScalar(0.8 + Math.random() * 0.6);
      this.group.add(c.group);
      this.clouds.push(c);
    }
  }

  private build(): Cloud {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
    });
    this.mats.push(mat);
    const lumps = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < lumps; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(1.1 + Math.random() * 0.6, 12, 10),
        mat,
      );
      s.position.set(
        (Math.random() - 0.5) * 3.4,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 1.6,
      );
      s.scale.y = 0.7;
      g.add(s);
    }
    return { group: g, speed: 0.7 + Math.random() * 0.6, phase: Math.random() * 10 };
  }

  /**
   * @param wind     0..1
   * @param rainMix  0 clear .. 1 rain (smoothed), used to darken clouds
   * @param time     elapsed seconds
   * @param dt       seconds
   */
  update(wind: number, rainMix: number, time: number, dt: number): void {
    const w = clamp01(wind);
    this.curRain = damp(this.curRain, rainMix, 3.0, dt);

    // cloud color: white -> stormy grey
    const clear = new THREE.Color(0xffffff);
    const storm = new THREE.Color(0x5b6470);
    for (const m of this.mats) {
      m.color.copy(clear).lerp(storm, this.curRain);
      m.opacity = 0.92 - this.curRain * 0.08;
    }

    for (const c of this.clouds) {
      // drift with wind (negligible idle at w=0)
      const drift = (w * 3.2 + 0.05) * c.speed * dt;
      c.group.position.x += drift;
      // gentle bob
      c.group.position.y += Math.sin(time * 0.5 + c.phase) * 0.002;
      // wrap around the island band
      if (c.group.position.x > 34) c.group.position.x = -34;
      if (c.group.position.x < -34) c.group.position.x = 34;
    }
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
