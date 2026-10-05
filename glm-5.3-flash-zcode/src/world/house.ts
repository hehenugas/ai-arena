import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PointLight,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three';
import { groundHeight } from './island';

const WOOD_DARK = 0x6b4a2e;
const WOOD_WARM = 0x8a5a38;
const CREAM = 0xf3e7d0;
const ROOF = 0xb25a41;
const BRICK = 0x9c5a48;

const wallGlow = new Color();

export interface House {
  group: Group;
  update(
    elapsed: number,
    opts: { wind: number; lightsT: number; night: number; reducedMotion: boolean }
  ): void;
}

export function createHouse(): House {
  const group = new Group();
  group.position.set(-1.5, groundHeight(-1.5, -0.9), -0.9);
  group.rotation.y = 0.5;

  const cream = new MeshStandardMaterial({ color: CREAM, roughness: 0.9, flatShading: true });
  const woodDark = new MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.85, flatShading: true });
  const woodWarm = new MeshStandardMaterial({ color: WOOD_WARM, roughness: 0.85, flatShading: true });
  const roofMat = new MeshStandardMaterial({ color: ROOF, roughness: 0.8, flatShading: true });
  const brick = new MeshStandardMaterial({ color: BRICK, roughness: 0.95, flatShading: true });
  const stone = new MeshStandardMaterial({ color: 0xa79a88, roughness: 1, flatShading: true });
  const glass = new MeshStandardMaterial({
    color: 0x33404f,
    emissive: 0xffb454,
    emissiveIntensity: 0,
    roughness: 0.35,
    metalness: 0.05,
  });

  const box = (
    w: number,
    h: number,
    d: number,
    mat: MeshStandardMaterial,
    x: number,
    y: number,
    z: number
  ) => {
    const m = new Mesh(new BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Plinth and walls
  box(2.44, 0.16, 1.84, stone, 0, 0.08, 0);
  box(2.3, 1.15, 1.7, cream, 0, 0.74, 0);

  // Timber corner posts
  for (const [px, pz] of [
    [1.13, 0.83],
    [-1.13, 0.83],
    [1.13, -0.83],
    [-1.13, -0.83],
  ]) {
    box(0.12, 1.18, 0.12, woodDark, px, 0.75, pz);
  }

  // Roof: two slabs meeting at a ridge along x, plus gable ends and a ridge cap.
  const slabN = box(2.52, 0.1, 1.12, roofMat, 0, 1.62, -0.44);
  slabN.rotation.x = 0.6;
  const slabS = box(2.52, 0.1, 1.12, roofMat, 0, 1.62, 0.44);
  slabS.rotation.x = -0.6;
  box(2.56, 0.09, 0.2, woodDark, 0, 1.93, 0);
  const gableShape = new Shape();
  gableShape.moveTo(-0.85, 0);
  gableShape.lineTo(0.85, 0);
  gableShape.lineTo(0, 0.62);
  gableShape.closePath();
  const gableGeo = new ShapeGeometry(gableShape);
  for (const gx of [1.15, -1.15]) {
    const g = new Mesh(gableGeo, cream);
    g.rotation.y = gx > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.position.set(gx, 1.315, 0);
    g.castShadow = true;
    group.add(g);
  }

  // Chimney with cap and dark flue
  box(0.3, 0.85, 0.3, brick, 0.62, 1.75, -0.3);
  box(0.42, 0.08, 0.42, stone, 0.62, 2.2, -0.3);
  box(0.16, 0.1, 0.16, woodDark, 0.62, 2.26, -0.3);

  // Door with frame, knob and step
  box(0.56, 0.9, 0.05, woodDark, -0.55, 0.61, 0.85);
  box(0.44, 0.78, 0.08, woodWarm, -0.55, 0.55, 0.87);
  const knob = new Mesh(new SphereGeometry(0.035, 8, 6), woodDark);
  knob.position.set(-0.4, 0.52, 0.92);
  group.add(knob);
  box(0.62, 0.1, 0.32, stone, -0.55, 0.05, 0.98);

  // Windows: frame, cross mullions, sill, glowing glass, flower box
  const makeWindow = (x: number, y: number, z: number, ry: number) => {
    const w = new Group();
    w.position.set(x, y, z);
    w.rotation.y = ry;
    const frame = new Mesh(new BoxGeometry(0.52, 0.52, 0.07), woodDark);
    frame.castShadow = true;
    const pane = new Mesh(new BoxGeometry(0.4, 0.4, 0.05), glass);
    pane.position.z = 0.02;
    const mullV = new Mesh(new BoxGeometry(0.05, 0.4, 0.03), woodDark);
    mullV.position.z = 0.05;
    const mullH = new Mesh(new BoxGeometry(0.4, 0.05, 0.03), woodDark);
    mullH.position.z = 0.05;
    const sill = new Mesh(new BoxGeometry(0.58, 0.06, 0.14), woodDark);
    sill.position.set(0, -0.3, 0.04);
    sill.castShadow = true;
    w.add(frame, pane, mullV, mullH, sill);
    group.add(w);
    return w;
  };
  makeWindow(0.55, 0.78, 0.86, 0);
  makeWindow(-0.55, 0.78, -0.86, Math.PI);
  makeWindow(1.16, 0.78, 0.25, Math.PI / 2);

  box(0.56, 0.1, 0.14, woodWarm, 0.55, 0.44, 0.92);
  const bloomColors = [0xd96a5a, 0xe6c15a, 0xf2e3b8];
  for (let i = 0; i < 3; i++) {
    const bloom = new Mesh(new SphereGeometry(0.045, 7, 6), stone);
    bloom.material = new MeshStandardMaterial({
      color: bloomColors[i],
      roughness: 0.8,
      flatShading: true,
    });
    bloom.position.set(0.55 + (i - 1) * 0.16, 0.52, 0.92);
    group.add(bloom);
  }

  // Porch light that warms the door when the house is lit
  const porch = new PointLight(0xffb066, 0, 5.5, 1.8);
  porch.position.set(0.1, 1.1, 1.0);
  group.add(porch);

  // Chimney smoke: a small pool of puffs cycling upward
  const puffs: Mesh[] = [];
  const puffMat = new MeshLambertMaterial({ color: 0xded9d0, transparent: true, opacity: 0 });
  for (let i = 0; i < 6; i++) {
    const p = new Mesh(new SphereGeometry(0.055, 7, 6), puffMat.clone());
    p.position.set(0.62, 2.3, -0.3);
    group.add(p);
    puffs.push(p);
  }

  return {
    group,
    update(elapsed, { wind, lightsT, night, reducedMotion }) {
      glass.emissiveIntensity = lightsT * (0.7 + 1.5 * night);
      porch.intensity = lightsT * (1.6 + 3.4 * night);

      const drift = reducedMotion ? 0.35 : 1;
      for (let i = 0; i < puffs.length; i++) {
        const t = (elapsed * 0.22 * drift + i / puffs.length) % 1;
        const p = puffs[i];
        p.position.set(
          0.62 + wind * 0.9 * t + Math.sin(elapsed * 0.8 + i) * 0.02,
          2.32 + t * 0.85,
          -0.3 + wind * 0.35 * t
        );
        const s = 0.6 + t * 1.1;
        p.scale.setScalar(s);
        const fadeIn = Math.min(1, t / 0.15);
        (p.material as MeshLambertMaterial).opacity = 0.3 * (1 - t) * fadeIn;
      }

      // A faint warm tint on the walls when lit, so the whole house feels on.
      wallGlow.setHex(0xff9a4d).multiplyScalar(lightsT * 0.06 * (0.4 + 0.6 * night));
      cream.emissive.copy(wallGlow);
    },
  };
}
