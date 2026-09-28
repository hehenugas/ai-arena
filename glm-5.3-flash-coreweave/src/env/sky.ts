import * as THREE from 'three';
import type { DayCycle } from '../palette';
import { mulberry32 } from '../util';

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
uniform vec3 uDown;
uniform vec3 uSunDir;
uniform vec3 uGlowColor;
uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = (h >= 0.0)
    ? mix(uHorizon, uTop, pow(clamp(h * 1.6, 0.0, 1.0), 0.8))
    : mix(uHorizon, uDown, clamp(-h * 2.5, 0.0, 1.0));
  float g = pow(max(dot(d, uSunDir), 0.0), 16.0);
  col += uGlowColor * g * uGlow * 0.6;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Gradient sky dome, sun/moon discs and a dim star field. */
export function createSky(scene: THREE.Scene) {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uDown: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uGlowColor: { value: new THREE.Color() },
    uGlow: { value: 0 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(58, 32, 15),
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  scene.add(dome);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 28),
    new THREE.MeshBasicMaterial({
      color: '#fff2cf',
      transparent: true,
      opacity: 1,
      toneMapped: false,
      depthWrite: false,
      fog: false,
    }),
  );
  scene.add(sunDisc);

  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 28),
    new THREE.MeshBasicMaterial({
      color: '#ffd9a0',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
  );
  scene.add(sunGlow);

  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 28),
    new THREE.MeshBasicMaterial({
      color: '#e8eef8',
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
      fog: false,
    }),
  );
  scene.add(moonDisc);

  // star field
  const count = 340;
  const pos = new Float32Array(count * 3);
  const rand = mulberry32(88);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    if (v.lengthSq() < 0.01) v.set(0.3, 0.8, 0.4);
    v.normalize();
    if (v.y < -0.05) v.y = -v.y;
    v.multiplyScalar(54);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#cdd6f0',
    size: 0.45,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  return {
    update(cycle: DayCycle, dt: number, weatherT: number, reduced: boolean) {
      uniforms.uTop.value.copy(cycle.skyTop);
      uniforms.uHorizon.value.copy(cycle.skyHorizon);
      uniforms.uDown.value.copy(cycle.skyDown);
      uniforms.uSunDir.value.copy(cycle.sunDir);
      uniforms.uGlowColor.value.copy(cycle.sunColor);
      uniforms.uGlow.value = cycle.glow;

      sunDisc.position.copy(cycle.sunDir).multiplyScalar(50);
      sunDisc.lookAt(0, 0, 0);
      (sunDisc.material as THREE.MeshBasicMaterial).color
        .copy(cycle.sunColor)
        .lerp(new THREE.Color('#ffffff'), 0.35);
      (sunDisc.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.smoothstep(
        cycle.sunElev,
        -0.12,
        0.02,
      );

      sunGlow.position.copy(cycle.sunDir).multiplyScalar(49);
      sunGlow.lookAt(0, 0, 0);
      (sunGlow.material as THREE.MeshBasicMaterial).opacity = cycle.glow * 0.32 * (1 - weatherT * 0.7);

      moonDisc.position.copy(cycle.moonDir).multiplyScalar(50);
      moonDisc.lookAt(0, 0, 0);
      (moonDisc.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.smoothstep(cycle.moonElev, 0.0, 0.15) * 0.95 * (1 - 0.5 * weatherT);

      starMat.opacity = cycle.night * (1 - 0.9 * weatherT);
      if (!reduced) stars.rotation.y += dt * 0.004;
    },
  };
}
