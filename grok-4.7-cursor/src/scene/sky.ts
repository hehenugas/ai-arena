import * as THREE from "three";
import { clamp, smoothstep } from "../util";
import { surfaceHeight } from "./island";

export type SkySample = {
  zenith: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  ambient: THREE.Color;
  ground: THREE.Color;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  keyDir: THREE.Vector3;
  keyColor: THREE.Color;
  keyIntensity: number;
  ambientIntensity: number;
  hemiIntensity: number;
  exposure: number;
  night: number;
  sunGlow: number;
  moonGlow: number;
};

type Keyframe = {
  hour: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  ambient: THREE.Color;
  ground: THREE.Color;
  sunIntensity: number;
  ambientIntensity: number;
  hemiIntensity: number;
  exposure: number;
};

export type Sky = {
  group: THREE.Group;
  sample: SkySample;
  update: (hour: number, weatherMix: number, camera: THREE.Camera, elapsed: number, reduced: boolean) => void;
};

export function createSky(starCount: number): Sky {
  const sample = createSample();
  const keys = createKeys();
  const rainZenith = new THREE.Color("#596470");
  const rainHorizon = new THREE.Color("#7c756e");
  const moonLit = new THREE.Color("#c5d4f2");

  const uniforms = {
    uCamera: { value: new THREE.Vector3() },
    uZenith: { value: sample.zenith },
    uHorizon: { value: sample.horizon },
    uSunDir: { value: sample.sunDir },
    uMoonDir: { value: sample.moonDir },
    uSunGlow: { value: 1 },
    uMoonGlow: { value: 0 },
  };

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 20),
    new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        out vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        in vec3 vWorld;
        uniform vec3 uCamera;
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uMoonDir;
        uniform float uSunGlow;
        uniform float uMoonGlow;
        out vec4 fragColor;
        void main() {
          vec3 dir = normalize(vWorld - uCamera);
          float height = smoothstep(-0.015, 0.14, dir.y);
          vec3 col = mix(uHorizon, uZenith, height);
          float band = exp(-abs(dir.y) * 10.0);
          col += uHorizon * band * 0.08;
          float sun = pow(max(dot(dir, normalize(uSunDir)), 0.0), 90.0);
          float wide = pow(max(dot(dir, normalize(uSunDir)), 0.0), 7.0);
          col += vec3(1.0, 0.86, 0.68) * sun * uSunGlow;
          col += uHorizon * wide * uSunGlow * 0.28;
          float moon = pow(max(dot(dir, normalize(uMoonDir)), 0.0), 120.0);
          col += vec3(0.86, 0.91, 1.0) * moon * uMoonGlow;
          fragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  dome.frustumCulled = false;
  dome.renderOrder = -2;
  dome.raycast = () => undefined;

  const stars = createStars(starCount);
  const sun = createSprite("#fff1d2", 5.4, false);
  const moon = createSprite("#e7eeff", 3.3, true);

  const group = new THREE.Group();
  group.add(dome, stars.points, sun, moon);
  group.name = "sky";

  return {
    group,
    sample,
    update(hour, weatherMix, camera, elapsed, reduced) {
      evaluateSky(sample, keys, hour, weatherMix, rainZenith, rainHorizon, moonLit);
      uniforms.uCamera.value.copy(camera.position);
      uniforms.uSunGlow.value = sample.sunGlow;
      uniforms.uMoonGlow.value = sample.moonGlow;
      stars.material.uniforms.uOpacity.value = sample.night * (1 - weatherMix * 0.92) * 0.95;
      stars.material.uniforms.uTwinkle.value = reduced ? 0 : 1;
      stars.material.uniforms.uTime.value = reduced ? 0 : elapsed;
      sun.position.copy(sample.sunDir).multiplyScalar(58);
      sun.visible = sample.sunDir.y > -0.02 && weatherMix < 0.92;
      (sun.material as THREE.SpriteMaterial).opacity = 1 - weatherMix * 0.88;
      moon.position.copy(sample.moonDir).multiplyScalar(56);
      moon.visible = sample.moonDir.y > 0.04 && weatherMix < 0.82;
      (moon.material as THREE.SpriteMaterial).opacity = sample.night * (1 - weatherMix * 0.75);
    },
  };
}

function createSample(): SkySample {
  return {
    zenith: new THREE.Color("#86b7d8"),
    horizon: new THREE.Color("#f6d7b4"),
    sun: new THREE.Color("#ffe0bc"),
    ambient: new THREE.Color("#fff1e2"),
    ground: new THREE.Color("#6e8446"),
    sunDir: new THREE.Vector3(0, 1, 0),
    moonDir: new THREE.Vector3(0, 1, 0),
    keyDir: new THREE.Vector3(0, 1, 0),
    keyColor: new THREE.Color("#ffe0bc"),
    keyIntensity: 1.1,
    ambientIntensity: 0.46,
    hemiIntensity: 0.5,
    exposure: 1.02,
    night: 0,
    sunGlow: 1,
    moonGlow: 0,
  };
}

function createKeys(): Keyframe[] {
  const key = (
    hour: number,
    zenith: string,
    horizon: string,
    sun: string,
    ambient: string,
    ground: string,
    sunIntensity: number,
    ambientIntensity: number,
    hemiIntensity: number,
    exposure: number,
  ): Keyframe => ({
    hour,
    zenith: new THREE.Color(zenith),
    horizon: new THREE.Color(horizon),
    sun: new THREE.Color(sun),
    ambient: new THREE.Color(ambient),
    ground: new THREE.Color(ground),
    sunIntensity,
    ambientIntensity,
    hemiIntensity,
    exposure,
  });
  return [
    key(0, "#0d152b", "#1a2744", "#b9c8e6", "#6e82a8", "#1a140f", 0.02, 0.42, 0.46, 0.82),
    key(4.6, "#172038", "#6d4454", "#ffb08a", "#8a7388", "#1c1612", 0.08, 0.4, 0.42, 0.86),
    key(6.3, "#e7a48c", "#ffc7a2", "#ffd0a6", "#ffd2b8", "#5c4638", 0.78, 0.48, 0.5, 0.98),
    key(8.5, "#7eb6e4", "#d7eef8", "#fff6e8", "#f4f7fb", "#6d8a4e", 1.22, 0.42, 0.55, 1.02),
    key(12, "#62a8e2", "#e7f5fb", "#fffdf8", "#f7fbff", "#6a8a48", 1.38, 0.38, 0.52, 1.04),
    key(16, "#5ea0d4", "#f3c99a", "#ffe0bc", "#fff1e2", "#8a735c", 1.18, 0.46, 0.55, 1.02),
    key(18.3, "#3e628c", "#f39962", "#ff9a4e", "#ffc2a0", "#5a4034", 0.78, 0.42, 0.4, 1),
    key(19.7, "#1b2a4a", "#c45d4a", "#ffb088", "#c49a90", "#2a2018", 0.2, 0.4, 0.38, 0.9),
    key(21.5, "#10182e", "#243456", "#c5d4ef", "#7f92b4", "#16120e", 0.04, 0.46, 0.48, 0.84),
    key(24, "#0d152b", "#1a2744", "#b9c8e6", "#6e82a8", "#1a140f", 0.02, 0.42, 0.46, 0.82),
  ];
}

function evaluateSky(
  sample: SkySample,
  keys: Keyframe[],
  hour: number,
  weatherMix: number,
  rainZenith: THREE.Color,
  rainHorizon: THREE.Color,
  moonLit: THREE.Color,
): void {
  const h = ((hour % 24) + 24) % 24;
  let index = 0;
  while (index < keys.length - 2 && keys[index + 1].hour < h) index += 1;
  const a = keys[index];
  const b = keys[index + 1];
  const t = smoothstep(0, 1, (h - a.hour) / Math.max(0.0001, b.hour - a.hour));
  sample.zenith.copy(a.zenith).lerp(b.zenith, t);
  sample.horizon.copy(a.horizon).lerp(b.horizon, t);
  sample.sun.copy(a.sun).lerp(b.sun, t);
  sample.ambient.copy(a.ambient).lerp(b.ambient, t);
  sample.ground.copy(a.ground).lerp(b.ground, t);
  const sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
  sample.ambientIntensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, t);
  sample.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
  sample.exposure = THREE.MathUtils.lerp(a.exposure, b.exposure, t);

  sunDirection(h, sample.sunDir);
  sample.moonDir.copy(sample.sunDir).multiplyScalar(-1);
  sample.night = smoothstep(0.18, -0.06, sample.sunDir.y);

  sample.zenith.lerp(rainZenith, weatherMix * 0.7);
  sample.horizon.lerp(rainHorizon, weatherMix * 0.62);
  const wetSun = sunIntensity * (1 - weatherMix * 0.55);
  const moonIntensity = 0.46 * (1 - weatherMix * 0.3);
  if (sample.night < 0.5) {
    sample.keyDir.copy(sample.sunDir);
    sample.keyDir.y = Math.max(sample.keyDir.y, 0.17);
    sample.keyDir.normalize();
  } else {
    sample.keyDir.set(-sample.sunDir.x, 0.58, -sample.sunDir.z).normalize();
  }
  sample.keyColor.copy(sample.sun).lerp(moonLit, sample.night);
  sample.keyIntensity = THREE.MathUtils.lerp(wetSun, moonIntensity, sample.night);
  sample.ambientIntensity *= 1 + weatherMix * 0.06;
  sample.exposure *= 1 - weatherMix * 0.05;
  sample.sunGlow = Math.max(sample.sunDir.y, 0) * 1.2 * (1 - weatherMix * 0.82);
  sample.moonGlow = sample.night * (1 - weatherMix * 0.72) * 0.85;
}

function sunDirection(hour: number, target: THREE.Vector3): void {
  const day = (hour - 6) / 12;
  const wave = clamp(Math.sin(day * Math.PI), -1, 1);
  const elevation = Math.asin(wave);
  const azimuth = Math.PI / 2 - day * Math.PI;
  const horizontal = Math.cos(elevation);
  target.set(Math.sin(azimuth) * horizontal, Math.sin(elevation), Math.cos(azimuth) * horizontal).normalize();
}

function createStars(count: number): {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
} {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const y = 0.12 + Math.random() * 0.88;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const radius = 72;
    positions[i * 3] = Math.cos(theta) * ring * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * ring * radius;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uTwinkle: { value: 1 },
    },
    vertexShader: /* glsl */ `
      in float aPhase;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uTwinkle;
      out float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 34.0 / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv;
        float tw = mix(1.0, 0.62 + 0.38 * sin(uTime * 1.5 + aPhase), uTwinkle);
        vAlpha = uOpacity * tw;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      in float vAlpha;
      out vec4 fragColor;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) discard;
        float alpha = smoothstep(1.0, 0.2, d) * vAlpha;
        fragColor = vec4(vec3(1.0, 0.97, 0.9), alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -1;
  points.raycast = () => undefined;
  return { points, material };
}

function createSprite(color: string, scale: number, cool: boolean): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not paint the sun.");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (cool) {
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.22, "rgba(226,236,255,0.95)");
    gradient.addColorStop(0.5, "rgba(190,208,240,0.25)");
    gradient.addColorStop(1, "rgba(180,200,240,0)");
  } else {
    gradient.addColorStop(0, "rgba(255,250,236,1)");
    gradient.addColorStop(0.18, "rgba(255,220,170,0.95)");
    gradient.addColorStop(0.46, "rgba(255,176,110,0.28)");
    gradient.addColorStop(1, "rgba(255,160,90,0)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  sprite.raycast = () => undefined;
  return sprite;
}

export function createFireflies(): { group: THREE.Group; update: (elapsed: number, night: number, weatherMix: number, reduced: boolean) => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not paint fireflies.");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,220,1)");
  gradient.addColorStop(0.35, "rgba(214,240,140,0.8)");
  gradient.addColorStop(1, "rgba(180,220,90,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: "#dff3a4",
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });
  const spots = [
    [1.05, 0.78],
    [0.86, 0.96],
    [-0.35, 0.82],
    [-0.55, 1.02],
    [-1.42, 0.12],
    [1.28, 0.32],
    [0.15, -0.62],
    [1.55, -0.28],
    [-1.2, -0.55],
    [0.4, 1.15],
  ];
  const group = new THREE.Group();
  const sprites = spots.map((spot, index) => {
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.16, 0.16, 1);
    sprite.userData.baseX = spot[0];
    sprite.userData.baseZ = spot[1];
    sprite.userData.phase = index * 0.7;
    sprite.position.set(spot[0], surfaceHeight(spot[0], spot[1]) + 0.38, spot[1]);
    sprite.raycast = () => undefined;
    group.add(sprite);
    return sprite;
  });
  return {
    group,
    update(elapsed, night, weatherMix, reduced) {
      material.opacity = smoothstep(0.42, 0.78, night) * (1 - weatherMix * 0.7) * 0.8;
      for (const sprite of sprites) {
        const x = sprite.userData.baseX as number;
        const z = sprite.userData.baseZ as number;
        const phase = sprite.userData.phase as number;
        if (reduced) {
          sprite.position.set(x, surfaceHeight(x, z) + 0.38, z);
          continue;
        }
        const angle = elapsed * 0.55 + phase;
        sprite.position.set(
          x + Math.cos(angle) * 0.1,
          surfaceHeight(x, z) + 0.36 + Math.sin(angle * 1.4) * 0.07,
          z + Math.sin(angle) * 0.08,
        );
      }
    },
  };
}
