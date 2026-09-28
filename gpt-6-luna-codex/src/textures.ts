import * as THREE from 'three';

function noiseTexture(base: string, marks: string[], seed: number, density = 2500): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture could not be created.');
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < density; i += 1) {
    context.globalAlpha = 0.12 + random() * 0.32;
    context.fillStyle = marks[Math.floor(random() * marks.length)];
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const size = 0.6 + random() * 2.2;
    context.beginPath();
    context.ellipse(x, y, size * (0.5 + random()), size * 0.35, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export const grassTexture = noiseTexture('#849c59', ['#506d40', '#afbd71', '#d0c58a', '#e4d9a1'], 713, 3400);
export const roofTexture = noiseTexture('#a6543b', ['#783d32', '#ce7950', '#e39a67', '#74453a'], 1207, 1800);
export const woodTexture = noiseTexture('#806044', ['#4f4534', '#b18a5c', '#d0a46b'], 312, 1300);
export const stoneTexture = noiseTexture('#b5b1a1', ['#8e938b', '#d5cdb9', '#89918f'], 529, 900);

export function createTexturedMaterial(color: string, map: THREE.Texture, roughness = 0.88): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, map, roughness, metalness: 0.02 });
}
