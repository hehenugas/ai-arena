import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function woodTexture(): THREE.CanvasTexture {
  const c = canvas(128.0, 128.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#a9845f';
ctx.fillRect(0.0, 0.0, 128.0, 128.0);
dots(ctx,      	 240.0,	 	 128.0,	 	 128.0,	 'rgba(120,92,62,0.4)',	 2.0);
dots(ctx, 		 80.0,	 128.0,	128.0,	 'rgba(62,44,30,0.4)',  1.6);
return tex(c);
}