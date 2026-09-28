import * as THREE from 'three';
import { grassTexture, rockTexture } from '../textures';
import { mulberry32 } from '../utils';

/**
 * The floating island: a rocky body (LatheGeometry with angular noise) topped
 * by a gently domed grass disc. All geometry is generated in code.
 */
export class Island {
  readonly group = new THREE.Group();
  readonly bodyMesh: THREE.Mesh;
  readonly grassMesh: THREE.Mesh;

  /** Grass surface radius (rim). */
  readonly topRadius = 6.4;
  /** Y of the grass rim — objects placed on the grass sit around this height. */
  readonly topY = 0.4;

  constructor() {
    const grassTex = grassTexture();
    const rockTex = rockTexture();

    // ---- Rocky body via lathe profile + angular noise -------------------
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(6.40, 0.40),
      new THREE.Vector2(6.30, 0.30),
      new THREE.Vector2(6.05, 0.05),
      new THREE.Vector2(5.75, -0.55),
      new THREE.Vector2(5.20, -1.20),
      new THREE.Vector2(4.40, -1.95),
      new THREE.Vector2(3.40, -2.65),
      new THREE.Vector2(2.35, -3.25),
      new THREE.Vector2(1.40, -3.75),
      new THREE.Vector2(0.65, -4.05),
      new THREE.Vector2(0.20, -4.18),
      new THREE.Vector2(0.02, -4.22),
    ];
    const bodyGeo = new THREE.LatheGeometry(profile, 48);
    bodyGeo.computeVertexNormals();

    // Displace for irregular silhouette + rocky surface
    const rnd = mulberry32(99);
    const pos = bodyGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const angNoise = (a: number) =>
      0.07 * Math.sin(a * 3.0 + 1.2) +
      0.045 * Math.sin(a * 5.0 + 2.3) +
      0.03 * Math.sin(a * 7.0 + 0.5);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ang = Math.atan2(v.z, v.x);
      const r = Math.sqrt(v.x * v.x + v.z * v.z);
      // silhouette wobble (stronger lower down)
      const lower = THREE.MathUtils.clamp((-v.y + 0.4) / 4.6, 0, 1);
      const wob = 1 + angNoise(ang) * (0.5 + lower * 0.9);
      const nr = Math.max(0.001, r * wob);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      v.x = ca * nr;
      v.z = sa * nr;
      // rocky bumpiness on the cliff
      if (v.y < 0.2) {
        const bump = (rnd() - 0.5) * 0.18 * lower;
        v.y += bump;
        const rb = (rnd() - 0.5) * 0.12 * lower;
        v.x += ca * rb;
        v.z += sa * rb;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    bodyGeo.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({
      map: rockTex,
      color: 0xddc9a8,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // ---- Grass top: flat disc with gentle dome -------------------------
    const grassGeo = new THREE.CircleGeometry(this.topRadius, 56);
    grassGeo.rotateX(-Math.PI / 2);
    const gp = grassGeo.attributes.position as THREE.BufferAttribute;
    const gv = new THREE.Vector3();
    const domeH = 0.28;
    for (let i = 0; i < gp.count; i++) {
      gv.fromBufferAttribute(gp, i);
      const r = Math.sqrt(gv.x * gv.x + gv.z * gv.z);
      const t = r / this.topRadius;
      // gentle dome, slightly squashed near rim
      gv.y = this.topY + domeH * (1 - t * t) * 0.6 + (mulberry32(i + 3)() - 0.5) * 0.05;
      gp.setXYZ(i, gv.x, gv.y, gv.z);
    }
    grassGeo.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xb8df7c,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.grassMesh = new THREE.Mesh(grassGeo, grassMat);
    this.grassMesh.receiveShadow = true;
    this.grassMesh.castShadow = false;
    this.group.add(this.grassMesh);

    // ---- A few small floating rocks below for whimsy -------------------
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a64,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const rockRnd = mulberry32(7);
    for (let i = 0; i < 4; i++) {
      const s = 0.25 + rockRnd() * 0.35;
      const rg = new THREE.DodecahedronGeometry(s, 0);
      rg.scale(1, 0.7, 1);
      const rm = new THREE.Mesh(rg, rockMat);
      const a = rockRnd() * Math.PI * 2;
      const rad = 2.5 + rockRnd() * 2.5;
      rm.position.set(Math.cos(a) * rad, -4.6 - rockRnd() * 1.8, Math.sin(a) * rad);
      rm.rotation.set(rockRnd() * 2, rockRnd() * 2, rockRnd() * 2);
      rm.castShadow = true;
      this.group.add(rm);
    }
  }

  /**
   * Carve a shallow bowl into the grass top so a pond can sit inset into the
   * island rather than floating on the dome. Call after construction.
   */
  carvePond(cx: number, cz: number, R: number, depth: number): void {
    const gp = this.grassMesh.geometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < gp.count; i++) {
      v.fromBufferAttribute(gp, i);
      const d = Math.sqrt((v.x - cx) ** 2 + (v.z - cz) ** 2);
      if (d < R) {
        const t = d / R;                 // 0 center .. 1 rim
        const carve = (1 - t * t) * depth; // smooth, full depth at center
        v.y -= carve;
        gp.setXYZ(i, v.x, v.y, v.z);
      }
    }
    gp.needsUpdate = true;
    this.grassMesh.geometry.computeVertexNormals();
  }

  /**
   * Approximate grass surface height at a given horizontal position.
   * Used to seat trees, the house, etc. on the dome.
   */
  surfaceY(x: number, z: number): number {
    const r = Math.sqrt(x * x + z * z);
    const t = Math.min(r / this.topRadius, 1);
    const domeH = 0.28;
    return this.topY + domeH * (1 - t * t) * 0.6;
  }

  dispose(): void {
    this.bodyMesh.geometry.dispose();
    (this.bodyMesh.material as THREE.MeshStandardMaterial).dispose();
    this.grassMesh.geometry.dispose();
    (this.grassMesh.material as THREE.MeshStandardMaterial).dispose();
  }
}
