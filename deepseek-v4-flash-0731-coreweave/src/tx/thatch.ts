import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function thatchTexture(): THREE.CanvasTexture {
  const c = canvas(128.0, 128.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#c2a25e';
ctx.fillRect(0.0, 0.0, 128.0, 128.0);
dots(ctx, 400.0, 128.0, 128.0, 'rgba(150,118,64,0.4)', 1.8);
dots(ctx,  	 90.0,	128.0,	128.0,	 'rgba(160,128,72,0.5)',	 1.4);
return tex(c);
}