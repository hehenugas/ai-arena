import * as THREE from 'three';
import type { Mood } from '../core/theme';

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uLow;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform vec3 uMoonColor;
  uniform vec3 uMoonDir;
  uniform float uStars;
  uniform float uSunSize;
  uniform float uGlow;
  varying vec3 vDir;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.65, h));
    col = mix(col, uLow, smoothstep(0.02, -0.55, h));
    // haze band hugging the horizon keeps the background from reading as a flat wall
    col = mix(col, uHorizon * 1.05, exp(-abs(h) * 5.0) * 0.3);

    float sun = max(dot(dir, uSunDir), 0.0);
    col += uSunColor * pow(sun, 1200.0 / uSunSize) * 1.5;
    col += uSunColor * pow(sun, 9.0) * 0.26 * uGlow;
    col += uSunColor * pow(sun, 2.0) * 0.06 * uGlow;

    float moon = max(dot(dir, uMoonDir), 0.0);
    col += uMoonColor * pow(moon, 3200.0) * 1.1;
    col += uMoonColor * pow(moon, 60.0) * 0.07;

    if (uStars > 0.002) {
      vec3 cell = floor(dir * 150.0);
      float r = hash13(cell);
      float bright = smoothstep(0.9955, 1.0, r);
      vec3 jitter = vec3(hash13(cell + 1.7), hash13(cell + 9.1), hash13(cell + 4.4)) - 0.5;
      float d = distance(dir, normalize(cell + 0.5 + jitter * 0.9));
      float star = smoothstep(0.0075, 0.0, d) * bright;
      col += vec3(star) * uStars * smoothstep(-0.04, 0.28, h) * 0.9;
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface Sky {
  mesh: THREE.Mesh;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  update(mood: Mood, rain: number): void;
}

/** Sky dome: a three-stop vertical gradient, a sun disc, a moon disc and stars. */
export function createSky(): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x3f86d4) },
      uHorizon: { value: new THREE.Color(0xd9e7ef) },
      uLow: { value: new THREE.Color(0x9fb6c4) },
      uSunColor: { value: new THREE.Color(0xfff1d6) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonColor: { value: new THREE.Color(0xdfe8ff) },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uStars: { value: 0 },
      uSunSize: { value: 1 },
      uGlow: { value: 1 },
    },
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  const sunDir = new THREE.Vector3(0, 1, 0);
  const moonDir = new THREE.Vector3(0, -1, 0);

  return {
    mesh,
    sunDir,
    moonDir,
    update(mood, rain) {
      const u = material.uniforms;
      (u.uTop.value as THREE.Color).copy(mood.skyTop);
      (u.uHorizon.value as THREE.Color).copy(mood.skyHorizon);
      (u.uLow.value as THREE.Color).copy(mood.skyLow);
      (u.uSunDir.value as THREE.Vector3).copy(sunDir);
      (u.uMoonDir.value as THREE.Vector3).copy(moonDir);
      u.uStars.value = Math.max(0, mood.night * 0.9);
      u.uSunSize.value = 1;
      u.uGlow.value = 1 - rain * 0.7;
    },
  };
}
