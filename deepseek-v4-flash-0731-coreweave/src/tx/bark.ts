import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function barkTexture(): THREE.CanvasTexture {
  const c = canvas(96.0, 128.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#6b4a33';
ctx.fillRect(0.0, 0.0, 96.0, 128.0);
dots(ctx, 90.0, 96.0, 128.0, 'rgba(46,32,22,0.5)', 1.4);
dots(ctx, 60.0, 96.0, 128.0, 'rgba(104,80,58,0.5)', 1.4);
return tex(c);
}