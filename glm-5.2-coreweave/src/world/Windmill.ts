import * as THREE from 'three';
import { clamp01 } from '../utils';
import { woodTexture as woodTexFn } from '../textures';

/**
 * A small windmill with a tapered wooden tower and four clearly visible
 * blades. Blade rotation speed scales with the shared wind state.
 */
export class Windmill {
  readonly group = new THREE.Group();
  private readonly blades: THREE.Group;
  private angle = 0;

  constructor() {
    const woodTex = woodTexFn();
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0xa9743f,
      roughness: 0.85,
    });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.85 });

    // Tower -------------------------------------------------------------
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.42, 1.7, 10),
      woodMat,
    );
    tower.position.y = 0.85;
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.group.add(tower);

    // Cap (cone roof)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 10), darkWood);
    cap.position.y = 1.94;
    cap.castShadow = true;
    this.group.add(cap);

    // Axle housing sticking out toward +Z (blade side)
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10),
      darkWood,
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, 1.55, 0.18);
    this.group.add(hub);

    // Blades -----------------------------------------------------------
    this.blades = new THREE.Group();
    this.blades.position.set(0, 1.55, 0.28);
    const bladeLen = 1.05;
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf0e6cf,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Group();
      // sail cloth
      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(bladeLen, 0.42, 0.02),
        bladeMat,
      );
      sail.position.x = bladeLen / 2;
      sail.castShadow = true;
      blade.add(sail);
      // thin frame along the leading edge
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(bladeLen, 0.03, 0.05),
        frameMat,
      );
      frame.position.set(bladeLen / 2, 0.24, 0);
      blade.add(frame);
      // cross-spar near hub
      const spar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.5, 0.05),
        frameMat,
      );
      spar.position.set(0.05, 0, 0);
      blade.add(spar);

      blade.rotation.z = (i / 4) * Math.PI * 2;
      this.blades.add(blade);
    }
    // central hub disc
    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10),
      frameMat,
    );
    center.rotation.x = Math.PI / 2;
    this.blades.add(center);

    this.group.add(this.blades);

    // small tail fin behind the tower for detail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.02), bladeMat);
    tail.position.set(0, 1.55, -0.35);
    tail.castShadow = true;
    this.group.add(tail);
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), frameMat);
    tailBar.position.set(0, 1.55, -0.18);
    this.group.add(tailBar);
  }

  /**
   * @param wind 0..1
   * @param dt   seconds
   */
  update(wind: number, dt: number): void {
    const w = clamp01(wind);
    // negligible idle creep so it never looks frozen; wind dominates
    const speed = w * 1.8 + 0.03;
    this.angle += speed * dt;
    this.blades.rotation.z = this.angle;
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
