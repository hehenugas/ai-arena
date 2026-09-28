import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function waterTexture(): THREE.CanvasTexture {
  const c = canvas(64.0, 64.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#5e9bb0';
ctx.fillRect(0.0, 0.0, 64.0, 64.0);
dots(ctx,  	 90.0,	64.0,	64.0,	 'rgba(190,220,230,0.5)',	 2.0);
return tex(c);
}