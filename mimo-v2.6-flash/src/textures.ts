import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  return { canvas, ctx };
}

function finish(canvas: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * Seamless soft mottling built from layered sines — used as a subtle surface
 * break-up on grass, walls and wood (no external images anywhere).
 */
export function makeMottleTexture(size = 256, contrast = 0.09): CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * Math.PI * 2;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      let n = 0;
      n += Math.sin(u * 3 + 0.7) * Math.sin(v * 3 - 1.2) * 0.5;
      n += Math.sin(u * 7 - 2.1) * Math.sin(v * 5 + 0.4) * 0.3;
      n += Math.sin(u * 13 + 1.9) * Math.sin(v * 11 - 0.8) * 0.2;
      const k = 1 + (0.5 + 0.5 * n - 0.5) * 2 * contrast;
      const i = (y * size + x) * 4;
      const c = Math.max(0, Math.min(255, Math.round(255 * k)));
      d[i] = c;
      d[i + 1] = c;
      d[i + 2] = c;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(canvas, true);
}

/** Warm wood grain: stretched streaks running along the texture's V axis. */
export function makeWoodTexture(size = 256): CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * Math.PI * 2;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      let n = 0;
      n += Math.sin(u * 11 + Math.sin(v * 1.5) * 1.4) * 0.55;
      n += Math.sin(u * 23 - 1.1 + Math.sin(v * 0.7) * 0.8) * 0.3;
      n += Math.sin(v * 3 + 0.5) * 0.15;
      const k = 1 + n * 0.13;
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, Math.round(255 * k)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(240 * k)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(224 * k)));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(canvas, true);
}

function hash2(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Terracotta shingle rows with per-shingle tint variation. Tile-seamless. */
export function makeRoofTexture(size = 256): CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#b9614a';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const rowH = size / rows;
  const cols = 6;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const shift = r % 2 === 0 ? 0 : colW / 2;
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + shift;
      const h = hash2(r, c);
      const shade = 0.86 + h * 0.28;
      const rr = Math.min(255, Math.round(201 * shade));
      const gg = Math.min(255, Math.round(113 * shade));
      const bb = Math.min(255, Math.round(88 * shade));
      ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
      ctx.fillRect(x + 1, y + 2, colW - 2, rowH - 3);
    }
    ctx.fillStyle = 'rgba(58, 24, 17, 0.55)';
    ctx.fillRect(0, y, size, 2);
  }
  return finish(canvas, true);
}

/**
 * Procedural normal map for the pond: analytic gradients of a sum-of-sines
 * height field, so it tiles seamlessly and can be scrolled for moving water.
 */
export function makeWaterNormalTexture(size = 256): CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const waves: Array<[number, number, number, number, number]> = [
    // fx, fy, amplitude, phase, weight
    [3, 2, 1.0, 0.0, 1.0],
    [5, -4, 0.55, 1.7, 1.0],
    [-8, 6, 0.3, 0.4, 1.0],
    [11, 9, 0.18, 2.6, 1.0],
    [-17, -13, 0.1, 1.1, 1.0],
  ];
  const strength = 3.4;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * Math.PI * 2;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      let dhdu = 0;
      let dhdv = 0;
      for (const [fx, fy, amp, phase] of waves) {
        const a = fx * u + fy * v + phase;
        dhdu += amp * fx * Math.cos(a);
        dhdv += amp * fy * Math.cos(a);
      }
      dhdu *= strength;
      dhdv *= strength;
      const len = Math.sqrt(dhdu * dhdu + dhdv * dhdv + 1);
      const nx = -dhdu / len;
      const ny = -dhdv / len;
      const nz = 1 / len;
      const i = (y * size + x) * 4;
      d[i] = Math.round((nx * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(canvas, false);
}
