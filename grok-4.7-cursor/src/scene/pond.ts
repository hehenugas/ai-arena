import * as THREE from "three";
import { POND } from "./layout";
import { surfaceHeight } from "./island";
import type { Materials } from "./materials";
import type { SkySample } from "./sky";

export type Pond = {
  group: THREE.Group;
  update: (elapsed: number, dt: number, weatherMix: number, sky: SkySample, reduced: boolean) => void;
};

type Ripple = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  active: boolean;
};

export function createPond(materials: Materials): Pond {
  const group = new THREE.Group();
  group.name = "pond";
  const y = surfaceHeight(POND.x, POND.z);
  group.position.set(POND.x, y, POND.z);

  const shallows = new THREE.Mesh(new THREE.CircleGeometry(1, 36), materials.wetSand);
  shallows.rotation.x = -Math.PI / 2;
  shallows.scale.set(POND.rx * 0.98, POND.rz * 0.98, 1);
  shallows.position.y = 0.01;
  shallows.receiveShadow = true;
  group.add(shallows);

  const lip = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.08, 40), materials.sand);
  lip.rotation.x = -Math.PI / 2;
  lip.scale.set(POND.rx, POND.rz, 1);
  lip.position.y = 0.018;
  lip.receiveShadow = true;
  group.add(lip);

  const uniforms = {
    uTime: { value: 0 },
    uRain: { value: 0 },
    uShallow: { value: new THREE.Color("#8ec4d4") },
    uDeep: { value: new THREE.Color("#3d7c98") },
    uReflect: { value: new THREE.Color("#f3d7b4") },
  };

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        in vec2 vUv;
        uniform float uTime;
        uniform float uRain;
        uniform vec3 uShallow;
        uniform vec3 uDeep;
        uniform vec3 uReflect;
        out vec4 fragColor;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float wave = sin(p.x * 18.0 + uTime * 1.15) * sin(p.y * 15.0 - uTime * 0.9);
          float ring = sin(r * 24.0 - uTime * (1.15 + uRain * 2.4));
          float n = wave * 0.45 + ring * (0.18 + uRain * 0.85);
          float shore = smoothstep(0.15, 0.95, r);
          vec3 col = mix(uDeep, uShallow, shore);
          col = mix(col, uReflect, 0.16 + shore * 0.08);
          col += n * (0.02 + uRain * 0.05);
          float alpha = smoothstep(1.05, 0.72, r) * 0.94;
          fragColor = vec4(col, alpha);
        }
      `,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(POND.rx * 0.74, POND.rz * 0.74, 1);
  water.position.y = 0.04;
  water.renderOrder = 2;
  water.raycast = () => undefined;
  group.add(water);

  const padGeo = new THREE.CircleGeometry(0.11, 10);
  const pads: Array<[number, number, number]> = [
    [0.16, 0.06, 0.4],
    [-0.14, 0.12, 1.2],
    [0.02, -0.16, 2.4],
  ];
  for (const [x, z, rot] of pads) {
    const pad = new THREE.Mesh(padGeo, materials.pad);
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = rot;
    pad.position.set(x, 0.055, z);
    pad.receiveShadow = true;
    group.add(pad);
  }
  const blossom = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 6, 5),
    new THREE.MeshStandardMaterial({ color: "#f0d48a", roughness: 0.55, metalness: 0 }),
  );
  blossom.position.set(0.2, 0.07, 0.08);
  group.add(blossom);

  const stalkGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.34, 4);
  const tipGeo = new THREE.ConeGeometry(0.02, 0.12, 4);
  const reedAngles = [2.15, 2.55, 2.95, 3.4, -2.55, -2.15];
  for (const angle of reedAngles) {
    const x = Math.cos(angle) * POND.rx * 0.78;
    const z = Math.sin(angle) * POND.rz * 0.78;
    const stalk = new THREE.Mesh(stalkGeo, materials.reed);
    stalk.position.set(x, 0.18, z);
    stalk.rotation.z = Math.cos(angle) * 0.12;
    stalk.castShadow = true;
    const tip = new THREE.Mesh(tipGeo, materials.leafDark);
    tip.position.set(x, 0.38, z);
    group.add(stalk, tip);
  }

  const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2 + 0.4;
    const pebble = new THREE.Mesh(pebbleGeo, materials.rockChunk);
    const radius = 0.08 + (i % 3) * 0.025;
    pebble.scale.setScalar(radius);
    pebble.position.set(Math.cos(angle) * POND.rx * 0.98, 0.02, Math.sin(angle) * POND.rz * 0.98);
    pebble.rotation.set(i, angle, i * 0.3);
    pebble.castShadow = true;
    pebble.receiveShadow = true;
    group.add(pebble);
  }

  const dockYaw = Math.atan2(0.62 - POND.x, 0.0 - POND.z);
  const dock = new THREE.Group();
  dock.rotation.y = dockYaw;
  dock.position.set(POND.rx * 0.42, 0.045, -POND.rz * 0.08);
  const plankGeo = new THREE.BoxGeometry(0.16, 0.03, 0.42);
  for (let i = 0; i < 3; i += 1) {
    const plank = new THREE.Mesh(plankGeo, materials.wood);
    plank.position.set((i - 1) * 0.18, 0.04, 0.12);
    plank.castShadow = true;
    plank.receiveShadow = true;
    dock.add(plank);
  }
  const postGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.16, 5);
  for (const x of [-0.18, 0.18]) {
    const post = new THREE.Mesh(postGeo, materials.woodDark);
    post.position.set(x, -0.02, 0.28);
    dock.add(post);
  }
  group.add(dock);

  const rippleGeo = new THREE.RingGeometry(0.16, 0.2, 24);
  const ripples: Ripple[] = [];
  for (let i = 0; i < 8; i += 1) {
    const material = materials.ripple.clone();
    material.opacity = 0;
    const mesh = new THREE.Mesh(rippleGeo, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.06;
    mesh.visible = false;
    mesh.renderOrder = 3;
    mesh.raycast = () => undefined;
    group.add(mesh);
    ripples.push({ mesh, material, life: 1, active: false });
  }

  let spawn = 0.4;
  const baseShallow = new THREE.Color("#7ebbd0");
  const baseDeep = new THREE.Color("#2f6f8c");
  const nightShallow = new THREE.Color("#3d6278");
  const nightDeep = new THREE.Color("#163044");

  return {
    group,
    update(elapsed, dt, weatherMix, sky, reduced) {
      uniforms.uTime.value = elapsed * (reduced ? 0.35 : 1);
      uniforms.uRain.value = weatherMix;
      uniforms.uShallow.value.copy(baseShallow).lerp(nightShallow, sky.night).lerp(sky.horizon, 0.22);
      uniforms.uDeep.value.copy(baseDeep).lerp(nightDeep, sky.night).lerp(sky.zenith, 0.28);
      uniforms.uReflect.value.copy(sky.horizon);

      const rate = reduced ? 0.25 + weatherMix * 1.15 : 0.35 + weatherMix * 2.5;
      spawn = Math.min(2, spawn + dt * rate);
      while (spawn > 1) {
        spawn -= 1;
        triggerRipple(ripples);
      }

      const lifeStep = dt * (reduced ? 0.28 : 0.42 + weatherMix * 0.2);
      for (const ripple of ripples) {
        if (!ripple.active) continue;
        ripple.life += lifeStep;
        if (ripple.life >= 1) {
          ripple.active = false;
          ripple.mesh.visible = false;
          continue;
        }
        const scale = 0.25 + ripple.life * (0.7 + weatherMix * 0.55);
        ripple.mesh.scale.set(scale, scale, scale);
        ripple.material.opacity = (1 - ripple.life) * (0.14 + weatherMix * 0.38);
      }
    },
  };
}

function triggerRipple(ripples: Ripple[]): void {
  const slot = ripples.find((ripple) => !ripple.active);
  if (!slot) return;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * 0.55;
  slot.mesh.position.set(Math.cos(angle) * POND.rx * radius, 0.06, Math.sin(angle) * POND.rz * radius);
  slot.life = 0;
  slot.active = true;
  slot.mesh.visible = true;
  slot.mesh.scale.setScalar(0.2);
}
