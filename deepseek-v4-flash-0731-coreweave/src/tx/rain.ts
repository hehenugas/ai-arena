import * as THREE from 'three';
import { canvas, tex } from './helpers';

export function rainTexture(): THREE.CanvasTexture {
  const c = canvas(8.0, 24.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.clearRect(0.0, 0.0, 8.0, 24.0);
ctx.fillStyle = 'rgba(220,230,240,0.9)';
ctx.fillRect(3.0, 0.0, 2.0, 24.0);
return tex(c);
}