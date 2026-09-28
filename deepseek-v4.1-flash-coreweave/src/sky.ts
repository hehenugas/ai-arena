import * as THREE from 'three';

export interface SkyUniforms {
  /** All values are linear-space colours (see `THREE.Color`). */
  uTop: { value: THREE.Color };
  uHorizon: { value: THREE.Color };
  uBottom: { value: THREE.Color };
  uSunColor: { value: THREE.Color };
  uSunDir: { value: THREE.Vector3 };
  uSunIntensity: { value: number };
  uNight: { value: number };
  uRain: { value: number };
}

export interface Sky {
  mesh: THREE.Mesh;
  uniforms: SkyUniforms;
}

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec3 vDir;

uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uBottom;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunIntensity;
uniform float uNight;
uniform float uRain;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 dir = normalize(vDir);

  // The camera looks down at a floating island, so anchor the gradient lower:
  // deep sky at the bottom of the frame rising to a soft horizon glow.
  vec3 col = mix(uBottom, uHorizon, smoothstep(-0.9, -0.06, dir.y));
  col = mix(col, uTop, smoothstep(0.0, 0.62, dir.y));

  // Sun / moon glow. A tight core plus a wide halo keeps it readable without bloom.
  vec3 sunDir = normalize(uSunDir);
  float d = max(dot(dir, sunDir), 0.0);
  float core = pow(d, 1400.0);
  float halo = pow(d, 12.0);
  float belt = pow(d, 2.6);
  col += uSunColor * (core * 1.6 + halo * 0.34 + belt * 0.09) * uSunIntensity;

  // Sparse, static stars that fade in at night.
  float star = step(0.9975, hash31(floor(dir * 300.0)));
  star *= smoothstep(0.02, 0.28, dir.y) * uNight;
  col += vec3(0.82, 0.87, 1.0) * star * 1.4;

  // Rain mutes and flattens the sky.
  col = mix(col, mix(col, uHorizon, 0.55) * 0.82, uRain * 0.6);

  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSky(): Sky {
  const uniforms: SkyUniforms = {
    uTop: { value: new THREE.Color('#2c6bb5') },
    uHorizon: { value: new THREE.Color('#cfe6f2') },
    uBottom: { value: new THREE.Color('#b9d3c2') },
    uSunColor: { value: new THREE.Color('#fff2d2') },
    uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() },
    uSunIntensity: { value: 1 },
    uNight: { value: 0 },
    uRain: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: true,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 20), material);
  mesh.name = 'sky';
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;

  return { mesh, uniforms };
}
