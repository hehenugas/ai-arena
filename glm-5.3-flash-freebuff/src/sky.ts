import * as THREE from 'three';
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
  domeMat.toneMapped = false; // keep sky colors vivid
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -10;
  group.add(dome);

  // ---- sun & moon ----
  const discGeo = new THREE.CircleGeometry(13, 40);
  const sunMat = new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false });
  sunMat.toneMapped = false;
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
  moonMat.toneMapped = false;
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

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
  const cloudShadeMat = new THREE.MeshBasicMaterial({ color: 0xdde7f2, transparent: true, opacity: 0.9, fog: false });

  const puffGeo = new THREE.SphereGeometry(1, 14, 10);
  const noise = makeNoise2D(99);

  const mkCloud = (x: number, y: number, z: number, scale: number, seedIdx: number): Cloud => {
    const g = new THREE.Group();
    const puffs = 7 + Math.floor(noise(seedIdx, 3) * 4);
    for (let i = 0; i < puffs; i++) {
      const px = (noise(seedIdx + i * 0.7, 11) - 0.5) * 3.4;
      const py = (noise(seedIdx + i * 0.7, 23) - 0.5) * 0.5;
      const pz = (noise(seedIdx + i * 0.7, 37) - 0.5) * 1.6;
      const s = (0.45 + noise(seedIdx + i * 0.7, 51) * 0.6) * scale;
      const mat = i % 3 === 2 ? cloudShadeMat : cloudMat;
      const m = new THREE.Mesh(puffGeo, mat);
      m.position.set(px, py, pz);
      m.scale.set(s * 1.3, s * 0.55, s);
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

  // Distant mid-height clouds (read as small, never block the island),
  // plus a low ring below the island for the floating look.
  mkCloud(-95, 12, -80, 4.5, 1);
  mkCloud(88, 16, -100, 5, 2);
  mkCloud(-115, 6, -40, 4, 3);
  mkCloud(105, 4, 70, 4, 4);
  mkCloud(-48, -22, 30, 5, 5);
  mkCloud(14, -28, -60, 4.5, 6);
  mkCloud(0, 52, -100, 6, 7);
  mkCloud(-92, 46, -64, 5.5, 8);
  mkCloud(96, 54, -52, 5.5, 9);
  mkCloud(-100, 42, 44, 6, 10);

  const api: SkyDome = {
    group,

    setColors(zenith: number, horizon: number, fog: number, dusk: number) {
      const old = domeMat.map;
      domeMat.map = skyTextureFor(zenith, horizon, fog, dusk);
      if (old && old !== domeMat.map) old.dispose();
      domeMat.needsUpdate = true;
    },

    setStorm(s: number) {
      const dark = new THREE.Color(0xffffff).lerp(new THREE.Color(0x5d687e), s * 0.75);
      cloudMat.color.copy(dark);
      const dark2 = new THREE.Color(0xdde7f2).lerp(new THREE.Color(0x4a5568), s * 0.75);
      cloudShadeMat.color.copy(dark2);
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
        const speed = c.speed * (0.04 + wind * 2.8); // ~still at zero wind
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

  const size = 512;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = size;
  const ctx = c.getContext('2d')!;

  // slight vertical blur between stops to kill gradient banding
  const below = fc.clone().lerp(new THREE.Color(0x5a6478), 0.35);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  const horizonY = 0.46;
  grad.addColorStop(0, `#${zc.getHexString()}`);
  grad.addColorStop(horizonY * 0.82, `#${new THREE.Color(zenith).lerp(hc, 0.55).getHexString()}`);
  grad.addColorStop(horizonY, `#${hc.getHexString()}`);
  grad.addColorStop(Math.min(1, horizonY + 0.18), `#${hc.clone().lerp(below, 0.6).getHexString()}`);
  grad.addColorStop(1, `#${below.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, size);

  // fine 2D noise against 8-bit gradient banding (avoids row-moiré)
  const img = ctx.getImageData(0, 0, 32, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

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
  tex.minFilter = THREE.LinearMipmapLinearFilter; // smooth at glancing angles
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
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
