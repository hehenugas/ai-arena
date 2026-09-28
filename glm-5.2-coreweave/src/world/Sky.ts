import * as THREE from 'three';
import { clamp01, damp, dampColor, hex, lerp } from '../utils';

/**
 * Sky + sun + moon + stars + the scene's key lights.
 * Everything is driven by a single `update(time, weatherMix, dt)` call so
 * that day/night and weather stay perfectly in sync.
 */
export class Sky {
  readonly group = new THREE.Group();

  readonly sun = new THREE.DirectionalLight(0xffffff, 1.0);
  readonly hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a3a2a, 0.55);
  readonly ambient = new THREE.AmbientLight(0x404858, 0.25);

  private readonly skyMat: THREE.ShaderMaterial;
  private readonly sunMesh: THREE.Mesh;
  private readonly moonMesh: THREE.Mesh;
  private readonly stars: THREE.Points;
  private readonly starMat: THREE.PointsMaterial;

  // smoothed values so the brief's "smooth transitions" hold even on rapid slider drags
  private curSun = 1;          // 0..1 sun elevation brightness factor
  private curNight = 0;        // 0..1 how night-like the scene is
  private curWeather = 0;      // 0 clear .. 1 rain
  private curSunColor = new THREE.Color('#fff2cc');
  private curSkyTop = new THREE.Color('#7fb8e8');
  private curSkyBot = new THREE.Color('#cfe6f5');

  constructor() {
    // Sky dome -----------------------------------------------------------
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color('#7fb8e8') },
        botColor: { value: new THREE.Color('#cfe6f5') },
        sunPos: { value: new THREE.Vector3(0, 1, 0) },
        sunColor: { value: new THREE.Color('#fff2cc') },
        sunAmt: { value: 0.8 },
      },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform vec3 topColor;
        uniform vec3 botColor;
        uniform vec3 sunPos;
        uniform vec3 sunColor;
        uniform float sunAmt;
        void main() {
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(botColor, topColor, pow(h, 0.65));
          float sd = max(dot(normalize(vDir), normalize(sunPos)), 0.0);
          float glow = pow(sd, 8.0) * 0.45 + pow(sd, 80.0) * 0.9;
          col += sunColor * glow * sunAmt;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), this.skyMat);
    sky.frustumCulled = false;
    this.group.add(sky);

    // Sun disc -----------------------------------------------------------
    const sunGeo = new THREE.SphereGeometry(14, 24, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc, fog: false, transparent: true });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.frustumCulled = false;
    this.group.add(this.sunMesh);

    // Moon ---------------------------------------------------------------
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false, transparent: true });
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), moonMat);
    this.moonMesh.frustumCulled = false;
    this.group.add(this.moonMesh);

    // Stars --------------------------------------------------------------
    const starN = 260;
    const pos = new Float32Array(starN * 3);
    const rnd = (i: number) => {
      const s = Math.sin(i * 127.1) * 43758.5453;
      return s - Math.floor(s);
    };
    for (let i = 0; i < starN; i++) {
      // distribute on the upper hemisphere, away from the horizon band
      const u = rnd(i * 2 + 1) * 2 - 1;
      const phi = rnd(i * 2 + 2) * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - u * u));
      const y = Math.abs(u) * 0.7 + 0.25; // keep stars above horizon
      const rad = 380;
      pos[i * 3] = r * Math.cos(phi) * rad;
      pos[i * 3 + 1] = y * rad;
      pos[i * 3 + 2] = r * Math.sin(phi) * rad;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // Lights -------------------------------------------------------------
    this.sun.position.set(40, 60, 20);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 220;
    const s = 26;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.group.add(this.sun);
    this.group.add(this.sun.target);
    this.group.add(this.hemi);
    this.group.add(this.ambient);
  }

  /** Returns sun elevation in [-1,1] for a given hour. */
  private sunElevation(time: number): number {
    // 6:00 = east horizon, 12:00 = zenith, 18:00 = west horizon
    const ang = (time / 24) * Math.PI * 2 - Math.PI / 2;
    return Math.sin(ang);
  }

  /** Sun direction unit vector (from origin toward sun) for a given hour.
   *  Azimuth sweeps east(+X, 6am) → south(+Z, noon) → west(-X, 6pm) so the
   *  camera-facing (+Z) side of the island stays lit through the day. */
  private sunDir(time: number, out: THREE.Vector3): THREE.Vector3 {
    const elev = this.sunElevation(time);
    const az = ((time - 6) / 12) * Math.PI; // 0 at 6am .. π at 6pm
    out.set(Math.cos(az), elev, Math.sin(az));
    if (out.y < 0) out.y = -Math.abs(out.y); // point below horizon at night
    out.normalize();
    return out;
  }

  /**
   * @param time      hours 0..24
   * @param weatherMix 0 clear .. 1 rain (dims the sun)
   * @param dt        delta seconds (for smoothing)
   */
  update(time: number, weatherMix: number, dt: number): void {
    const elev = this.sunElevation(time);
    const dayAmt = clamp01(elev * 1.4 + 0.35);     // broad daytime band
    const nightAmt = clamp01(-elev * 2.2 + 0.2);   // broad nighttime band
    const sunsetAmt = clamp01(1 - Math.abs(elev) * 1.5); // wider warm band

    // smoothed scalars
    this.curSun = damp(this.curSun, dayAmt, 4.0, dt);
    this.curNight = damp(this.curNight, nightAmt, 3.5, dt);
    this.curWeather = damp(this.curWeather, weatherMix, 3.0, dt);

    // target colors for this moment
    const tSun = new THREE.Color();
    if (elev > 0.25) tSun.set('#fff4d6');             // high day
    else if (elev > 0) tSun.set('#ffd27a');           // low day
    else if (elev > -0.15) tSun.set('#ff8a4a');       // sunset band
    else tSun.set('#3a4a7a');                          // night glow
    // warm the sun itself as it nears the horizon (golden hour)
    tSun.lerp(hex('#ffb060'), sunsetAmt * 0.5);
    // blend toward a cooler dimmer tone when raining
    tSun.lerp(hex('#9aa6c0'), this.curWeather * 0.55);

    const tTop = new THREE.Color();
    const tBot = new THREE.Color();
    // day
    tTop.set('#5fa3e6'); tBot.set('#cfe6f5');
    // sunset pushes warm low band
    const sunset = new THREE.Color('#f0a866');
    tTop.lerp(hex('#3a4a8a'), sunsetAmt * 0.4);
    tBot.lerp(sunset, sunsetAmt * 0.85);
    // night
    const nightTop = new THREE.Color('#0b1426');
    const nightBot = new THREE.Color('#1a2742');
    tTop.lerp(nightTop, this.curNight);
    tBot.lerp(nightBot, this.curNight);
    // rain desaturates + darkens
    tTop.lerp(hex('#5a6678'), this.curWeather * 0.6);
    tBot.lerp(hex('#7a8898'), this.curWeather * 0.6);

    dampColor(this.curSunColor, this.curSunColor, tSun, 6.0, dt);
    dampColor(this.curSkyTop, this.curSkyTop, tTop, 5.0, dt);
    dampColor(this.curSkyBot, this.curSkyBot, tBot, 5.0, dt);

    // push to shader
    const u = this.skyMat.uniforms;
    (u.topColor.value as THREE.Color).copy(this.curSkyTop);
    (u.botColor.value as THREE.Color).copy(this.curSkyBot);
    (u.sunColor.value as THREE.Color).copy(this.curSunColor);

    const dir = new THREE.Vector3();
    this.sunDir(time, dir);
    (u.sunPos.value as THREE.Vector3).copy(dir);
    u.sunAmt.value = this.curSun * (1 - this.curWeather * 0.5);

    // sun mesh position & visibility
    this.sunMesh.position.copy(dir).multiplyScalar(380);
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.copy(this.curSunColor);
    (this.sunMesh.material as THREE.MeshBasicMaterial).opacity = clamp01(dayAmt * 1.4);

    // moon opposite the sun
    this.moonMesh.position.copy(dir).multiplyScalar(-380);
    (this.moonMesh.material as THREE.MeshBasicMaterial).opacity = clamp01(nightAmt * 1.4);

    // stars
    this.starMat.opacity = clamp01(nightAmt - 0.05) * (1 - this.curWeather * 0.7);

    // directional light follows the sun
    this.sun.position.copy(dir).multiplyScalar(60);
    this.sun.color.copy(this.curSunColor);
    this.sun.intensity = lerp(0.08, 1.5, this.curSun) * (1 - this.curWeather * 0.55);

    // hemisphere & ambient adapt to time - kept strong enough that the
    // camera-facing side stays readable even when the sun is behind the island
    const hemiSky = new THREE.Color('#bfe0ff').lerp(hex('#3a4866'), this.curNight);
    const hemiGround = new THREE.Color('#b09a7c').lerp(hex('#383844'), this.curNight);
    this.hemi.color.copy(hemiSky);
    this.hemi.groundColor.copy(hemiGround);
    this.hemi.intensity = lerp(1.15, 0.7, this.curNight) * (1 - this.curWeather * 0.25);

    this.ambient.color.copy(new THREE.Color('#7a8499').lerp(hex('#58688a'), this.curNight));
    this.ambient.intensity = lerp(0.7, 1.4, this.curNight);
  }

  /** Expose the live sun elevation factor for other modules (window glow). */
  get nightFactor(): number {
    return this.curNight;
  }
  get dayFactor(): number {
    return this.curSun;
  }
  get weatherFactor(): number {
    return this.curWeather;
  }
  /** Current horizon (bottom) sky color — used to match scene fog. */
  get horizonColor(): THREE.Color {
    return this.curSkyBot;
  }

  dispose(): void {
    this.skyMat.dispose();
    this.sunMesh.geometry.dispose();
    (this.sunMesh.material as THREE.Material).dispose();
    this.moonMesh.geometry.dispose();
    (this.moonMesh.material as THREE.Material).dispose();
    this.stars.geometry.dispose();
    this.starMat.dispose();
  }
}
