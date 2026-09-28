import * as THREE from 'three';

export class WeatherSystem {
  public group: THREE.Group;
  public rainBlend: number = 0.0; // 0 = fully clear, 1 = fully raining

  private rainLines!: THREE.LineSegments;
  private rainMaterial!: THREE.LineBasicMaterial;
  private rainCount: number = 450;
  private rainPositions!: Float32Array;

  // Rain particle state data
  private rainData: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
    length: number;
  }> = [];

  private targetWeather: 'clear' | 'rain' = 'clear';
  private transitionSpeed: number = 1.0; // blend transition speed (approx 1 sec)

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'WeatherSystem';
    this.buildRain();
  }

  private buildRain() {
    // Rain drop lines (each drop has 2 vertices: top and bottom)
    this.rainPositions = new Float32Array(this.rainCount * 2 * 3);

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    this.rainMaterial = new THREE.LineBasicMaterial({
      color: 0xc8ddf0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });

    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMaterial);
    this.rainLines.visible = false;
    this.group.add(this.rainLines);

    // Initialize rain drops in volume
    const boundRadius = 5.5;
    for (let i = 0; i < this.rainCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * boundRadius;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = Math.random() * 11 + 0.5;

      this.rainData.push({
        x,
        y,
        z,
        speed: 13.0 + Math.random() * 5.0,
        length: 0.35 + Math.random() * 0.25,
      });
    }
  }

  public setWeather(weather: 'clear' | 'rain') {
    this.targetWeather = weather;
  }

  public update(delta: number, windStrength: number) {
    // 1. Smoothly interpolate rainBlend towards target
    const targetBlend = this.targetWeather === 'rain' ? 1.0 : 0.0;
    if (this.rainBlend < targetBlend) {
      this.rainBlend = Math.min(targetBlend, this.rainBlend + delta * this.transitionSpeed);
    } else if (this.rainBlend > targetBlend) {
      this.rainBlend = Math.max(targetBlend, this.rainBlend - delta * this.transitionSpeed);
    }

    if (this.rainBlend <= 0.001) {
      this.rainLines.visible = false;
      this.rainMaterial.opacity = 0;
      return;
    }

    this.rainLines.visible = true;
    this.rainMaterial.opacity = this.rainBlend * 0.65;

    // 2. Wind slant: horizontal offsets for rain falling
    // When wind is 0, slant is 0 (falls purely vertical)
    const slantX = windStrength * 0.35;
    const slantZ = windStrength * 0.12;

    const boundRadius = 5.5;
    const islandRadius = 4.8;
    const posAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;
    const array = this.rainPositions;

    for (let i = 0; i < this.rainCount; i++) {
      const d = this.rainData[i];

      // Advance downward and sideways with wind
      d.y -= d.speed * delta;
      d.x += slantX * d.speed * delta;
      d.z += slantZ * d.speed * delta;

      // Distance from island vertical axis
      const distFromCenter = Math.hypot(d.x, d.z);

      // Floor hit check:
      // If above island, stops at ground level (y ~ 0.12)
      // If outside island, falls into the void down to y = -4.5 below island tip
      const floorY = distFromCenter <= islandRadius ? 0.12 : -4.5;

      if (d.y <= floorY) {
        // Recycle drop back up to cloud ceiling
        d.y = 10.5 + Math.random() * 2.5;

        // Respawn uniformly within volume, slightly upstream against wind
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * boundRadius;
        d.x = Math.cos(angle) * r - slantX * 3.0;
        d.z = Math.sin(angle) * r - slantZ * 3.0;
      }

      // Vertex 0 (top of raindrop)
      const idx = i * 6;
      array[idx] = d.x;
      array[idx + 1] = d.y;
      array[idx + 2] = d.z;

      // Vertex 1 (bottom of raindrop, angled along trajectory)
      array[idx + 3] = d.x + slantX * d.length;
      array[idx + 4] = d.y - d.length;
      array[idx + 5] = d.z + slantZ * d.length;
    }

    posAttr.needsUpdate = true;
  }
}
