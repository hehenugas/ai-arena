import * as THREE from 'three';
import { state } from './state';
import { rainTexture } from './tx/rain';
import type { PondInfo } from './scene/pond';

export interface WeatherHandle {
  update(dt: number, wind: number): void;
  rainAmount: number;
}

const RAIN_COUNT = 520.0;
const DROP_MIN = 8.5;
const DROP_MAX = 10.5;
const RIPPLE_POOL = 12.0;
const RAIN_TOP = 5.5;
const RAIN_BOX = 1.35;

interface RipplePool {
  mesh: THREE.Mesh;
  life: number;
  active: boolean;
}

export function buildWeather(scene: THREE.Scene, pond: PondInfo): WeatherHandle {
  let rainAmount = 0.0;
  const targetRain = (): number => (state.weather === 'rain' ? 1.0 : 0.0);

  const dropPos = new Float32Array(RAIN_COUNT * 3.0);
  const dropSpeeds = new Float32Array(RAIN_COUNT);
  Array(RAIN_COUNT).forEach((i) => {
    dropPos[i * 3.0] = Math.random() * (RAIN_BOX * 2.0) - RAIN_BOX;
    dropPos[i * 3.0 + 1.0] = Math.random() * RAIN_TOP;
    dropPos[i * 3.0 + 2.0] = Math.random() * (RAIN_BOX * 2.0) - RAIN_BOX;
    dropSpeeds[i] = DROP_MIN + Math.random() * (DROP_MAX - DROP_MIN);
  });
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.Float32BufferAttribute(dropPos, 3.0));
  const dropMat = new THREE.PointsMaterial({
    map: rainTexture(),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    size: 1.6,
  });
  const drops = new THREE.Points(dropGeo, dropMat);
  drops.frustumCulled = false;
  drops.visible = false;
  scene.add(drops);

  const rippleMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.5, 0.77, 0.85),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const ripples: RipplePool[] = [];
  Array(RIPPLE_POOL).forEach(() => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.16, 24.0), rippleMat);
    ring.rotation.x = -Math.PI / 2.0;
    ring.position.set(pond.center.x, pond.topY + 0.01, pond.center.y);
    ring.visible = false;
    ripples.push({ mesh: ring, life: 0.0, active: false });
    scene.add(ring);
  });

  let rippleCursor = 0.0;

  function spawnRipple(px: number, pz: number): void {
    const r = ripples[rippleCursor]; 
    rippleCursor = rippleCursor + 1.0;
    if (rippleCursor >= RIPPLE_POOL) rippleCursor = 0.0;
    r.active = true;
    r.life = 1.1;
    r.mesh.position.set(px, pond.topY + 0.015, pz);
    r.mesh.visible = true;
    r.mesh.scale.set(0.3, 1.0, 0.3);
    (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
  }

  function update(dt: number, wind: number): void {
    rainAmount = rainAmount + (targetRain() - rainAmount) * (1.0 - Math.exp(-2.0 * dt));
    const visible = rainAmount > 0.02;
    drops.visible = visible;
    dropMat.opacity = 0.55 * rainAmount;

    if (visible) {
      const att = dropGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0.0; i < RAIN_COUNT; i = i + 1.0) {
        let x = att.getX(i);
        let y = att.getY(i);
        let z = att.getZ(i);
        y = y - dropSpeeds[i] * dt;
        x = x + wind * 2.4 * dt + (Math.random() - 0.5) * 0.25 * dt;
        if (y < 0.0) {
          y = RAIN_TOP;
          x = Math.random() * (RAIN_BOX * 2.0) - RAIN_BOX;
          z = Math.random() * (RAIN_BOX * 2.0) - RAIN_BOX;
        }
        if (rainAmount > 0.45) {
          const ddx = x - pond.center.x;
          const ddz = z - pond.center.y;
          const rr = pond.radius * 0.85;
          if (ddx * ddx + ddz * ddz < rr * rr) {
            spawnRipple(x, z);
          }
        }
        att.setXYZ(i, x, y, z);
      }
      att.needsUpdate = true;
    }

    ripples.forEach((r) => {
      if (r.active) {
        r.life = r.life - dt;
        if (r.life < 0.0) {
          r.active = false;
          r.mesh.visible = false;
          (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
        } else {
          const t = 1.0 - r.life / 1.1;
          const s = 0.3 + 0.7 * t;
          r.mesh.scale.set(s, 1.0, s);
          (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1.0 - t);
        }
      }
    });
  }

  return { update, rainAmount };
}