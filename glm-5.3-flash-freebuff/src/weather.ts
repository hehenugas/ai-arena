import * as THREE from 'three';
import { QUALITY } from './state';
import { disposeObject } from './geometry';

export interface WeatherFx {
  group: THREE.Group;
  /** Called every frame with smoothed rain amount 0..1 and wind 0..1. */
  update(dt: number, elapsed: number, rain: number, wind: number): void;
  dispose(): void;
}

const POND_X = 9.5;
const POND_Z = 7.5;
const POND_R = 5.6;

export function buildWeather(): WeatherFx {
  const group = new THREE.Group();

  /* ================= rain ================= */
  // Pooled line-segment particles: streaks of rain recycled from a top box to
  // below the island. Wind slants the whole rain volume.
  const count = QUALITY === 'high' ? 1100 : 550;
  const rainPos = new Float32Array(count * 6); // 2 vertices per streak
  const rainVel = new Float32Array(count);
  const AREA = 46; // spawn box half-width
  const TOP = 34;
  const BOTTOM = -30;

  const rng = Math.random;
  const resetDrop = (i: number, randomY = true): void => {
    const x = (rng() - 0.5) * AREA * 2;
    const z = (rng() - 0.5) * AREA * 2;
    const y = randomY ? BOTTOM + rng() * (TOP - BOTTOM) : TOP;
    const len = 1.1 + rng() * 1.4;
    const speed = 26 + rng() * 10;
    rainVel[i] = speed;
    const o = i * 6;
    rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
    rainPos[o + 3] = x; rainPos[o + 4] = y - len; rainPos[o + 5] = z;
  };
  for (let i = 0; i < count; i++) resetDrop(i);

  const rainGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(rainPos, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  rainGeo.setAttribute('position', posAttr);

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xa8c8e8,
    transparent: true,
    opacity: 0,
    fog: true,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.visible = false;
  group.add(rain);

  /* ================= pond ripples ================= */
  // Pool of expanding rings on the water surface.
  const RIPPLES = QUALITY === 'high' ? 22 : 12;
  const rippleGeo = new THREE.RingGeometry(0.14, 0.2, 22);
  rippleGeo.rotateX(-Math.PI / 2);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xdff2ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  interface Ripple {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    active: boolean;
  }
  const ripples: Ripple[] = [];
  for (let i = 0; i < RIPPLES; i++) {
    const m = new THREE.Mesh(rippleGeo, rippleMat);
    m.visible = false;
    m.position.set(POND_X, 0.68, POND_Z);
    group.add(m);
    ripples.push({ mesh: m, life: 0, maxLife: 1, active: false });
  }

  let rippleTimer = 0;

  const api: WeatherFx = {
    group,

    update(dt: number, _elapsed: number, rainAmt: number, wind: number) {
      // ---- rain ----
      rainMat.opacity = rainAmt * 0.42;
      rain.visible = rainAmt > 0.02;

      if (rain.visible) {
        const slant = wind * 9; // horizontal drift shared with clouds/trees
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < count; i++) {
          const o = i * 6;
          const fall = rainVel[i] * dt;
          arr[o + 1] -= fall;
          arr[o + 4] -= fall;
          arr[o] += slant * dt;
          arr[o + 3] += slant * dt;
          if (arr[o + 4] < BOTTOM - 2 || arr[o] > AREA + 8) {
            resetDrop(i, false);
          }
        }
        posAttr.needsUpdate = true;
      }

      // ---- ripples ----
      if (rainAmt > 0.05) {
        rippleTimer -= dt;
        if (rippleTimer <= 0) {
          rippleTimer = 0.09 + Math.random() * 0.08;
          const r = ripples.find((x) => !x.active);
          if (r) {
            const ang = Math.random() * Math.PI * 2;
            const rr = Math.sqrt(Math.random()) * POND_R * 0.85;
            r.mesh.position.set(POND_X + Math.cos(ang) * rr, 0.68, POND_Z + Math.sin(ang) * rr);
            r.life = 0;
            r.maxLife = 0.9 + Math.random() * 0.5;
            r.active = true;
            r.mesh.visible = true;
          }
        }
      }

      for (const r of ripples) {
        if (!r.active) continue;
        r.life += dt;
        const t = r.life / r.maxLife;
        if (t >= 1) {
          r.active = false;
          r.mesh.visible = false;
          continue;
        }
        const s = 1 + t * 5.5;
        r.mesh.scale.set(s, 1, s);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = rainAmt * (1 - t) * 0.5;
      }
    },

    dispose() {
      disposeObject(group);
      rainGeo.dispose();
      rippleGeo.dispose();
    },
  };

  return api;
}
