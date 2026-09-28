import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { terrainHeight } from './terrain';

export const HOUSE_POS = { x: 0.85, z: 1.05, rotY: 0.95, scale: 0.88 };

const GLASS_DAY = new THREE.Color(0x27333d);
const GLASS_LIT = new THREE.Color(0xffcf94);

/** Soft round blob used for chimney smoke and light glow. */
export function makeSoftSprite(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Shingle rows drawn once and reused by the roof material. */
function makeShingleTexture(): THREE.Texture {
  const w = 128;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a2543f';
  ctx.fillRect(0, 0, w, h);
  const rows = 6;
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : w / 8;
    for (let c = -1; c < 5; c++) {
      const x = c * (w / 4) + offset;
      const y = r * rowH;
      const shade = 12 + ((r * 7 + c * 13) % 5) * 6;
      ctx.fillStyle = `rgb(${170 + shade},${92 + shade * 0.6},${74 + shade * 0.5})`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w / 4 - 2, rowH - 2, 3);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makeWindow(
  width: number,
  height: number,
  glass: THREE.Material,
  frame: THREE.Material,
): THREE.Group {
  const windowGroup = new THREE.Group();
  const border = 0.055;
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + border * 2, height + border * 2, 0.05), frame);
  back.position.z = -0.012;
  windowGroup.add(back);

  const pane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glass);
  pane.position.z = 0.014;
  windowGroup.add(pane);

  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.022, height, 0.03), frame);
  barV.position.z = 0.022;
  windowGroup.add(barV);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(width, 0.022, 0.03), frame);
  barH.position.z = 0.022;
  windowGroup.add(barH);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.045, 0.12), frame);
  sill.position.set(0, -height / 2 - border - 0.02, 0.04);
  windowGroup.add(sill);
  return windowGroup;
}


export interface House {
  group: THREE.Group;
  /** `on` is the eased 0..1 toggle, `dark` is how deep into night the sky is. */
  setLights(on: number, dark: number): void;
  update(elapsed: number, motion: number): void;
}

export function createHouse(): House {
  const group = new THREE.Group();
  group.position.set(HOUSE_POS.x, terrainHeight(HOUSE_POS.x, HOUSE_POS.z), HOUSE_POS.z);
  group.rotation.y = HOUSE_POS.rotY;
  group.scale.setScalar(HOUSE_POS.scale);

  const W = 1.5;
  const D = 1.15;
  const WALL_H = 0.9;
  const BASE_Y = 0.15;
  const RIDGE_H = 0.56;

  const plaster = new THREE.MeshStandardMaterial({ color: PALETTE.plaster, roughness: 0.92 });
  const plasterShade = new THREE.MeshStandardMaterial({ color: PALETTE.plasterShade, roughness: 0.95 });
  const timber = new THREE.MeshStandardMaterial({ color: PALETTE.timber, roughness: 0.8 });
  const timberDark = new THREE.MeshStandardMaterial({ color: PALETTE.timberDark, roughness: 0.85 });
  const doorMat = new THREE.MeshStandardMaterial({ color: PALETTE.door, roughness: 0.6 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 1, flatShading: true });
  const brick = new THREE.MeshStandardMaterial({ color: 0x9d6a53, roughness: 0.95, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x27333d,
    roughness: 0.18,
    metalness: 0.15,
    emissive: new THREE.Color(PALETTE.lamp),
    emissiveIntensity: 0,
  });

  const add = (mesh: THREE.Mesh, x: number, y: number, z: number, parent: THREE.Object3D = group) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // --- shell -----------------------------------------------------------
  add(new THREE.Mesh(new THREE.BoxGeometry(W + 0.18, 0.18, D + 0.18), stone), 0, 0.09, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(W, WALL_H, D), plaster), 0, BASE_Y + WALL_H / 2, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.09, D + 0.02), plasterShade), 0, BASE_Y + 0.05, 0);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      add(
        new THREE.Mesh(new THREE.BoxGeometry(0.085, WALL_H, 0.085), timber),
        (sx * W) / 2,
        BASE_Y + WALL_H / 2,
        (sz * D) / 2,
      );
    }
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.07, D + 0.02), timberDark), 0, BASE_Y + WALL_H - 0.03, 0);

  // gable ends closing the gap between wall top and roof
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-D / 2, 0);
  gableShape.lineTo(D / 2, 0);
  gableShape.lineTo(0, RIDGE_H);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  for (const sx of [-1, 1]) {
    const gable = new THREE.Mesh(gableGeo, plaster);
    gable.rotation.y = (sx * Math.PI) / 2;
    add(gable, (sx * W) / 2, BASE_Y + WALL_H, 0);
  }

  // --- roof ------------------------------------------------------------
  const roofShape = new THREE.Shape();
  const halfD = D / 2 + 0.16;
  roofShape.moveTo(-halfD, 0);
  roofShape.lineTo(halfD, 0);
  roofShape.lineTo(0, RIDGE_H + 0.08);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: W + 0.34,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 1,
  });
  roofGeo.rotateY(Math.PI / 2);
  roofGeo.translate(-(W + 0.34) / 2, 0, 0);
  const roofMat = new THREE.MeshStandardMaterial({ map: makeShingleTexture(), roughness: 0.85 });
  add(new THREE.Mesh(roofGeo, roofMat), 0, BASE_Y + WALL_H, 0);
  const ridge = add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W + 0.36, 8), roofMat),
    0,
    BASE_Y + WALL_H + RIDGE_H + 0.08,
    0,
  );
  ridge.rotation.z = Math.PI / 2;

  // --- chimney ---------------------------------------------------------
  add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.74, 0.22), brick), -0.42, BASE_Y + WALL_H + 0.3, 0.2);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), stone), -0.42, BASE_Y + WALL_H + 0.69, 0.2);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.14), timberDark), -0.42, BASE_Y + WALL_H + 0.73, 0.2);

  // --- door + porch ----------------------------------------------------
  const front = D / 2;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.07), timber), 0, BASE_Y + 0.39, front + 0.005);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.05), doorMat), 0, BASE_Y + 0.37, front + 0.045);
  for (const y of [0.2, 0.55]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.02), timberDark), 0, BASE_Y + y, front + 0.07);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8a24a, roughness: 0.3, metalness: 0.85 }));
  add(knob, 0.16, BASE_Y + 0.37, front + 0.08);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.26), stone), 0, 0.07, front + 0.16);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.2), stone), 0, 0.015, front + 0.26);

  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.3), timber);
  porchRoof.rotation.x = -0.2;
  add(porchRoof, 0, BASE_Y + 0.86, front + 0.14);
  for (const sx of [-1, 1]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.64, 0.055), timber), sx * 0.37, BASE_Y + 0.32, front + 0.26);
  }

  // --- windows ---------------------------------------------------------
  for (const sx of [-1, 1]) {
    const win = makeWindow(0.28, 0.32, glass, timber);
    win.position.set(sx * 0.46, BASE_Y + 0.52, front + 0.02);
    group.add(win);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.13), timberDark);
    add(box, sx * 0.46, BASE_Y + 0.28, front + 0.09);
    const leafMat = new THREE.MeshStandardMaterial({ color: PALETTE.leafB, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), leafMat);
      add(bud, sx * 0.46 + (i - 1) * 0.1, BASE_Y + 0.33, front + 0.09);
    }
    const bloomMat = new THREE.MeshStandardMaterial({ color: 0xe98ba6, roughness: 0.7, flatShading: true });
    for (let i = 0; i < 2; i++) {
      const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.028, 0), bloomMat);
      add(bloom, sx * 0.46 + (i - 0.5) * 0.13, BASE_Y + 0.37, front + 0.1);
    }
  }
  const sideWindow = makeWindow(0.26, 0.3, glass, timber);
  sideWindow.position.set(W / 2 + 0.02, BASE_Y + 0.52, 0.05);
  sideWindow.rotation.y = Math.PI / 2;
  group.add(sideWindow);

  const backWindow = makeWindow(0.24, 0.28, glass, timber);
  backWindow.position.set(0, BASE_Y + 0.52, -front - 0.02);
  backWindow.rotation.y = Math.PI;
  group.add(backWindow);

  // --- porch lamp + interior glow --------------------------------------
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x3b3227,
    emissive: new THREE.Color(PALETTE.lamp),
    emissiveIntensity: 0,
    roughness: 0.5,
  });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), lampMat), 0, BASE_Y + 0.7, front + 0.12);

  const lamp = new THREE.PointLight(0xffc07a, 0, 5.5, 1.9);
  lamp.position.set(0, BASE_Y + 0.55, front + 0.25);
  group.add(lamp);

  // --- chimney smoke ---------------------------------------------------
  const smokeTex = makeSoftSprite();
  const smokeMat = new THREE.SpriteMaterial({
    map: smokeTex,
    color: 0xe8e4dc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const smoke: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Sprite(smokeMat.clone());
    puff.position.set(-0.42, BASE_Y + WALL_H + 0.8, 0.2);
    group.add(puff);
    smoke.push(puff);
  }

  const chimneyTop = new THREE.Vector3(-0.42, BASE_Y + WALL_H + 0.78, 0.2);

  return {
    group,
    setLights(on, dark) {
      glass.emissiveIntensity = on * (0.06 + dark * 2.6);
      lampMat.emissiveIntensity = on * (0.1 + dark * 3.2);
      lamp.intensity = on * dark * 6.5;
      glass.color.copy(GLASS_DAY).lerp(GLASS_LIT, on * dark * 0.85);
    },
    update(elapsed, motion) {
      if (motion < 0.01) return;
      for (let i = 0; i < smoke.length; i++) {
        const t = ((elapsed * 0.22 + i / smoke.length) % 1);
        const puff = smoke[i];
        puff.position.set(
          chimneyTop.x + Math.sin(t * 4 + i) * 0.14 * t,
          chimneyTop.y + t * 1.5,
          chimneyTop.z + Math.cos(t * 3 + i) * 0.1 * t,
        );
        const scale = 0.22 + t * 0.6;
        puff.scale.setScalar(scale);
        (puff.material as THREE.SpriteMaterial).opacity = (1 - t) * 0.16 * motion;
      }
    },
  };
}
