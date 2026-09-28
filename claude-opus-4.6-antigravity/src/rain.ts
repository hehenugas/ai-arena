import * as THREE from 'three';

const DROP_COUNT = 400;
const DROP_TOP = 10;
const DROP_BOTTOM = -2;
const DROP_RADIUS = 10;
const DROP_LENGTH = 0.3;
const DROP_SPEED = 8;

export class RainSystem {
  private lineSegments: THREE.LineSegments;
  private positions: Float32Array;
  // Per-drop state: x, y, z, vx, vy, active (1/0)
  private dropState: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene, count: number = DROP_COUNT) {
    this.positions = new Float32Array(count * 2 * 3); // 2 vertices * 3 components per drop
    this.dropState = new Float32Array(count * 6); // x, y, z, vx, vy, active

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.LineBasicMaterial({
      color: '#aabbcc',
      transparent: true,
      opacity: 0,
    });

    this.lineSegments = new THREE.LineSegments(this.geometry, this.material);
    this.lineSegments.frustumCulled = false;
    scene.add(this.lineSegments);

    // Initialize all drops as inactive, positioned off-screen
    for (let i = 0; i < count; i++) {
      this.resetDrop(i, false);
    }
    this.flushPositions();
  }

  private get count(): number {
    return this.dropState.length / 6;
  }

  private resetDrop(i: number, randomizeY: boolean): void {
    const base = i * 6;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * DROP_RADIUS;
    this.dropState[base] = Math.cos(angle) * r;
    this.dropState[base + 1] = randomizeY
      ? DROP_BOTTOM + Math.random() * (DROP_TOP - DROP_BOTTOM)
      : DROP_TOP + Math.random() * 2;
    this.dropState[base + 2] = Math.sin(angle) * r;
    this.dropState[base + 3] = 0; // vx, set during update from wind
    this.dropState[base + 4] = -DROP_SPEED;
    this.dropState[base + 5] = 0; // inactive by default
  }

  private flushPositions(): void {
    const attr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  update(dt: number, wind: number, active: boolean, transition: number): void {
    const clampedDt = Math.min(dt, 0.1);
    const n = this.count;
    const windOffset = wind * 0.5;

    this.material.opacity = transition * 0.6;

    // Spawn rate: activate some inactive drops each frame
    if (active && transition > 0.01) {
      const spawnPerSec = n * 2; // fill pool quickly
      let toSpawn = Math.ceil(spawnPerSec * clampedDt);
      for (let i = 0; i < n && toSpawn > 0; i++) {
        if (this.dropState[i * 6 + 5] === 0) {
          this.resetDrop(i, false);
          this.dropState[i * 6 + 5] = 1;
          toSpawn--;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const base = i * 6;
      const isActive = this.dropState[base + 5];

      if (isActive === 0) {
        // Park both vertices at origin so they're invisible
        const pi = i * 6; // position index: 2 verts * 3 comps
        this.positions[pi] = 0;
        this.positions[pi + 1] = -100;
        this.positions[pi + 2] = 0;
        this.positions[pi + 3] = 0;
        this.positions[pi + 4] = -100;
        this.positions[pi + 5] = 0;
        continue;
      }

      // Integrate position
      this.dropState[base + 3] = windOffset;
      this.dropState[base] += this.dropState[base + 3] * clampedDt;
      this.dropState[base + 1] += this.dropState[base + 4] * clampedDt;
      this.dropState[base + 2] += windOffset * 0.2 * clampedDt;

      const x = this.dropState[base];
      const y = this.dropState[base + 1];
      const z = this.dropState[base + 2];

      if (y < DROP_BOTTOM) {
        if (active && transition > 0.01) {
          this.resetDrop(i, false);
          this.dropState[base + 5] = 1;
        } else {
          this.dropState[base + 5] = 0;
        }
        continue;
      }

      // Write the two endpoints of the line segment
      const pi = i * 6;
      this.positions[pi] = x;
      this.positions[pi + 1] = y;
      this.positions[pi + 2] = z;
      // Bottom vertex offset by drop length, angled with wind
      this.positions[pi + 3] = x - windOffset * 0.03;
      this.positions[pi + 4] = y - DROP_LENGTH;
      this.positions[pi + 5] = z;
    }

    this.flushPositions();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.lineSegments.parent?.remove(this.lineSegments);
  }
}

const RIPPLE_COUNT = 15;
const RIPPLE_MAX_RADIUS = 0.3;
const RIPPLE_START_RADIUS = 0.05;
const RIPPLE_LIFETIME = 1.2;
const RIPPLE_SPAWN_RATE = 2; // per second at full transition

export class RippleSystem {
  private rings: THREE.Mesh[] = [];
  // Per ripple: age, lifetime, active, spawnX, spawnZ
  private state: Float32Array;
  private parent: THREE.Object3D;
  private pondCenter: THREE.Vector3;
  private pondRadius: number;
  private spawnAccum = 0;

  constructor(parent: THREE.Object3D, pondCenter: THREE.Vector3, pondRadius: number) {
    this.parent = parent;
    this.pondCenter = pondCenter.clone();
    this.pondRadius = pondRadius;
    this.state = new Float32Array(RIPPLE_COUNT * 3); // age, lifetime, active

    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const geo = new THREE.RingGeometry(RIPPLE_START_RADIUS, RIPPLE_START_RADIUS + 0.02, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: '#88ccee',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      parent.add(mesh);
      this.rings.push(mesh);

      this.state[i * 3] = 0;
      this.state[i * 3 + 1] = RIPPLE_LIFETIME;
      this.state[i * 3 + 2] = 0;
    }
  }

  private spawnRipple(index: number): void {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * this.pondRadius;
    const x = this.pondCenter.x + Math.cos(angle) * r;
    const z = this.pondCenter.z + Math.sin(angle) * r;

    const mesh = this.rings[index];
    mesh.position.set(x, this.pondCenter.y + 0.01, z);
    mesh.scale.set(1, 1, 1);
    mesh.visible = true;

    const base = index * 3;
    this.state[base] = 0;
    this.state[base + 1] = RIPPLE_LIFETIME;
    this.state[base + 2] = 1;
  }

  update(dt: number, active: boolean, transition: number): void {
    const clampedDt = Math.min(dt, 0.1);

    // Spawn new ripples
    if (active && transition > 0.01) {
      this.spawnAccum += RIPPLE_SPAWN_RATE * transition * clampedDt;
      while (this.spawnAccum >= 1) {
        this.spawnAccum -= 1;
        // Find an inactive ripple
        for (let i = 0; i < RIPPLE_COUNT; i++) {
          if (this.state[i * 3 + 2] === 0) {
            this.spawnRipple(i);
            break;
          }
        }
      }
    }

    // Update existing ripples
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const base = i * 3;
      if (this.state[base + 2] === 0) continue;

      this.state[base] += clampedDt;
      const t = this.state[base] / this.state[base + 1];

      if (t >= 1) {
        this.state[base + 2] = 0;
        this.rings[i].visible = false;
        continue;
      }

      // Scale ring from start radius to max radius
      const currentRadius = RIPPLE_START_RADIUS + (RIPPLE_MAX_RADIUS - RIPPLE_START_RADIUS) * t;
      const scaleFactor = currentRadius / RIPPLE_START_RADIUS;
      this.rings[i].scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Fade opacity: start at 0.6, end at 0
      const mat = this.rings[i].material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 * (1 - t) * transition;
    }
  }

  dispose(): void {
    for (const ring of this.rings) {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      this.parent.remove(ring);
    }
    this.rings.length = 0;
  }
}
