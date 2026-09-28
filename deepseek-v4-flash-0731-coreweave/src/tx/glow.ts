import * as THREE from 'three';
import { canvas, tex } from './helpers';

export function glowTexture(): THREE.CanvasTexture {
  const c = canvas(64.0, 64.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
const g = ctx.createRadialGradient(32.0, 32.0, 0.0, 32.0, 32.0,  	 32.0);
g.addColorStop(0.0, 'rgba(255,240,200,1.0)');
g.addColorStop(0.4, 'rgba(255,210,150,0.4)');
g.addColorStop(1.0, 'rgba(255,210,150,0.0)');
ctx.fillStyle = g
ctx.fillRect(0.0, 0.0, 64.0, 64.0);
return tex(c);
}