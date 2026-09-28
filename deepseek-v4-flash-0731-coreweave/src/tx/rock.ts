import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function rockTexture(): THREE.CanvasTexture {
  const c = canvas(160.0, 160.0);
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
ctx.fillStyle = '#8d806c';
ctx.fillRect(0.0, 0.0, 160.0, 160.0);
dots(ctx,     500.0,      	  160.0,	 	  160.0,	 'rgba(60,50,40,0.35)',	 3.5);
dots(ctx,  	 220.0,	160.0,	 	 160.0,	 'rgba(176,168,150,0.3)',	 2.5);
return tex(c);
}