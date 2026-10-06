/**
 * Canvas-generated procedural textures. Everything is made in code so the
 * whole project stays free of downloaded assets.
 */
import * as THREE from 'three';

export function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeWallTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#efe3cd';
    ctx.fillRect(0, 0, s, s);
    // soft vertical plaster/plank streaks
    const rng = (i: number) => {
      const x = Math.sin(i * 137.3) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 14; i++) {
      const x = ((i + rng(i) * 0.8) / 14) * s;
      ctx.fillStyle = `rgba(160,138,108,${0.05 + rng(i + 40) * 0.05})`;
      ctx.fillRect(x, 0, 1 + rng(i + 80) * 2, s);
    }
    // subtle horizontal noise
    for (let y = 0; y < 40; y++) {
      ctx.fillStyle = `rgba(120,100,80,${0.02 + rng(y + 7) * 0.025})`;
      ctx.fillRect(0, (y / 40) * s, s, 1);
    }
    // weathered patches near the bottom
    const grad = ctx.createLinearGradient(0, s * 0.75, 0, s);
    grad.addColorStop(0, 'rgba(110,92,70,0)');
    grad.addColorStop(1, 'rgba(110,92,70,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, s * 0.75, s, s * 0.25);
  });
}

export function makeRoofTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#b3563d';
    ctx.fillRect(0, 0, s, s);
    const rng = (i: number) => {
      const x = Math.sin(i * 137.3) * 43758.5453;
      return x - Math.floor(x);
    };
    // horizontal shingle rows with staggered joints
    const rows = 12;
    const rowH = s / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (s / 14);
      ctx.fillStyle = `rgba(70,34,26,${0.1 + rng(r + 3) * 0.08})`;
      ctx.fillRect(0, y, s, rowH);
      for (let c = -1; c < 15; c++) {
        const x = offset + c * (s / 7);
        ctx.fillStyle = `rgba(40,18,14,${0.16 + rng(r * 31 + c) * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(x, y + rowH);
        ctx.lineTo(x + s / 14, y);
        ctx.lineTo(x + s / 7, y + rowH);
        ctx.fill();
      }
    }
    // light catch on shingle bottoms
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = 'rgba(255,200,150,0.07)';
      ctx.fillRect(0, r * rowH + rowH * 0.72, s, rowH * 0.28);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

export function makeStoneTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#c8b9a2';
    ctx.fillRect(0, 0, s, s);
    const rng = (i: number) => {
      const x = Math.sin(i * 137.3) * 43758.5453;
      return x - Math.floor(x);
    };
    // small cobbles
    const cols = 8;
    const cell = s / cols;
    for (let iy = 0; iy < 8; iy++) {
      for (let ix = 0; ix < 8; ix++) {
        const i = iy * 8 + ix;
        const x = ix * cell + rng(i) * cell * 0.4;
        const y = iy * cell + rng(i + 50) * cell * 0.4;
        const r = cell * (0.28 + rng(i + 100) * 0.16);
        const tone = 0.5 + rng(i + 150) * 0.5;
        ctx.fillStyle = `rgba(${160 + 90 * tone},${140 + 80 * tone},${110 + 70 * tone},1)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,74,56,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

/** Soft radial glow used for the sun / moon discs. */
export function makeRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}