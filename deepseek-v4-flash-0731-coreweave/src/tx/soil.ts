import * as THREE from 'three';
import { canvas, tex, dots } from './helpers';

export function soilTexture(dark: boolean): THREE.CanvasTexture {
  const c = canvas(128.0, 128.0);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;

  ctx.fillStyle = dark ? '#5b4836' : '#7a644b';
  ctx.fillRect(0.0, 0.0, 128.0, 128.0);
dots(ctx, 150.0, 128.0, 128.0, dark ? 'rgba(70,52,36,0.35)' : 'rgba(92,72,52,0.35)', 2.8);
dots(ctx,     80.0, 128.0, 128.0, 'rgba(40,30,22,0.25)', 4.0);
return tex(c);
}