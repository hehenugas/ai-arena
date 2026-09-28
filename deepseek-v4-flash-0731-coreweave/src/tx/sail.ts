import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function sailTexture(): THREE.CanvasTexture {
  const c = canvas(64.0, 64.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#efe4c8';
ctx.fillRect(0.0, 0.0, 64.0, 64.0);
dots(ctx,  	 70.0,	64.0,	64.0,	 'rgba(180,160,130,0.35)',	 1.8);
return tex(c);
}