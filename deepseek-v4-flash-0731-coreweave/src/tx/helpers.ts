import * as THREE from 'three';

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.RepeatWrapping;t.anisotropy = 4.0;
  return t;
}

export function dots(ctx: CanvasRenderingContext2D, n: number, w: number, h: number, color: string, rs: number): void {
  Array(n).forEach(() => {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, rs, rs);
  });
}