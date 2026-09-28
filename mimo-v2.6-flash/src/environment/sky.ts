import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { mulberry32, TAU } from '../utils';

const SKY_RADIUS = 400;
const STAR_RADIUS = 320;

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  // NOTE: <tonemapping_pars_fragment> and <colorspace_pars_fragment> are injected
  // by three.js into the fragment prefix for ShaderMaterial — including them here
  // would redefine their functions. <tonemapping_fragment>/<colorspace_fragment>
  // below are the guarded apply-snippets and belong in main().
  #include <common>

  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uGlow;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h >= 0.0
      ? mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, h), 0.72))
      : mix(uHorizon, uBottom, smoothstep(0.0, -0.5, h));

    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    float disc = pow(sd, 1200.0);
    float halo = pow(sd, 7.0);
    col += uSunColor * (disc * 2.2 + halo * 0.32) * uGlow;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Sky {
  readonly mesh: Mesh;
  readonly stars: Points;
  private material: ShaderMaterial;
  private starMaterial: PointsMaterial;

  constructor(scene: Scene) {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new Color('#63a4dd') },
        uHorizon: { value: new Color('#d3e6ee') },
        uBottom: { value: new Color('#a8bdd0') },
        uSunColor: { value: new Color('#ffeed6') },
        uSunDir: { value: new Vector3(0, 1, 0) },
        uGlow: { value: 0.4 },
      },
    });

    this.mesh = new Mesh(new SphereGeometry(SKY_RADIUS, 32, 20), this.material);
    this.mesh.name = 'sky';
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.stars = buildStars();
    this.stars.renderOrder = -9;
    this.starMaterial = this.stars.material as PointsMaterial;
    scene.add(this.stars);
  }

  update(opts: {
    top: Color;
    horizon: Color;
    bottom: Color;
    sunColor: Color;
    sunDir: Vector3;
    glow: number;
    starAlpha: number;
  }): void {
    const u = this.material.uniforms;
    (u.uTop.value as Color).copy(opts.top);
    (u.uHorizon.value as Color).copy(opts.horizon);
    (u.uBottom.value as Color).copy(opts.bottom);
    (u.uSunColor.value as Color).copy(opts.sunColor);
    (u.uSunDir.value as Vector3).copy(opts.sunDir);
    u.uGlow.value = opts.glow;
    this.starMaterial.opacity = opts.starAlpha;
    this.stars.visible = opts.starAlpha > 0.004;
  }
}

function buildStars(): Points {
  const count = 320;
  const positions = new Float32Array(count * 3);
  const rand = mulberry32(9001);
  for (let i = 0; i < count; i++) {
    // Upper hemisphere with a mild zenith bias (a little spills below horizon).
    const theta = rand() * TAU;
    const y = Math.max(-0.18, 1 - rand() * 1.16);
    const s = Math.sqrt(Math.max(0, 1 - y * y));
    const r = STAR_RADIUS * (0.9 + rand() * 0.1);
    positions[i * 3 + 0] = r * Math.cos(theta) * s;
    positions[i * 3 + 1] = r * y;
    positions[i * 3 + 2] = r * Math.sin(theta) * s;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  const mat = new PointsMaterial({
    color: new Color('#dfe8ff'),
    size: 2.4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'stars';
  return points;
}
