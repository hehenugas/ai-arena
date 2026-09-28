import * as THREE from "three";

function makeCanvas(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create a canvas texture.");
  }
  draw(ctx, size);
  return canvas;
}

function textureFrom(canvas: HTMLCanvasElement, wrap: THREE.Wrapping, anisotropy: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = wrap;
  texture.wrapT = wrap;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

export type Textures = {
  plaster: THREE.CanvasTexture;
  shingle: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
  brick: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
  sprite: THREE.CanvasTexture;
};

export function createTextures(anisotropy: number): Textures {
  const plaster = textureFrom(
    makeCanvas(256, (ctx, size) => {
      ctx.fillStyle = "#f4ecdf";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 1400; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const shade = 90 + Math.random() * 80;
        ctx.fillStyle = `rgba(${shade}, ${shade - 20}, ${shade - 40}, ${0.03 + Math.random() * 0.06})`;
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      for (let i = 0; i < 7; i += 1) {
        ctx.fillStyle = `rgba(196, 170, 140, ${0.05 + Math.random() * 0.05})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * size, Math.random() * size, 30 + Math.random() * 40, 18 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    }),
    THREE.ClampToEdgeWrapping,
    anisotropy,
  );

  const shingle = textureFrom(
    makeCanvas(256, (ctx, size) => {
      ctx.fillStyle = "#a6533e";
      ctx.fillRect(0, 0, size, size);
      const rows = 8;
      const rowH = size / rows;
      const tileW = 32;
      for (let row = 0; row < rows; row += 1) {
        const offset = row % 2 === 0 ? 0 : tileW / 2;
        for (let x = -tileW; x < size + tileW; x += tileW) {
          const px = x + offset;
          const py = row * rowH;
          const shift = ((row * 5 + x) % 17) - 8;
          ctx.fillStyle = `rgb(${168 + shift}, ${78 + (row % 3) * 4}, ${58})`;
          ctx.beginPath();
          ctx.moveTo(px + 1, py + rowH - 1);
          ctx.lineTo(px + 1, py + 7);
          ctx.quadraticCurveTo(px + tileW / 2, py + 1, px + tileW - 1, py + 7);
          ctx.lineTo(px + tileW - 1, py + rowH - 1);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(90, 36, 28, 0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }),
    THREE.RepeatWrapping,
    anisotropy,
  );
  shingle.repeat.set(2.4, 1.6);

  const wood = textureFrom(
    makeCanvas(256, (ctx, size) => {
      ctx.fillStyle = "#8d5e3c";
      ctx.fillRect(0, 0, size, size);
      for (let x = 0; x < size; x += 1) {
        const n = Math.sin(x * 0.17) * 0.5 + Math.sin(x * 0.05) * 0.5;
        const shade = 18 * n;
        ctx.strokeStyle = `rgba(${70 + shade}, ${40 + shade * 0.4}, ${24}, 0.28)`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 4, size * 0.3, x - 3, size * 0.7, x + 1, size);
        ctx.stroke();
      }
      for (let y = 18; y < size; y += 28) {
        ctx.strokeStyle = "rgba(70, 40, 24, 0.18)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y + 2);
        ctx.stroke();
      }
    }),
    THREE.RepeatWrapping,
    anisotropy,
  );
  wood.repeat.set(1, 1);

  const brick = textureFrom(
    makeCanvas(256, (ctx, size) => {
      ctx.fillStyle = "#c9b5a4";
      ctx.fillRect(0, 0, size, size);
      const bw = 40;
      const bh = 20;
      for (let row = 0; row < size / bh; row += 1) {
        const offset = row % 2 === 0 ? 0 : bw / 2;
        for (let col = -1; col < size / bw + 1; col += 1) {
          const x = col * bw + offset + 1;
          const y = row * bh + 1;
          const tint = ((row * 3 + col * 5) % 7) * 4;
          ctx.fillStyle = `rgb(${156 + tint}, ${84 + (row % 2) * 6}, ${64})`;
          ctx.fillRect(x, y, bw - 3, bh - 3);
        }
      }
    }),
    THREE.RepeatWrapping,
    anisotropy,
  );
  brick.repeat.set(1.2, 1.6);

  const glow = textureFrom(
    makeCanvas(128, (ctx, size) => {
      const g = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(255, 196, 120, 0.85)");
      g.addColorStop(0.45, "rgba(255, 176, 90, 0.28)");
      g.addColorStop(1, "rgba(255, 176, 90, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }),
    THREE.ClampToEdgeWrapping,
    1,
  );

  const sprite = textureFrom(
    makeCanvas(128, (ctx, size) => {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(255, 248, 230, 1)");
      g.addColorStop(0.2, "rgba(255, 214, 160, 0.9)");
      g.addColorStop(0.48, "rgba(255, 170, 110, 0.28)");
      g.addColorStop(1, "rgba(255, 160, 90, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }),
    THREE.ClampToEdgeWrapping,
    1,
  );

  return { plaster, shingle, wood, brick, glow, sprite };
}
