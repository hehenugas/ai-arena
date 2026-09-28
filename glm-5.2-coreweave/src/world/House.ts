import * as THREE from 'three';
import { woodTexture } from '../textures';
import { damp, lerp } from '../utils';

/**
 * A small stylized cottage. The whole group is the click target.
 * `setLights(on)` smoothly drives window emissive + a warm interior light.
 */
export class House {
  readonly group = new THREE.Group();
  /** Child meshes used as raycast targets for the click interaction. */
  readonly pickMeshes: THREE.Object3D[] = [];

  private readonly windows: THREE.Mesh[] = [];
  private readonly winMats: THREE.MeshStandardMaterial[] = [];
  private readonly glow: THREE.PointLight;
  private curGlow = 0;     // smoothed 0..1

  constructor() {
    const woodTex = woodTexture();

    // Walls (cream) -----------------------------------------------------
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf2e4c4,
      roughness: 0.85,
      metalness: 0,
    });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.45), wallMat);
    walls.position.y = 0.575;
    walls.castShadow = true;
    walls.receiveShadow = true;
    this.group.add(walls);
    this.pickMeshes.push(walls);

    // Foundation strip (slightly darker stone)
    const foundMat = new THREE.MeshStandardMaterial({ color: 0x9c8c74, roughness: 1 });
    const found = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.16, 1.52), foundMat);
    found.position.y = 0.08;
    found.receiveShadow = true;
    this.group.add(found);

    // Roof (pyramid) ----------------------------------------------------
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xa8442f,
      roughness: 0.8,
      metalness: 0,
      flatShading: true,
    });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.95, 4), roofMat);
    roof.position.y = 1.62;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.group.add(roof);
    this.pickMeshes.push(roof);

    // Door --------------------------------------------------------------
    const doorMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x6e4a28,
      roughness: 0.8,
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.06), doorMat);
    door.position.set(0, 0.36, 0.73);
    door.castShadow = true;
    this.group.add(door);
    // small door knob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8b24a, metalness: 0.6, roughness: 0.3 }),
    );
    knob.position.set(0.11, 0.36, 0.77);
    this.group.add(knob);

    // Windows (emissive, toggleable) -----------------------------------
    const winGeo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.9 });
    const positions: Array<[number, number, number, number]> = [
      // x, y, z, rotY
      [-0.5, 0.7, 0.725, 0],   // front-left
      [0.5, 0.7, 0.725, 0],    // front-right
      [0, 0.78, 0.725, 0],     // front-center small (above door) — actually make a small one
      [-0.87, 0.7, 0, Math.PI / 2],  // left side
      [0.87, 0.7, 0, Math.PI / 2],   // right side
    ];
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z, ry] = positions[i];
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2a2620,
        emissive: new THREE.Color(0xffb347),
        emissiveIntensity: 0,
        roughness: 0.4,
        metalness: 0.1,
      });
      const win = new THREE.Mesh(winGeo, mat);
      win.position.set(x, y, z);
      win.rotation.y = ry;
      win.castShadow = false;
      this.group.add(win);
      this.windows.push(win);
      this.winMats.push(mat);

      // thin wood frame around each window
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.36, 0.04),
        winFrameMat,
      );
      frame.position.copy(win.position);
      frame.rotation.copy(win.rotation);
      frame.position.y -= 0.005;
      this.group.add(frame);
      // mullion cross
      const mull = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.32, 0.05),
        winFrameMat,
      );
      mull.position.copy(win.position);
      mull.rotation.copy(win.rotation);
      this.group.add(mull);
    }

    // Chimney -----------------------------------------------------------
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x8a6a52, roughness: 1, flatShading: true });
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), chimMat);
    chimney.position.set(0.45, 1.85, 0.1);
    chimney.castShadow = true;
    this.group.add(chimney);
    this.pickMeshes.push(chimney);
    // chimney cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.26), chimMat);
    cap.position.set(0.45, 2.12, 0.1);
    this.group.add(cap);

    // Warm interior glow light -----------------------------------------
    this.glow = new THREE.PointLight(0xffb347, 0, 6, 2);
    this.glow.position.set(0, 0.8, 0);
    this.glow.castShadow = false;
    this.group.add(this.glow);
  }

  /** Smoothly drive the lights state. */
  setLights(on: boolean, dt: number): void {
    const target = on ? 1 : 0;
    this.curGlow = damp(this.curGlow, target, 7.0, dt);
    const e = lerp(0.04, 1.6, this.curGlow);
    for (const m of this.winMats) {
      m.emissiveIntensity = e;
      // windows also brighten in base color when lit
      m.color.setRGB(lerp(0.16, 0.55, this.curGlow), lerp(0.14, 0.40, this.curGlow), lerp(0.12, 0.18, this.curGlow));
    }
    this.glow.intensity = lerp(0, 1.4, this.curGlow);
  }

  get lightsOn(): boolean {
    return this.curGlow > 0.5;
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material).dispose();
      }
    });
  }
}
