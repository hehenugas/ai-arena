import * as THREE from 'three';
import type { EnvSample } from '../palette';

/** Gradient sky dome driven by shader uniforms. */
export function buildSky(): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const uniforms: Record<string, THREE.IUniform> = {
    topColor: { value: new THREE.Color(0x7cc3e8) },
    bottomColor: { value: new THREE.Color(0xe4f2f4) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color(0xfff6e8) },
    glow: { value: 0.0 },
    night: { value: 0.0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w; // pin to far plane
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform float glow;
      uniform float night;
      // hash for stars
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(bottomColor, topColor, pow(h, 0.75));
        // warm glow near the sun at sunrise/sunset
        float sunAmt = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 6.0);
        col += sunColor * sunAmt * (0.25 + glow * 0.9);
        // simple stars at night
        if (night > 0.05 && vDir.y > 0.02) {
          vec3 sp = floor(vDir * 90.0);
          float star = step(0.9975, hash(sp));
          float tw = hash(sp + 1.0);
          col += vec3(star) * night * (0.4 + 0.6 * tw) * smoothstep(0.0, 0.2, vDir.y);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

export function applyEnvToSky(uniforms: Record<string, THREE.IUniform>, env: EnvSample, sunDir: THREE.Vector3): void {
  (uniforms.topColor.value as THREE.Color).copy(env.skyTop);
  (uniforms.bottomColor.value as THREE.Color).copy(env.skyBottom);
  (uniforms.sunDir.value as THREE.Vector3).copy(sunDir);
  (uniforms.sunColor.value as THREE.Color).copy(env.sunColor);
  uniforms.glow.value = env.sunsetGlow;
  uniforms.night.value = env.nightness;
}
