import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function stoneTexture(): THREE.CanvasTexture {
  const c = canvas(128.0, 128.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#e7e0d0';
ctx.fillRect(0.0, 0.0, 128.0, 128.0);
dots(ctx,  	 260.0,	 128.0,	128.0,	 'rgba(120,112,96,0.4)',	 2.2);
dots(ctx,	 90.0,	 128.0,	128.0,	 'rgba(200,194,180,0.5)',	 1.6);
return tex(c);
}