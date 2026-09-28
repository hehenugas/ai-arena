import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { makeRandom } from '../core/utils';

const CLOUDS = 16;
/**
 * Clouds live in a ring around the viewer so one can never loom over the lens.
 * The ring starts well past the far dolly limit, and the band sits just above the
 * island rim: that is the only strip of open sky the framing actually shows.
 */
const NEAR = 24;
const FAR = 36;
/**
 * The camera orbits at eye height ~2.7 while looking down at the island, which
 * puts the horizon high in frame and leaves the whole mid-band as *below* the
 * horizon. Clouds live just under eye level so they land in that open band
 * instead of clipping the top edge or hiding behind the island.
 */
const LOW = -1.6;
const HIGH = 2.2;

export interface Clouds {
  group: THREE.Group;
  /** Keeps the cloud ring centred on the viewer so none can drift into frame. */
  follow(x: number, z: number): void;
  update(dt: number, elapsed: number, wind: number, rain: number, motion: number): void;
}

/** Chunky low-poly clouds that drift, wrap around, and bruise when it rains. */
export function createClouds(quality: 'low' | 'high' = 'high'): Clouds {
  const group = new THREE.Group();
  const rand = makeRandom(773311);
  // Enough puffs to fill the ring at the camera's narrow field of view, but the
  // lean build trims the tail: each puff is its own draw call.
  const count = quality === 'low' ? 11 : CLOUDS;
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.cloud,
    roughness: 1,
    flatShading: true,
  });
  const stormColor = new THREE.Color(PALETTE.cloudStorm);
  const fairColor = new THREE.Color(PALETTE.cloud);
  const blobGeo = new THREE.IcosahedronGeometry(1, 0);
  const slots: { angle: number; radius: number; y: number; scale: number; speed: number }[] = [];

  for (let i = 0; i < count; i++) {
    const cloud = new THREE.Group();
    const puffCount = 4 + Math.floor(rand() * 3);
    for (let p = 0; p < puffCount; p++) {
      // Centre puffs are the tallest and end puffs the smallest. That dome is
      // what separates a puffy cumulus from a flat grey bar.
      const fromCentre = Math.abs(p - (puffCount - 1) / 2) / ((puffCount - 1) / 2);
      const r = (0.46 + rand() * 0.34) * (1 - fromCentre * 0.38);
      const puff = new THREE.Mesh(blobGeo, material);
      puff.position.set(
        (p - (puffCount - 1) / 2) * (0.5 + rand() * 0.16) + (rand() - 0.5) * 0.18,
        (1 - fromCentre * fromCentre) * 0.26 + (rand() - 0.5) * 0.12,
        (rand() - 0.5) * 0.44,
      );
      // Wider than tall, but only mildly: too flat and the row reads as a bar.
      puff.scale.set(r * 1.15, r * 0.85, r);
      cloud.add(puff);
    }
    // Scaled up because the ring now sits well beyond the island: a puff has to
    // be wide enough to still read as a cloud at that distance, but not so wide
    // that it swallows the frame.
    const scale = 0.85 + rand() * 0.55;
    cloud.scale.setScalar(scale);
    // Evenly spread around the ring, offset per cloud, so the sky is never empty.
    // The y jitter is wide on purpose: clouds sharing one altitude band merge
    // into a single grey mass instead of reading as separate clouds.
    const slot = {
      angle: (i / count) * Math.PI * 2 + rand() * 0.5,
      radius: NEAR + rand() * (FAR - NEAR),
      y: LOW + rand() * (HIGH - LOW),
      scale,
      speed: 0.6 + rand() * 0.7,
    };
    slots.push(slot);
    group.add(cloud);
  }

  return {
    group,
    follow(x, z) {
      group.position.set(x, 0, z);
    },
    update(dt, elapsed, wind, rain, motion) {
      material.color.copy(fairColor).lerp(stormColor, rain * 0.85);
      const drift = (0.05 + wind * 0.6) * motion;
      for (let i = 0; i < count; i++) {
        const cloud = group.children[i] as THREE.Group;
        const slot = slots[i];
        slot.angle += (drift * slot.speed * dt) / Math.max(6, slot.radius);
        if (slot.angle > Math.PI * 2) slot.angle -= Math.PI * 2;
        const breathe = 1 + Math.sin(elapsed * 0.25 + i) * 0.02 * motion;
        cloud.position.set(
          Math.cos(slot.angle) * slot.radius,
          slot.y - rain * 0.6,
          Math.sin(slot.angle) * slot.radius,
        );
        cloud.scale.setScalar(slot.scale * (1 + rain * 0.12) * breathe);
        cloud.rotation.y = -slot.angle + Math.PI / 2;
      }
    },
  };
}
