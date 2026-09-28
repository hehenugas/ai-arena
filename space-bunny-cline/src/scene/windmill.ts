import * as THREE from 'three';
import { PALETTE } from '../core/theme';
import { terrainHeight } from './terrain';

export const MILL_POS = { x: -2.75, z: -1.1, rotY: 1.02, scale: 0.9 };

/** Woven sail cloth, drawn once and shared by all four sails. */
function makeSailTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e6d7bb';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(120, 98, 70, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo((i * size) / 6, 0);
    ctx.lineTo((i * size) / 6, size);
    ctx.stroke();
  }
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (i * size) / 8);
    ctx.lineTo(size, (i * size) / 8);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface Windmill {
  group: THREE.Group;
  update(dt: number, wind: number, motion: number): void;
}

/** A tapered stone-and-plaster tower with four sails on a visible hub. */
export function createWindmill(): Windmill {
  const group = new THREE.Group();
  group.position.set(MILL_POS.x, terrainHeight(MILL_POS.x, MILL_POS.z), MILL_POS.z);
  group.rotation.y = MILL_POS.rotY;
  group.scale.setScalar(MILL_POS.scale);

  const plaster = new THREE.MeshStandardMaterial({ color: PALETTE.plasterShade, roughness: 0.94 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8b8377, roughness: 1, flatShading: true });
  const timber = new THREE.MeshStandardMaterial({ color: PALETTE.timber, roughness: 0.85 });
  const timberDark = new THREE.MeshStandardMaterial({ color: PALETTE.timberDark, roughness: 0.85 });
  const sailMat = new THREE.MeshStandardMaterial({
    map: makeSailTexture(),
    side: THREE.DoubleSide,
    roughness: 0.9,
  });

  const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  add(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.16, 12), stone), 0, 0.08, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.31, 1.15, 14), plaster), 0, 0.72, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 14), timber), 0, 1.16, 0);
  add(new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.26, 14), timberDark), 0, 1.42, 0);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), timber), 0, 1.57, 0);

  // little door with a stone step
  add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.06), timberDark), 0, 0.3, 0.28);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.18), stone), 0, 0.1, 0.34);

  const blades = new THREE.Group();
  blades.position.set(0, 1.24, 0.26);
  group.add(blades);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.16, 10), timber);
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  blades.add(hub);

  const bladeGeo = new THREE.BoxGeometry(0.045, 0.92, 0.03);
  const sailGeo = new THREE.PlaneGeometry(0.19, 0.6);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;

    const spar = new THREE.Mesh(bladeGeo, timber);
    spar.position.y = 0.5;
    spar.castShadow = true;
    arm.add(spar);

    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0.12, 0.62, 0.012);
    sail.castShadow = true;
    arm.add(sail);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.03), timber);
    rail.position.set(0.215, 0.62, 0);
    arm.add(rail);

    blades.add(arm);
  }

  return {
    group,
    update(dt, wind, motion) {
      const speed = (0.05 + Math.pow(wind, 1.15) * 2.6) * motion;
      blades.rotation.z -= speed * dt;
    },
  };
}
