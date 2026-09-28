import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { makeRandom } from '../core/utils';
import { POND, terrainHeight } from './terrain';

const RINGS = 10;
const SEGMENTS = 56;

function makeDiscGeometry(): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];
  for (let r = 1; r <= RINGS; r++) {
    const radius = (r / RINGS) * POND.radius * 1.02;
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
  }
  for (let s = 0; s < SEGMENTS; s++) {
    const a = 1 + s;
    const b = 1 + ((s + 1) % SEGMENTS);
    indices.push(0, b, a);
  }
  for (let r = 0; r < RINGS - 1; r++) {
    const inner = 1 + r * SEGMENTS;
    const outer = 1 + (r + 1) * SEGMENTS;
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS;
      indices.push(inner + s, outer + s1, outer + s);
      indices.push(inner + s, inner + s1, outer + s1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export interface Pond {
  group: THREE.Group;
  update(
    dt: number,
    elapsed: number,
    rain: number,
    wind: number,
    motion: number,
    sky: THREE.Color,
  ): void;
}


/** The pond: a gently waving surface, rain ripples, reeds and lily pads. */
export function createPond(): Pond {
  const group = new THREE.Group();
  group.position.set(POND.x, POND.level, POND.z);

  const uniforms = { uTime: { value: 0 }, uRain: { value: 0 } };
  const waterMat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.16,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uRain = uniforms.uRain;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uRain;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float ripple = sin(position.x * 4.0 + uTime * 1.5) * cos(position.y * 3.2 - uTime * 1.1);
         float swell = sin(length(position) * 6.0 - uTime * 2.2);
         transformed.z += (ripple * 0.011 + swell * 0.004) * (1.0 + uRain * 1.4);`,
      );
  };

  const water = new THREE.Mesh(makeDiscGeometry(), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = true;
  group.add(water);

  // --- pooled rain ripples ---------------------------------------------
  const rand = makeRandom(5150);
  const rippleGeo = new THREE.RingGeometry(0.82, 1, 26);
  const ripples: { mesh: THREE.Mesh; life: number; x: number; z: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xdff0f6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(rippleGeo, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.012;
    mesh.visible = false;
    group.add(mesh);
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * POND.radius * 0.82;
    ripples.push({ mesh, life: -rand(), x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  let cursor = 0;
  let spawnTimer = 0;


  // --- lilies + reeds ---------------------------------------------------
  const padMat = new THREE.MeshStandardMaterial({ color: 0x4f7f45, roughness: 0.85, flatShading: true });
  const pads: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.25 + rand() * (POND.radius * 0.55);
    const size = 0.11 + rand() * 0.07;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(size, 12), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(Math.cos(a) * r, 0.014, Math.sin(a) * r);
    pad.receiveShadow = true;
    group.add(pad);
    pads.push(pad);
  }

  const reedMat = new THREE.MeshStandardMaterial({ color: 0x5d7a42, roughness: 1, flatShading: true });
  const reeds = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const r = POND.radius * (0.92 + rand() * 0.12);
    const x = POND.x + Math.cos(a) * r;
    const z = POND.z + Math.sin(a) * r;
    for (let j = 0; j < 4; j++) {
      const h = 0.2 + rand() * 0.2;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, h, 4), reedMat);
      stalk.position.set(
        x + (rand() - 0.5) * 0.12,
        terrainHeight(x, z) + h / 2 - 0.02,
        z + (rand() - 0.5) * 0.12,
      );
      stalk.rotation.z = (rand() - 0.5) * 0.35;
      stalk.castShadow = true;
      reeds.add(stalk);
    }
  }
  group.add(reeds);

  return {
    group,
    update(dt, elapsed, rain, wind, motion, sky) {
      uniforms.uTime.value = elapsed;
      uniforms.uRain.value = rain * motion;
      waterMat.opacity = 0.9 + rain * 0.05;
      // A little sky in the water stands in for a reflection probe.
      waterMat.emissive.copy(sky).multiplyScalar(0.22 + rain * 0.05);

      for (const pad of pads) {
        pad.position.y = 0.014 + Math.sin(elapsed * 0.9 + pad.position.x * 3) * 0.006 * (0.4 + wind) * motion;
      }
      reeds.rotation.y = Math.sin(elapsed * 0.8) * 0.02 * wind * motion;

      // Ripples only advance while it rains, so none linger once it clears.
      spawnTimer -= dt;
      if (rain > 0.05 && spawnTimer <= 0) {
        spawnTimer = 0.06 / rain;
        for (let i = 0; i < 2; i++) {
          const drop = ripples[cursor];
          cursor = (cursor + 1) % ripples.length;
          const a = rand() * Math.PI * 2;
          const r = Math.sqrt(rand()) * POND.radius * 0.85;
          drop.x = Math.cos(a) * r;
          drop.z = Math.sin(a) * r;
          drop.life = 0;
          drop.mesh.visible = true;
        }
      }

      for (const drop of ripples) {
        if (!drop.mesh.visible) continue;
        drop.life += dt;
        const t = drop.life / 1.1;
        if (t >= 1 || rain < 0.02) {
          drop.mesh.visible = false;
          drop.life = -rand();
          continue;
        }
        drop.mesh.scale.setScalar(0.04 + t * 0.26);
        drop.mesh.position.set(drop.x, 0.012, drop.z);
        (drop.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.45 * rain;
      }
    },
  };
}
