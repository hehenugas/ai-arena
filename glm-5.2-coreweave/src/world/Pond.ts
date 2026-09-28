import * as THREE from 'three';
import { waterTexture } from '../textures';
import { clamp01 } from '../utils';

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  active: boolean;
}

/**
 * A small pond inset into a carved basin in the island. Flat water disc +
 * a sandy shoreline ring. A pool of reusable ripple rings appears in the rain.
 * Wind tilts the surface's texture motion slightly.
 *
 * The group's origin is placed at the waterline by the World, so water sits
 * at local y=0 and the shore ring just above it.
 */
export class Pond {
  readonly group = new THREE.Group();
  /** Water disc radius (must match the basin waterline radius). */
  readonly waterRadius: number;
  private readonly water: THREE.Mesh;
  private readonly waterMat: THREE.MeshStandardMaterial;
  private readonly ripples: Ripple[] = [];
  private readonly rippleMat: THREE.MeshBasicMaterial;
  private spawnAcc = 0;

  constructor(waterRadius = 1.3, shoreOuter = 1.52) {
    this.waterRadius = waterRadius;

    // Sandy shoreline ring at the waterline
    const shoreMat = new THREE.MeshStandardMaterial({
      color: 0xd9c79a,
      roughness: 1,
      metalness: 0,
    });
    const shore = new THREE.Mesh(
      new THREE.RingGeometry(waterRadius - 0.02, shoreOuter, 44),
      shoreMat,
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.y = 0.012;
    shore.receiveShadow = true;
    this.group.add(shore);

    // Water surface
    const wTex = waterTexture();
    this.waterMat = new THREE.MeshStandardMaterial({
      map: wTex,
      color: 0x3d78a6,
      roughness: 0.22,
      metalness: 0.05,
      transparent: true,
      opacity: 0.86,
    });
    this.water = new THREE.Mesh(
      new THREE.CircleGeometry(waterRadius, 44),
      this.waterMat,
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    this.water.receiveShadow = true;
    this.group.add(this.water);

    // Ripple pool (reused rings)
    this.rippleMat = new THREE.MeshBasicMaterial({
      color: 0xcfe6f5,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const poolSize = 10;
    for (let i = 0; i < poolSize; i++) {
      const rg = new THREE.RingGeometry(0.05, 0.07, 18);
      const m = new THREE.Mesh(rg, this.rippleMat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.005;
      m.visible = false;
      this.group.add(m);
      this.ripples.push({ mesh: m, life: 0, active: false });
    }
  }

  /** Spawn a ripple at a random point on the water surface. */
  spawnRipple(): void {
    const r = this.ripples.find((x) => !x.active);
    if (!r) return;
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * (this.waterRadius - 0.15);
    r.mesh.position.set(Math.cos(ang) * rad, 0.005, Math.sin(ang) * rad);
    r.mesh.scale.setScalar(1);
    (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
    r.mesh.visible = true;
    r.life = 0;
    r.active = true;
  }

  update(dt: number, wind: number, time: number): void {
    const w = clamp01(wind);
    const tex = this.waterMat.map;
    if (tex) {
      tex.offset.x = time * 0.02 * (1 + w);
      tex.offset.y = time * 0.015 * (1 + w * 0.5);
    }
    for (const r of this.ripples) {
      if (!r.active) continue;
      r.life += dt * 1.4;
      r.mesh.scale.setScalar(1 + r.life * 6);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - r.life));
      if (r.life >= 1) {
        r.active = false;
        r.mesh.visible = false;
      }
    }
  }

  /** Throttled ripple spawning driven by the smoothed rain intensity. */
  consumeRain(dt: number, rainIntensity: number): void {
    if (rainIntensity <= 0) {
      this.spawnAcc = 0;
      return;
    }
    this.spawnAcc += dt * rainIntensity * 16;
    while (this.spawnAcc >= 1) {
      this.spawnRipple();
      this.spawnAcc -= 1;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.waterMat.dispose();
    this.rippleMat.dispose();
  }
}
