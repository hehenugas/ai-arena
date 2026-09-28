import * as THREE from 'three';
import { mulberry32 } from '../utils/math';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uGlowColor;
  uniform float uGlow;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0
      ? mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.55, h), 0.75))
      : mix(uHorizon, uBottom, smoothstep(0.0, 0.55, -h));
    float s = max(dot(d, uSunDir), 0.0);
    float band = exp(-abs(h) * 5.0);
    col += uGlowColor * uGlow * (pow(s, 6.0) * 0.45 + pow(s, 48.0) * 0.5) * (0.4 + 0.6 * band);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export class Sky {
  readonly group = new THREE.Group();
  readonly uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uGlowColor: { value: new THREE.Color() },
    uGlow: { value: 0 },
  };
  private readonly starMat: THREE.PointsMaterial;
  private readonly moon: THREE.Mesh;
  private readonly moonMat: THREE.MeshBasicMaterial;

  constructor() {
    this.group.name = 'sky';
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(90, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.group.add(dome);

    const rand = mulberry32(5);
    const count = 520;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand() * Math.PI * 2;
      const v = Math.acos(1 - rand() * 1.05);
      const r = 80;
      pos[i * 3] = Math.sin(v) * Math.cos(u) * r;
      pos[i * 3 + 1] = Math.cos(v) * r;
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xfff6e8,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const stars = new THREE.Points(starGeo, this.starMat);
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    this.group.add(stars);

    this.moonMat = new THREE.MeshBasicMaterial({
      color: 0xf4efdc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), this.moonMat);
    this.moon.renderOrder = -8;
    this.group.add(this.moon);
  }

  update(camera: THREE.Camera, starOpacity: number, moonDir: THREE.Vector3, moonOpacity: number): void {
    this.group.position.copy(camera.position);
    this.starMat.opacity = starOpacity;
    this.moonMat.opacity = moonOpacity;
    this.moon.visible = moonOpacity > 0.01;
    this.moon.position.copy(moonDir).multiplyScalar(75);
  }
}
