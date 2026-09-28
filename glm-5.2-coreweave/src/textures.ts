/**
 * Procedural canvas textures — no external images, everything generated at runtime.
 * Each function returns a cached THREE.Texture so we only paint once per kind.
 */
import * as THREE from 'three';
import { mulberry32 } from './utils';

function makeCanvas(size: number): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { ctx, canvas };
}

function finalize(canvas: HTMLCanvasElement, repeat = 1, srgb = true): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft grassy top with subtle mottling and a few darker blades. */
export function grassTexture(): THREE.Texture {
  const size = 256;
  const { ctx, canvas } = makeCanvas(size);
  const rnd = mulberry32(7);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#8fbe5d');
  g.addColorStop(1, '#6fa848');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4200; i++) {
    const x = rnd() * size, y = rnd() * size;
    const dark = rnd() > 0.5;
    ctx.fillStyle = dark ? `rgba(90,140,55,${0.05 + rnd() * 0.12})` : `rgba(180,210,120,${0.05 + rnd() * 0.12})`;
    ctx.fillRect(x, y, 2 + rnd() * 2, 2 + rnd() * 3);
  }
  for (let i = 0; i < 600; i++) {
    const x = rnd() * size, y = rnd() * size;
    ctx.strokeStyle = `rgba(70,110,40,${0.18 + rnd() * 0.22})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 3);
    ctx.stroke();
  }
  return finalize(canvas, 2);
}

/** Rocky underside — warm grey-brown with cracks. */
export function rockTexture(): THREE.Texture {
  const size = 256;
  const { ctx, canvas } = makeCanvas(size);
  const rnd = mulberry32(11);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#7c6a52');
  g.addColorStop(1, '#5a4a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const x = rnd() * size, y = rnd() * size;
    ctx.fillStyle = rnd() > 0.5
      ? `rgba(120,100,80,${0.05 + rnd() * 0.1})`
      : `rgba(60,48,36,${0.05 + rnd() * 0.12})`;
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.strokeStyle = 'rgba(40,32,24,0.5)';
  for (let i = 0; i < 24; i++) {
    ctx.lineWidth = 1 + rnd();
    ctx.beginPath();
    let x = rnd() * size, y = rnd() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (rnd() - 0.5) * 40;
      y += (rnd() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finalize(canvas, 3);
}

/** Vertical wood grain for the windmill base and small posts. */
export function woodTexture(): THREE.Texture {
  const size = 128;
  const { ctx, canvas } = makeCanvas(size);
  const rnd = mulberry32(23);
  ctx.fillStyle = '#9c6b3d';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size;
    ctx.strokeStyle = rnd() > 0.5
      ? `rgba(120,80,40,${0.25 + rnd() * 0.4})`
      : `rgba(180,130,80,${0.12 + rnd() * 0.2})`;
    ctx.lineWidth = 1 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    let y = 0;
    while (y < size) {
      y += 6;
      ctx.lineTo(x + Math.sin(y * 0.1 + i) * 2, y);
    }
    ctx.stroke();
  }
  return finalize(canvas, 1);
}

/** Wavy water normal-ish map to perturb the pond surface. */
export function waterTexture(): THREE.Texture {
  const size = 128;
  const { ctx, canvas } = makeCanvas(size);
  const rnd = mulberry32(31);
  ctx.fillStyle = '#204a6a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size, y = rnd() * size;
    ctx.strokeStyle = `rgba(140,190,220,${0.06 + rnd() * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 6 + rnd() * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = finalize(canvas, 1, false);
  return tex;
}

/** Subtle scattered noise used as a generic detail map. */
export function noiseTexture(): THREE.Texture {
  const size = 128;
  const { ctx, canvas } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(41);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 180 + Math.floor(rnd() * 60);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finalize(canvas, 1, false);
}
