import * as THREE from 'three';
import type { AppState } from './state';
import { damp } from './state';
import type { WorldRefs } from './world';

const RAIN_COUNT = 650;
const SMOKE_COUNT = 12;

export class Effects {
  private rainGeo = new THREE.BufferGeometry();
  private rainPos = new Float32Array(RAIN_COUNT * 2 * 3);
  private drops: Array<{ x: number; y: number; z: number; speed: number }> = [];
  private rainLines: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private ripples: Array<{ mesh: THREE.Mesh; t: number; speed: number }> = [];
  private smokes: Array<{ mesh: THREE.Mesh; life: number }> = [];
  private smokeMat: THREE.MeshBasicMaterial;
  private tmp = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private world: WorldRefs) {
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.drops.push({
        x: (Math.random() * 2 - 1) * 15,
        y: Math.random() * 16,
        z: (Math.random() * 2 - 1) * 15,
        speed: 11 + Math.random() * 5,
      });
    }
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rainGeo.setDrawRange(0, 0);
    this.rainMat = new THREE.LineBasicMaterial({ color: 0xa9cdea, transparent: true, opacity: 0 });
    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    scene.add(this.rainLines);

    // ripple state
    world.rippleRings.forEach((mesh, i) => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (world.lakeRadius - 0.35);
      mesh.position.set(world.lakeCenter.x + Math.cos(a) * r, 0.06, world.lakeCenter.z + Math.sin(a) * r);
      this.ripples.push({ mesh, t: (i / world.rippleRings.length), speed: 0.55 + Math.random() * 0.5 });
    });

    // chimney smoke
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0xd8d4cc, transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.smokeMat.clone());
      m.visible = false;
      scene.add(m);
      this.smokes.push({ mesh: m, life: i / SMOKE_COUNT });
    }
  }

  private resetDrop(d: { x: number; y: number; z: number; speed: number }) {
    d.x = (Math.random() * 2 - 1) * 15;
    d.z = (Math.random() * 2 - 1) * 15;
    d.y = 13 + Math.random() * 4;
    d.speed = 11 + Math.random() * 5;
  }

  update(dt: number, s: AppState, elapsed: number) {
    const blend = s.weatherBlend;
    const windDrift = s.wind * 7;

    // ---- rain ----
    const visCount = Math.floor(RAIN_COUNT * Math.min(1, blend * 1.15));
    this.rainLines.visible = visCount > 4;
    this.rainMat.opacity = damp(this.rainMat.opacity, blend * 0.65, 5, dt);
    this.rainGeo.setDrawRange(0, visCount * 2);
    if (this.rainLines.visible) {
      const slant = windDrift * 0.055;
      for (let i = 0; i < visCount; i++) {
        const d = this.drops[i];
        d.y -= d.speed * dt;
        d.x += windDrift * dt;
        // wrap sideways so wind doesn't empty the volume
        if (d.x > 16) d.x = -16;
        if (d.x < -16) d.x = 16;
        const r = Math.hypot(d.x, d.z);
        const floor = r < 10.2 ? 0.05 : -9;
        if (d.y < floor) this.resetDrop(d);
        const o = i * 6;
        this.rainPos[o] = d.x;
        this.rainPos[o + 1] = d.y;
        this.rainPos[o + 2] = d.z;
        this.rainPos[o + 3] = d.x - slant;
        this.rainPos[o + 4] = d.y + 0.55;
        this.rainPos[o + 5] = d.z;
      }
      (this.rainGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // ---- ripples ----
    for (const rp of this.ripples) {
      const mat = rp.mesh.material as THREE.MeshBasicMaterial;
      if (blend < 0.03) {
        rp.mesh.visible = false;
        continue;
      }
      rp.mesh.visible = true;
      rp.t += dt * rp.speed * (0.6 + blend * 0.7);
      if (rp.t > 1) {
        rp.t = 0;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (this.world.lakeRadius - 0.35);
        rp.mesh.position.set(this.world.lakeCenter.x + Math.cos(a) * r, 0.06, this.world.lakeCenter.z + Math.sin(a) * r);
      }
      const sc = 0.15 + rp.t * 0.75;
      rp.mesh.scale.setScalar(sc);
      mat.opacity = (1 - rp.t) * 0.55 * blend;
    }

    // ---- chimney smoke (gentle, reduced when user prefers less motion) ----
    this.world.chimneyTip.getWorldPosition(this.tmp);
    const smokeRate = s.reducedMotion ? 0.12 : 0.35;
    for (const sm of this.smokes) {
      sm.life += dt * smokeRate;
      if (sm.life > 1) sm.life = 0;
      const t = sm.life;
      const m = sm.mesh;
      m.visible = true;
      const sway = Math.sin((elapsed + t * 5) * 1.5) * 0.2 * (0.3 + s.wind);
      m.position.set(
        this.tmp.x + sway * t + s.wind * t * 1.4,
        this.tmp.y + t * 2.2,
        this.tmp.z + Math.cos(elapsed + t * 4) * 0.15 * t,
      );
      m.scale.setScalar(0.5 + t * 1.6);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - t) * (s.reducedMotion ? 0.5 : 1);
    }
  }
}
