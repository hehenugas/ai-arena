import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function sandTexture(): THREE.CanvasTexture {
  const c = canvas(64.0, 64.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#d9c07e';
ctx.fillRect(0.0, 0.0, 64.0, 64.0);
dots(ctx,  	 140.0,	64.0,	64.0,	 'rgba(150,126,84,0.4)',	 1.8);
return tex(c);
}