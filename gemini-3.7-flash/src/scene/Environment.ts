import * as THREE from 'three';

interface Cloud {
  group: THREE.Group;
  baseY: number;
  radius: number;
  angle: number;
  speed: number;
  materials: THREE.MeshStandardMaterial[];
}

interface SkyKeyframe {
  hour: number;
  skyTop: number;
  skyBottom: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  starsOpacity: number;
}

export class Environment {
  public group: THREE.Group;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;

  public skyColor = new THREE.Color(0x4070a8);
  private stars: THREE.Points;
  private clouds: Cloud[] = [];

  private currentOvercast = 0; // 0 (clear) to 1 (full rain overcast)

  private static readonly KEYFRAMES: SkyKeyframe[] = [
    {
      hour: 0.0, // Midnight
      skyTop: 0x070b18,
      skyBottom: 0x11172a,
      sunColor: 0x88b0e0, // Moonlight
      sunIntensity: 0.55,
      ambientColor: 0x1c2436,
      ambientIntensity: 0.45,
      hemiSkyColor: 0x223048,
      hemiGroundColor: 0x141822,
      hemiIntensity: 0.4,
      starsOpacity: 0.95
    },
    {
      hour: 5.0, // Pre-dawn
      skyTop: 0x121733,
      skyBottom: 0x242744,
      sunColor: 0x9fbce0,
      sunIntensity: 0.45,
      ambientColor: 0x242a40,
      ambientIntensity: 0.48,
      hemiSkyColor: 0x29354d,
      hemiGroundColor: 0x181d28,
      hemiIntensity: 0.42,
      starsOpacity: 0.7
    },
    {
      hour: 6.5, // Sunrise
      skyTop: 0x3d4e7a,
      skyBottom: 0xf2a16d,
      sunColor: 0xffbb77,
      sunIntensity: 1.1,
      ambientColor: 0x6e5254,
      ambientIntensity: 0.6,
      hemiSkyColor: 0x6e7ea8,
      hemiGroundColor: 0x483a30,
      hemiIntensity: 0.55,
      starsOpacity: 0.05
    },
    {
      hour: 9.0, // Morning
      skyTop: 0x4896db,
      skyBottom: 0xb5def8,
      sunColor: 0xfffae8,
      sunIntensity: 1.5,
      ambientColor: 0x68788c,
      ambientIntensity: 0.62,
      hemiSkyColor: 0x94c1f2,
      hemiGroundColor: 0x5a5446,
      hemiIntensity: 0.6,
      starsOpacity: 0.0
    },
    {
      hour: 12.0, // Noon
      skyTop: 0x3b8fd4,
      skyBottom: 0xc4e5fc,
      sunColor: 0xfffcf2,
      sunIntensity: 1.65,
      ambientColor: 0x718196,
      ambientIntensity: 0.65,
      hemiSkyColor: 0x9eccf8,
      hemiGroundColor: 0x5e5648,
      hemiIntensity: 0.65,
      starsOpacity: 0.0
    },
    {
      hour: 16.0, // Golden afternoon (Default)
      skyTop: 0x4a85bf,
      skyBottom: 0xf0c59e,
      sunColor: 0xffeed8,
      sunIntensity: 1.5,
      ambientColor: 0x7c8c9e,
      ambientIntensity: 0.72,
      hemiSkyColor: 0x9bc2ec,
      hemiGroundColor: 0x735c46,
      hemiIntensity: 0.7,
      starsOpacity: 0.0
    },
    {
      hour: 18.5, // Sunset
      skyTop: 0x2e3b6b,
      skyBottom: 0xe65c40,
      sunColor: 0xff7336,
      sunIntensity: 1.3,
      ambientColor: 0x5e414c,
      ambientIntensity: 0.55,
      hemiSkyColor: 0x765a7e,
      hemiGroundColor: 0x42302c,
      hemiIntensity: 0.52,
      starsOpacity: 0.15
    },
    {
      hour: 20.2, // Twilight / Dusk
      skyTop: 0x141b3b,
      skyBottom: 0x4d3257,
      sunColor: 0x826ca8,
      sunIntensity: 0.65,
      ambientColor: 0x2d2f44,
      ambientIntensity: 0.48,
      hemiSkyColor: 0x3a3a5e,
      hemiGroundColor: 0x201e2c,
      hemiIntensity: 0.45,
      starsOpacity: 0.65
    },
    {
      hour: 22.0, // Night
      skyTop: 0x090e1f,
      skyBottom: 0x141c33,
      sunColor: 0x88b0e0, // Moon
      sunIntensity: 0.55,
      ambientColor: 0x1c2436,
      ambientIntensity: 0.45,
      hemiSkyColor: 0x223048,
      hemiGroundColor: 0x141822,
      hemiIntensity: 0.4,
      starsOpacity: 0.95
    },
    {
      hour: 24.0, // Midnight wrap
      skyTop: 0x070b18,
      skyBottom: 0x11172a,
      sunColor: 0x88b0e0,
      sunIntensity: 0.55,
      ambientColor: 0x1c2436,
      ambientIntensity: 0.45,
      hemiSkyColor: 0x223048,
      hemiGroundColor: 0x141822,
      hemiIntensity: 0.4,
      starsOpacity: 0.95
    }
  ];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Environment';

    // 1. Sun / Moon Directional Light with shadows
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 5.0;
    this.sunLight.shadow.camera.far = 50.0;
    this.sunLight.shadow.camera.left = -9;
    this.sunLight.shadow.camera.right = 9;
    this.sunLight.shadow.camera.top = 9;
    this.sunLight.shadow.camera.bottom = -9;
    this.sunLight.shadow.bias = -0.0005;
    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);

    // 2. Hemisphere Light for soft sky/ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.group.add(this.hemiLight);

    // 3. Ambient Light for gentle fill
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.group.add(this.ambientLight);

    // 5. Starfield for night sky
    this.stars = this.createStarfield();
    this.group.add(this.stars);

    // 6. Puffy Clouds
    this.buildClouds();
  }

  private createStarfield(): THREE.Points {
    const starCount = 350;
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let i = 0; i < starCount; i++) {
      // Upper hemisphere distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.15); // Above horizon
      const r = 70.0;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true
    });

    return new THREE.Points(geom, mat);
  }

  private buildClouds(): void {
    const cloudConfigs = [
      { r: 12.0, y: 7.0, angle: 0.2, speed: 0.08, scale: 1.1 },
      { r: 14.5, y: 8.5, angle: 1.6, speed: 0.06, scale: 1.3 },
      { r: 11.0, y: 6.2, angle: 3.1, speed: 0.09, scale: 0.9 },
      { r: 13.5, y: 7.8, angle: 4.8, speed: 0.07, scale: 1.25 }
    ];

    for (const c of cloudConfigs) {
      const cloudGroup = new THREE.Group();
      const materials: THREE.MeshStandardMaterial[] = [];

      // 4-6 clustered spheres with low-poly style
      const sphereCount = 5;
      for (let s = 0; s < sphereCount; s++) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0xfcfcfc,
          roughness: 0.95,
          flatShading: true
        });
        materials.push(mat);

        const radius = (0.7 + Math.random() * 0.6) * c.scale;
        const geom = new THREE.DodecahedronGeometry(radius, 1);
        const sphere = new THREE.Mesh(geom, mat);

        sphere.position.set(
          (s - sphereCount / 2) * 0.7 * c.scale + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3 * c.scale,
          (Math.random() - 0.5) * 0.5 * c.scale
        );
        sphere.castShadow = true;
        cloudGroup.add(sphere);
      }

      cloudGroup.position.set(
        Math.cos(c.angle) * c.r,
        c.y,
        Math.sin(c.angle) * c.r
      );

      this.group.add(cloudGroup);

      this.clouds.push({
        group: cloudGroup,
        baseY: c.y,
        radius: c.r,
        angle: c.angle,
        speed: c.speed,
        materials
      });
    }
  }

  public update(delta: number, timeOfDay: number, weather: 'clear' | 'rain', windStrength: number): void {
    // 1. Weather overcast blend (0.0 clear -> 1.0 rainy overcast)
    const targetOvercast = weather === 'rain' ? 1.0 : 0.0;
    const overcastBlend = 2.0 * delta;
    this.currentOvercast += (targetOvercast - this.currentOvercast) * Math.min(1.0, overcastBlend);

    // 2. Interpolate Time of Day Keyframes
    const t = (timeOfDay % 24 + 24) % 24;
    let k1 = Environment.KEYFRAMES[0];
    let k2 = Environment.KEYFRAMES[1];

    for (let i = 0; i < Environment.KEYFRAMES.length - 1; i++) {
      if (t >= Environment.KEYFRAMES[i].hour && t <= Environment.KEYFRAMES[i + 1].hour) {
        k1 = Environment.KEYFRAMES[i];
        k2 = Environment.KEYFRAMES[i + 1];
        break;
      }
    }

    const range = k2.hour - k1.hour;
    const alpha = range > 0 ? (t - k1.hour) / range : 0;

    const skyTopCol = new THREE.Color(k1.skyTop).lerp(new THREE.Color(k2.skyTop), alpha);
    const skyBottomCol = new THREE.Color(k1.skyBottom).lerp(new THREE.Color(k2.skyBottom), alpha);
    const sunCol = new THREE.Color(k1.sunColor).lerp(new THREE.Color(k2.sunColor), alpha);
    const ambientCol = new THREE.Color(k1.ambientColor).lerp(new THREE.Color(k2.ambientColor), alpha);
    const hemiSkyCol = new THREE.Color(k1.hemiSkyColor).lerp(new THREE.Color(k2.hemiSkyColor), alpha);
    const hemiGroundCol = new THREE.Color(k1.hemiGroundColor).lerp(new THREE.Color(k2.hemiGroundColor), alpha);

    let sunInt = THREE.MathUtils.lerp(k1.sunIntensity, k2.sunIntensity, alpha);
    let ambInt = THREE.MathUtils.lerp(k1.ambientIntensity, k2.ambientIntensity, alpha);
    let hemiInt = THREE.MathUtils.lerp(k1.hemiIntensity, k2.hemiIntensity, alpha);
    const starsOp = THREE.MathUtils.lerp(k1.starsOpacity, k2.starsOpacity, alpha);

    // Apply rain overcast darkening & mood
    if (this.currentOvercast > 0.001) {
      const rainSkyTop = new THREE.Color(0x353d48);
      const rainSkyBottom = new THREE.Color(0x525c69);
      const rainSunCol = new THREE.Color(0xa0abb8);

      skyTopCol.lerp(rainSkyTop, this.currentOvercast * 0.7);
      skyBottomCol.lerp(rainSkyBottom, this.currentOvercast * 0.7);
      sunCol.lerp(rainSunCol, this.currentOvercast * 0.6);

      sunInt *= (1.0 - this.currentOvercast * 0.45);
      ambInt = THREE.MathUtils.lerp(ambInt, 0.45, this.currentOvercast * 0.5);
      hemiInt = THREE.MathUtils.lerp(hemiInt, 0.48, this.currentOvercast * 0.5);
    }

    // Apply to Three.js lighting
    this.sunLight.color.copy(sunCol);
    this.sunLight.intensity = sunInt;

    this.ambientLight.color.copy(ambientCol);
    this.ambientLight.intensity = ambInt;

    this.hemiLight.color.copy(hemiSkyCol);
    this.hemiLight.groundColor.copy(hemiGroundCol);
    this.hemiLight.intensity = hemiInt;

    // Update sky color
    this.skyColor.copy(skyTopCol);

    // Stars opacity (dimmer during rain)
    const starMat = this.stars.material as THREE.PointsMaterial;
    starMat.opacity = starsOp * (1.0 - this.currentOvercast * 0.85);

    // Sun / Moon orbital trajectory
    // Hour 6: sunrise at East, 12: noon overhead, 18: sunset at West, 24: midnight (moon)
    const sunAngle = ((t - 6.0) / 24.0) * Math.PI * 2;
    const sunDist = 24.0;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle * 0.5) * 8.0 + 4.0;

    if (sunY >= -2.0) {
      // Sun is above or near horizon
      this.sunLight.position.set(sunX, Math.max(2.0, sunY), sunZ);
    } else {
      // Opposite side for moon
      this.sunLight.position.set(-sunX, -sunY, -sunZ);
    }

    // 3. Clouds drift and color
    const cloudColor = new THREE.Color(0xfcfcfc).lerp(new THREE.Color(0x4a5563), this.currentOvercast * 0.85);
    // At night, clouds also take on slight moonlight tint
    if (t < 5.5 || t > 21.0) {
      cloudColor.multiply(new THREE.Color(0x3a4860));
    }

    for (const c of this.clouds) {
      // Drift driven by wind strength
      c.angle += (c.speed * (0.15 + windStrength * 1.8)) * delta;
      c.group.position.x = Math.cos(c.angle) * c.radius;
      c.group.position.z = Math.sin(c.angle) * c.radius;

      // Set cloud materials color
      for (const mat of c.materials) {
        mat.color.copy(cloudColor);
      }
    }
  }

  public getOvercast(): number {
    return this.currentOvercast;
  }
}
