import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function grassTexture(): THREE.CanvasTexture {
  const c = canvas(256.0, 256.0);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#79ad58';
  ctx.fillRect(0.0, 0.0, 256.0, 256.0);
  dots(ctx, 900.0, 256.0, 256.0, 'rgba(96,134,64,0.22)', 2.2);
  dots(ctx, 300.0, 256.0, 256.0, 'rgba(196,216,140,0.4)', 1.3);
  return tex(c);
}