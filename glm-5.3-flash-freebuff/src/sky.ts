import * as THREE from 'three';
import { TINTS } from './palette';
import { makeNoise2D, makeRng, disposeObject } from './geometry';

export interface SkyDome {
  group: THREE.Group;
  setColors(zenith: number, horizon: number, fog: number, dusk: number): void;
  setStorm(storm: number): void;
  setStarOpacity(o: number): void;
  setSunPos(worldPos: THREE.Vector3): void;
  setSunOpacity(o: number): void;
  setSunColor(c: number): void;
  setSunScale(s: number): void;
  setMoonPos(worldPos: THREE.Vector3): void;
  setMoonOpacity(o: number): void;
  /** Drift clouds; shared wind, dt seconds, monotonic elapsed. */
  updateClouds(wind: number, dt: number, elapsed: number, reducedMotion: boolean): void;
  dispose(): void;
}

export function buildSky(
  radialTex: THREE.Texture,
  _cloudTex: THREE.Texture,
): SkyDome {
  const group = new THREE.Group();

  // ---- dome ----
  const R = 400;
  const domeGeo = new THREE.SphereGeometry(R, 40, 22);
  const domeMat = new THREE.MeshBasicMaterial({
    map: null,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -10;
  group.add(dome);

  // ---- sun & moon ----
  const discGeo = new THREE.CircleGeometry(13, 40);
  const sunMat = new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false });
  const sun = new THREE.Mesh(discGeo, sunMat);
  sun.renderOrder = -9;
  group.add(sun);

  const sunGlowMat = new THREE.SpriteMaterial({
    map: radialTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const sunGlow = new THREE.Sprite(sunGlowMat);
  sunGlow.scale.setScalar(95);
  sunGlow.renderOrder = -9;
  group.add(sunGlow);

  const moonMat = new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false });
  const moon = new THREE.Mesh(discGeo, moonMat);
  moon.renderOrder = -9;
  group.add(moon);

  const moonGlowMat = new THREE.SpriteMaterial({
    map: radialTex,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const moonGlow = new THREE.Sprite(moonGlowMat);
  moonGlow.scale.setScalar(55);
  group.add(moonGlow);

  // ---- stars ----
  const starCount = 340;
  const starPos = new Float32Array(starCount * 3);
  const rng = makeRng(777);
  for (let i = 0; i < starCount; i++) {
    // upper hemisphere shell
    const az = rng() * Math.PI * 2;
    const el = Math.asin(rng() * 0.92 + 0.06);
    const r = R * 0.88;
    starPos[i * 3] = Math.cos(el) * Math.cos(az) * r;
    starPos[i * 3 + 1] = Math.sin(el) * r;
    starPos[i * 3 + 2] = Math.cos(el) * Math.sin(az) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.6,
    map: radialTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    color: 0xdfe8ff,
    sizeAttenuation: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -8;
  group.add(stars);

  // ---- clouds ----
  interface Cloud {
    group: THREE.Group;
    speed: number;
    bobPhase: number;
    bobAmp: number;
    radius: number;
    baseY: number;
  }
  const clouds: Cloud[] = [];
  const cloudGroup = new THREE.Group();
  group.add(cloudGroup);

  const cloudMat = new THREE.MeshLambertMaterial({ color: TINTS.cloud[0], transparent: true, opacity: 0.95, fog: false });
  const cloudShadeMat = new THREE.MeshLambertMaterial({ color: TINTS.cloudShade[0], transparent: true, opacity: 0.9, fog: false });

  const puffGeo = new THREE.SphereGeometry(1, 14, 10);
  const noise = makeNoise2D(99);

  const mkCloud = (x: number, y: number, z: number, scale: number, seedIdx: number): Cloud => {
    const g = new THREE.Group();
    const puffs = 5 + Math.floor(noise(seedIdx, 3) * 4);
    for (let i = 0; i < puffs; i++) {
      const px = (noise(seedIdx + i * 0.7, 11) - 0.5) * 2.6;
      const py = (noise(seedIdx + i * 0.7, 23) - 0.5) * 0.7;
      const pz = (noise(seedIdx + i * 0.7, 37) - 0.5) * 1.3;
      const s = (0.55 + noise(seedIdx + i * 0.7, 51) * 0.75) * scale;
      const mat = i % 3 === 2 ? cloudShadeMat : cloudMat;
      const m = new THREE.Mesh(puffGeo, mat);
      m.position.set(px, py, pz);
      m.scale.set(s * 1.25, s * 0.75, s);
      m.rotation.y = noise(seedIdx + i, 61) * Math.PI;
      g.add(m);
    }
    g.position.set(x, y, z);
    cloudGroup.add(g);
    const cloud: Cloud = {
      group: g,
      speed: 0.55 + noise(seedIdx, 71) * 0.9,
      bobPhase: noise(seedIdx, 83) * Math.PI * 2,
      bobAmp: 0.6 + noise(seedIdx, 97) * 1.2,
      radius: Math.hypot(x, z),
      baseY: y,
    };
    clouds.push(cloud);
    return cloud;
  };

  // All clouds stay well away from the camera corridor: the low ones float
  // BELOW the island (floating-island look), the high ones are far out so they
  // render small. Nothing drifts through the default view.
  mkCloud(-44, -12, 26, 7.5, 1);
  mkCloud(50, -16, -20, 8.5, 2);
  mkCloud(-14, -24, -50, 6.5, 3);
  mkCloud(30, -14, 44, 5.5, 4);
  mkCloud(-62, -18, -14, 7, 5);
  mkCloud(8, -30, -66, 5, 6);
  mkCloud(0, 48, -95, 7, 7);
  mkCloud(-88, 44, -60, 6, 8);
  mkCloud(92, 52, -48, 6.5, 9);
  mkCloud(-95, 40, 40, 7, 10);

  const api: SkyDome = {
    group,

    setColors(zenith: number, horizon: number, fog: number, dusk: number) {
      const old = domeMat.map;
      domeMat.map = skyTextureFor(zenith, horizon, fog, dusk);
      if (old && old !== domeMat.map) old.dispose();
      domeMat.needsUpdate = true;
    },

    setStorm(s: number) {
      const dark = new THREE.Color(TINTS.cloud[0]).lerp(new THREE.Color(0x5d687e), s * 0.75);
      cloudMat.color.copy(dark);
      const dark2 = new THREE.Color(TINTS.cloudShade[0]).lerp(new THREE.Color(0x4a5568), s * 0.75);
      cloudShadeMat.color.copy(dark2);
      cloudMat.opacity = 0.95;
    },

    setStarOpacity(o: number) {
      starMat.opacity = o;
    },

    setSunPos(p: THREE.Vector3) {
      const d = p.clone().normalize().multiplyScalar(R * 0.86);
      sun.position.copy(d);
      sun.lookAt(0, 0, 0);
      sunGlow.position.copy(d);
    },

    setSunOpacity(o: number) {
      sunMat.opacity = o;
      sunGlowMat.opacity = o * 0.55;
    },

    setSunColor(c: number) {
      sunMat.color.setHex(c);
      sunGlowMat.color.setHex(c);
    },

    setSunScale(s: number) {
      sun.scale.setScalar(s);
      sunGlow.scale.setScalar(95 * s);
    },

    setMoonPos(p: THREE.Vector3) {
      const d = p.clone().normalize().multiplyScalar(R * 0.86);
      moon.position.copy(d);
      moon.lookAt(0, 0, 0);
      moonGlow.position.copy(d);
    },

    setMoonOpacity(o: number) {
      moonMat.opacity = o;
      moonGlowMat.opacity = o * 0.22;
    },

    dispose() {
      disposeObject(group);
      domeGeo.dispose();
      discGeo.dispose();
      puffGeo.dispose();
      starGeo.dispose();
    },

    // ---- cloud animation driven by shared wind ----
    updateClouds(wind: number, dt: number, elapsed: number, reducedMotion: boolean) {
      for (const c of clouds) {
        const speed = c.speed * (0.25 + wind * 2.6);
        if (!reducedMotion) {
          c.group.position.x += speed * dt;
          // wrap around a large ring
          if (c.group.position.x > 95) c.group.position.x = -95;
          if (c.group.position.x < -95) c.group.position.x = 95;
          c.group.position.y =
            c.baseY + Math.sin(elapsed * 0.24 + c.bobPhase) * c.bobAmp * (0.3 + wind);
          c.group.rotation.y += dt * 0.01 * wind;
        }
      }
    },
  };

  return api;
}

/* ---------- sky gradient texture cache ---------- */
const texCache = new Map<string, THREE.CanvasTexture>();

function skyTextureFor(
  zenith: number,
  horizon: number,
  fog: number,
  dusk: number,
): THREE.CanvasTexture {
  // rebuild at most ~4 times per second worth of unique colors; cache by rounded key
  const q = (n: number): number => Math.round(n / 4) * 4;
  const zc = new THREE.Color(zenith);
  const hc = new THREE.Color(horizon);
  const fc = new THREE.Color(fog);
  const key = `${q(zc.r * 255)},${q(zc.g * 255)},${q(zc.b * 255)}|${q(hc.r * 255)},${q(hc.g * 255)},${q(hc.b * 255)}|${q(fc.r * 255)},${q(fc.g * 255)},${q(fc.b * 255)}`;
  const cached = texCache.get(key);
  if (cached) return cached;

  const size = 256;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const below = fc.clone().lerp(new THREE.Color(0x1c2436), 0.45);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  const horizonY = 0.46;
  grad.addColorStop(0, `#${zc.getHexString()}`);
  grad.addColorStop(horizonY * 0.82, `#${new THREE.Color(zenith).lerp(hc, 0.55).getHexString()}`);
  grad.addColorStop(horizonY, `#${hc.getHexString()}`);
  grad.addColorStop(Math.min(1, horizonY + 0.18), `#${hc.clone().lerp(below, 0.6).getHexString()}`);
  grad.addColorStop(1, `#${below.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, size);

  // subtle horizon dithering against banding
  ctx.globalAlpha = 0.045;
  for (let y = Math.floor(horizonY * size) - 30; y < Math.min(size, horizonY * size + 30); y += 2) {
    ctx.fillStyle = y % 4 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(0, y, 4, 1);
  }
  ctx.globalAlpha = 1;

  if (dusk > 0.4) {
    // faint evening tint above horizon
    ctx.globalAlpha = (dusk - 0.4) * 0.14;
    ctx.fillStyle = '#2a2450';
    ctx.fillRect(0, 0, 4, size * horizonY);
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  texCache.set(key, tex);
  if (texCache.size > 48) {
    // drop the oldest cached entry
    const firstKey = texCache.keys().next().value as string | undefined;
    if (firstKey !== undefined) {
      texCache.get(firstKey)?.dispose();
      texCache.delete(firstKey);
    }
  }
  return tex;
}
