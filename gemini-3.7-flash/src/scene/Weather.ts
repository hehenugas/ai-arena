import * as THREE from 'three';

interface Raindrop {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
}

export class Weather {
  public group: THREE.Group;
  private rainLines: THREE.LineSegments;
  private rainMaterial: THREE.LineBasicMaterial;
  private drops: Raindrop[] = [];
  private dropCount = 420;
  private rainIntensity = 0; // 0 (clear) to 1 (full rain)
  private positions: Float32Array;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Weather';

    this.rainMaterial = new THREE.LineBasicMaterial({
      color: 0xa8cbe8,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    const geom = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.dropCount * 2 * 3); // 2 vertices per line streak

    // Initialize pooled raindrops
    for (let i = 0; i < this.dropCount; i++) {
      const drop: Raindrop = {
        x: (Math.random() - 0.5) * 16.0,
        y: 2.0 + Math.random() * 12.0,
        z: (Math.random() - 0.5) * 16.0,
        speed: 13.0 + Math.random() * 5.0,
        len: 0.35 + Math.random() * 0.2
      };
      this.drops.push(drop);

      const idx = i * 6;
      this.positions[idx] = drop.x;
      this.positions[idx + 1] = drop.y;
      this.positions[idx + 2] = drop.z;
      this.positions[idx + 3] = drop.x;
      this.positions[idx + 4] = drop.y + drop.len;
      this.positions[idx + 5] = drop.z;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.rainLines = new THREE.LineSegments(geom, this.rainMaterial);
    this.rainLines.visible = false;
    this.group.add(this.rainLines);
  }

  public getIntensity(): number {
    return this.rainIntensity;
  }

  public update(delta: number, targetWeather: 'clear' | 'rain', windStrength: number): void {
    // Smooth transition between clear and rain
    const targetIntensity = targetWeather === 'rain' ? 1.0 : 0.0;
    const blendRate = 1.8 * delta;
    this.rainIntensity += (targetIntensity - this.rainIntensity) * Math.min(1.0, blendRate);

    if (this.rainIntensity <= 0.001) {
      this.rainLines.visible = false;
      this.rainMaterial.opacity = 0;
      return;
    }

    this.rainLines.visible = true;
    this.rainMaterial.opacity = this.rainIntensity * 0.58;

    // Wind influence on rain slant
    // At zero wind, rain falls vertically. Stronger wind tilts the rain streaks.
    const windSlantX = windStrength * 1.5;
    const windSlantZ = windStrength * 0.75;

    const posAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.dropCount; i++) {
      const drop = this.drops[i];

      // Move drop downward and drift with wind
      drop.y -= drop.speed * delta;
      drop.x += windSlantX * drop.speed * delta * 0.25;
      drop.z += windSlantZ * drop.speed * delta * 0.25;

      // Island collision boundary check:
      // Inside island radius (~6.5), drops hit the ground and recycle (instead of falling through)
      const distFromCenter = Math.hypot(drop.x, drop.z);
      const isOverIsland = distFromCenter < 6.4;
      const groundCutoff = isOverIsland ? 0.05 : -3.5;

      if (drop.y <= groundCutoff) {
        // Recycle to sky above island
        drop.y = 10.0 + Math.random() * 4.0;
        // Compensate for wind drift so drops rain consistently over the island
        drop.x = (Math.random() - 0.5) * 15.0 - windSlantX * 2.0;
        drop.z = (Math.random() - 0.5) * 15.0 - windSlantZ * 2.0;
      }

      // Update line segment vertices
      const idx = i * 6;
      // Bottom of streak
      this.positions[idx] = drop.x;
      this.positions[idx + 1] = drop.y;
      this.positions[idx + 2] = drop.z;

      // Top of streak (slanted backward against wind vector)
      this.positions[idx + 3] = drop.x - windSlantX * drop.len * 0.4;
      this.positions[idx + 4] = drop.y + drop.len;
      this.positions[idx + 5] = drop.z - windSlantZ * drop.len * 0.4;
    }

    posAttr.needsUpdate = true;
  }
}
