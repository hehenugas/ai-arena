import * as THREE from 'three';
import { lerp } from '../utils/math';

interface SkyColorStop {
  time: number;
  top: THREE.Color;
  bottom: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
}

interface DriftingCloud {
  group: THREE.Group;
  baseY: number;
  speedFactor: number;
  radiusBound: number;
}

export class Environment {
  public scene: THREE.Scene;

  // Lights
  public sunLight!: THREE.DirectionalLight;
  public hemiLight!: THREE.HemisphereLight;
  public ambientLight!: THREE.AmbientLight;

  // Visual Celestial bodies
  private sunMesh!: THREE.Mesh;
  private moonMesh!: THREE.Mesh;
  private starsPoints!: THREE.Points;

  // Sky dome / background
  private skyMesh!: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;

  // Clouds
  private clouds: DriftingCloud[] = [];
  private cloudMaterials: THREE.MeshStandardMaterial[] = [];

  // Color keyframes across the 24-hour cycle
  private timeStops: SkyColorStop[] = [
    // Midnight
    {
      time: 0.0,
      top: new THREE.Color(0x060914),
      bottom: new THREE.Color(0x111728),
      sunColor: new THREE.Color(0x8faee0),
      sunIntensity: 0.45,
      hemiSky: new THREE.Color(0x192742),
      hemiGround: new THREE.Color(0x0d141e),
      hemiIntensity: 0.4,
    },
    // Deep Night / Pre-dawn
    {
      time: 4.5,
      top: new THREE.Color(0x0a0f20),
      bottom: new THREE.Color(0x192038),
      sunColor: new THREE.Color(0x9cb8e6),
      sunIntensity: 0.45,
      hemiSky: new THREE.Color(0x1d2c4a),
      hemiGround: new THREE.Color(0x0e1724),
      hemiIntensity: 0.42,
    },
    // Sunrise
    {
      time: 6.2,
      top: new THREE.Color(0x2d3b66),
      bottom: new THREE.Color(0xf29d79),
      sunColor: new THREE.Color(0xffa166),
      sunIntensity: 1.1,
      hemiSky: new THREE.Color(0x566d9b),
      hemiGround: new THREE.Color(0x3d302a),
      hemiIntensity: 0.7,
    },
    // Early Morning
    {
      time: 8.5,
      top: new THREE.Color(0x5ca9e6),
      bottom: new THREE.Color(0xd6ebfb),
      sunColor: new THREE.Color(0xfff5e0),
      sunIntensity: 1.6,
      hemiSky: new THREE.Color(0x9ed3f7),
      hemiGround: new THREE.Color(0x556e40),
      hemiIntensity: 0.85,
    },
    // Midday
    {
      time: 12.0,
      top: new THREE.Color(0x4ca1e3),
      bottom: new THREE.Color(0xd2e8fa),
      sunColor: new THREE.Color(0xffffff),
      sunIntensity: 1.75,
      hemiSky: new THREE.Color(0xafe1ff),
      hemiGround: new THREE.Color(0x587844),
      hemiIntensity: 0.95,
    },
    // Afternoon (Default 16:00 starts near here)
    {
      time: 16.0,
      top: new THREE.Color(0x529fd8),
      bottom: new THREE.Color(0xfde4c8),
      sunColor: new THREE.Color(0xffeaaf),
      sunIntensity: 1.65,
      hemiSky: new THREE.Color(0xabd6f2),
      hemiGround: new THREE.Color(0x606d3d),
      hemiIntensity: 0.9,
    },
    // Sunset
    {
      time: 18.2,
      top: new THREE.Color(0x353f6b),
      bottom: new THREE.Color(0xff7043),
      sunColor: new THREE.Color(0xff7e40),
      sunIntensity: 1.45,
      hemiSky: new THREE.Color(0x735c82),
      hemiGround: new THREE.Color(0x3d2822),
      hemiIntensity: 0.75,
    },
    // Dusk / Twilight
    {
      time: 20.0,
      top: new THREE.Color(0x141830),
      bottom: new THREE.Color(0x593a5e),
      sunColor: new THREE.Color(0xd17866),
      sunIntensity: 0.65,
      hemiSky: new THREE.Color(0x2a2b4d),
      hemiGround: new THREE.Color(0x161521),
      hemiIntensity: 0.5,
    },
    // End of day (wrapping to 24.0 = midnight)
    {
      time: 24.0,
      top: new THREE.Color(0x060914),
      bottom: new THREE.Color(0x111728),
      sunColor: new THREE.Color(0x8faee0),
      sunIntensity: 0.45,
      hemiSky: new THREE.Color(0x192742),
      hemiGround: new THREE.Color(0x0d141e),
      hemiIntensity: 0.4,
    },
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildLighting();
    this.buildSky();
    this.buildStars();
    this.buildCelestialMeshes();
    this.buildClouds();
  }

  private buildLighting() {
    // 1. Sun / Moon Directional Light with crisp shadows
    this.sunLight = new THREE.DirectionalLight(0xfff3db, 1.6);
    this.sunLight.castShadow = true;

    // Shadow map tuning for exquisite miniature depth
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 35;
    const shadowD = 7.5;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);

    // 2. Hemisphere Light for soft natural sky-ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x9ed3f7, 0x556e40, 0.85);
    this.scene.add(this.hemiLight);

    // 3. Subtle Ambient Light so shadows never crush to pure black
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambientLight);
  }

  private buildSky() {
    // Procedural gradient sky dome shader
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float factor = max(pow(max(h, 0.0), exponent), 0.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, factor), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x529fd8) },
      bottomColor: { value: new THREE.Color(0xfde4c8) },
      offset: { value: 12.0 },
      exponent: { value: 0.75 },
    };

    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const skyGeo = new THREE.SphereGeometry(35, 32, 16);
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyMesh);
  }

  private buildStars() {
    // Twinkling stars for dusk and night
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.1 + Math.random() * 0.9); // above horizon
      const radius = 32 + Math.random() * 2;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true,
    });

    this.starsPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsPoints);
  }

  private buildCelestialMeshes() {
    // Stylized Glowing Sun disc
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
    });
    this.sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 16), sunMat);
    this.scene.add(this.sunMesh);

    // Stylized Moon disc with gentle glow
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xebf3ff,
    });
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), moonMat);
    this.scene.add(this.moonMesh);
  }

  private buildClouds() {
    const cloudConfigs = [
      { x: -3.0, y: 4.6, z: -2.0, scale: 0.95, speed: 0.9 },
      { x: 2.8, y: 5.0, z: -1.0, scale: 1.1, speed: 1.1 },
      { x: 0.2, y: 4.2, z: -4.0, scale: 0.85, speed: 0.75 },
      { x: -1.8, y: 5.2, z: 3.0, scale: 1.0, speed: 1.0 },
      { x: 3.8, y: 4.8, z: 2.0, scale: 0.8, speed: 0.8 },
    ];

    const puffGeo = new THREE.DodecahedronGeometry(0.8, 1);

    cloudConfigs.forEach((cfg) => {
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(cfg.x, cfg.y, cfg.z);
      cloudGroup.scale.set(cfg.scale, cfg.scale * 0.7, cfg.scale);

      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      });
      this.cloudMaterials.push(cloudMat);

      // Puffy cloud cluster
      const puffs = [
        { x: 0, y: 0, z: 0, s: 1.1 },
        { x: -0.85, y: -0.15, z: 0.2, s: 0.85 },
        { x: 0.85, y: -0.1, z: -0.1, s: 0.9 },
        { x: -0.35, y: 0.45, z: -0.1, s: 0.8 },
        { x: 0.45, y: 0.4, z: 0.2, s: 0.75 },
      ];

      puffs.forEach((p) => {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(p.x, p.y, p.z);
        puff.scale.set(p.s, p.s, p.s);
        puff.castShadow = true;
        cloudGroup.add(puff);
      });

      this.scene.add(cloudGroup);

      this.clouds.push({
        group: cloudGroup,
        baseY: cfg.y,
        speedFactor: cfg.speed,
        radiusBound: 16,
      });
    });
  }

  /**
   * Interpolate between time stops for smooth 24h lighting & sky
   */
  public updateEnvironment(time: number, _weather: 'clear' | 'rain', rainBlend: number) {
    // 1. Locate current keyframe segment
    let idx = 0;
    for (let i = 0; i < this.timeStops.length - 1; i++) {
      if (time >= this.timeStops[i].time && time <= this.timeStops[i + 1].time) {
        idx = i;
        break;
      }
    }

    const curr = this.timeStops[idx];
    const next = this.timeStops[idx + 1];
    const t = (time - curr.time) / (next.time - curr.time);

    // Interpolate base daylight colors
    const skyTop = curr.top.clone().lerp(next.top, t);
    const skyBottom = curr.bottom.clone().lerp(next.bottom, t);
    const sunColor = curr.sunColor.clone().lerp(next.sunColor, t);
    const sunIntensity = lerp(curr.sunIntensity, next.sunIntensity, t);
    const hemiSky = curr.hemiSky.clone().lerp(next.hemiSky, t);
    const hemiGround = curr.hemiGround.clone().lerp(next.hemiGround, t);
    const hemiIntensity = lerp(curr.hemiIntensity, next.hemiIntensity, t);

    // 2. Weather Rain Overrides (Darker, desaturated overcast sky)
    if (rainBlend > 0) {
      const stormTop = new THREE.Color(0x353b47);
      const stormBottom = new THREE.Color(0x565e6d);
      const stormSun = new THREE.Color(0x8a929e);

      skyTop.lerp(stormTop, rainBlend * 0.7);
      skyBottom.lerp(stormBottom, rainBlend * 0.75);
      sunColor.lerp(stormSun, rainBlend * 0.6);
      hemiSky.lerp(new THREE.Color(0x404854), rainBlend * 0.6);
      hemiGround.lerp(new THREE.Color(0x282e38), rainBlend * 0.6);

      // Cloud materials darken in rain
      const cloudColor = new THREE.Color(0xfafafa).lerp(
        new THREE.Color(0x4b5360),
        rainBlend * 0.85
      );
      for (const mat of this.cloudMaterials) {
        mat.color.copy(cloudColor);
      }
    } else {
      for (const mat of this.cloudMaterials) {
        mat.color.setHex(0xfafafa);
      }
    }

    // Apply to Sky Shader
    this.skyMaterial.uniforms.topColor.value.copy(skyTop);
    this.skyMaterial.uniforms.bottomColor.value.copy(skyBottom);

    // 3. Sun and Moon orbital trajectory
    // Day cycle: Sun rises at ~06:00, peaks at ~12:00, sets at ~18:00
    // Angle: 0 at 06:00, PI/2 at 12:00, PI at 18:00, 3PI/2 at 24:00
    const sunAngle = ((time - 6.0) / 24.0) * Math.PI * 2;
    const orbitRadius = 18.0;

    const sunX = Math.cos(sunAngle) * orbitRadius;
    const sunY = Math.sin(sunAngle) * orbitRadius;
    const sunZ = Math.sin(sunAngle * 0.5) * 6.0 - 2.0;

    this.sunMesh.position.set(sunX, sunY, sunZ);

    // Moon is opposite to the Sun
    const moonAngle = sunAngle + Math.PI;
    const moonX = Math.cos(moonAngle) * orbitRadius;
    const moonY = Math.sin(moonAngle) * orbitRadius;
    const moonZ = Math.sin(moonAngle * 0.5) * 6.0 - 2.0;

    this.moonMesh.position.set(moonX, moonY, moonZ);

    // Active directional light follows whichever celestial body is above the horizon
    const isNight = sunY < 0;
    if (!isNight) {
      this.sunLight.position.set(sunX, Math.max(sunY, 1.0), sunZ);
      this.sunLight.color.copy(sunColor);
      this.sunLight.intensity = sunIntensity * (1.0 - rainBlend * 0.4);
    } else {
      // Moon lighting: soft slate blue, gentle shadows
      this.sunLight.position.set(moonX, Math.max(moonY, 2.0), moonZ);
      const moonLightColor = new THREE.Color(0xa5c4e8);
      this.sunLight.color.copy(moonLightColor);
      this.sunLight.intensity = Math.max(0.35, sunIntensity * (1.0 - rainBlend * 0.3));
    }

    // Apply hemisphere light
    this.hemiLight.color.copy(hemiSky);
    this.hemiLight.groundColor.copy(hemiGround);
    this.hemiLight.intensity = hemiIntensity * (1.0 - rainBlend * 0.25);

    // Ambient light
    this.ambientLight.intensity = isNight ? 0.25 : 0.15;

    // Stars visibility: fade in as sun dips below horizon
    let starOpacity = 0.0;
    if (time >= 19.5 || time <= 5.0) {
      if (time >= 21.0 || time <= 4.0) {
        starOpacity = 0.95;
      } else if (time > 19.5) {
        starOpacity = (time - 19.5) / 1.5;
      } else {
        starOpacity = (5.0 - time) / 1.0;
      }
    }
    // Rain clouds obstruct stars
    starOpacity *= (1.0 - rainBlend * 0.9);
    (this.starsPoints.material as THREE.PointsMaterial).opacity = starOpacity;
  }

  public updateClouds(delta: number, windStrength: number) {
    // Cloud drift speed proportional to wind strength
    // At wind = 0, very gentle micro-drift; at wind = 1, brisk drift
    const speed = (0.2 + windStrength * 1.5) * delta;

    for (const c of this.clouds) {
      c.group.position.x += speed * c.speedFactor;

      // Wrap around bounds
      if (c.group.position.x > c.radiusBound) {
        c.group.position.x = -c.radiusBound;
      }
    }
  }
}
