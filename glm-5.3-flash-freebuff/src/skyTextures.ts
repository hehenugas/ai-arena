import * as THREE from 'three';

/** Attach a hemisphere-glow sprite behind the big sky dome. */
export function createGlowSprite(
  texture: THREE.CanvasTexture,
  size: number,
  color: number,
  opacity: number,
  depthWrite = false,
): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite,
    blending: THREE.AdditiveBlending,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  return s;
}

/**
 * Radial-gradient canvas texture (white core → transparent edge), tinted via
 * material color. Used for glow sprites and cloud puffs.
 */
export function radialTexture(size = 128, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sky gradient texture painted on the inside of the dome. */
export function skyTexture(
  zenithHex: number,
  horizonHex: number,
  groundHex: number,
  groundY = 0.42,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const zc = new THREE.Color(zenithHex);
  const hc = new THREE.Color(horizonHex);
  const gc = new THREE.Color(groundHex);

  // Below the horizon band we fade into a "below the island" tone.
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  const horizonY = groundY * size;
  grad.addColorStop(0, `#${zc.getHexString()}`);
  grad.addColorStop(groundY, `#${hc.getHexString()}`);
  grad.addColorStop(Math.min(1, groundY + 0.22), `#${gc.clone().lerp(hc, 0.55).getHexString()}`);
  grad.addColorStop(1, `#${gc.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, size);

  // Slight dither band at the horizon to avoid banding artifacts.
  ctx.globalAlpha = 0.05;
  for (let y = Math.max(0, horizonY - 40); y < Math.min(size, horizonY + 40); y += 2) {
    ctx.fillStyle = y % 4 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(0, y, 4, 1);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
