import {
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  ConeGeometry,
  SphereGeometry,
} from 'three';
import { groundHeight } from './island';
import { hash3 } from './noise';

export const POND_CENTER: [number, number] = [-1.5, 2.0];
const WATER_R = 1.35;

interface Ripple {
  mesh: Mesh;
  age: number;
  life: number;
  active: boolean;
}

export interface Pond {
  group: Group;
  update(dt: number, elapsed: number, rainAmount: number): void;
}

export function createPond(): Pond {
  const group = new Group();
  const [cx, cz] = POND_CENTER;
  const baseY = groundHeight(cx, cz);

  // Sandy shore ring, then the water disc, then a deeper tint in the middle.
  const shore = new Mesh(
    new RingGeometry(1.22, 1.8, 40),
    new MeshStandardMaterial({ color: 0xdcc998, roughness: 1, flatShading: true })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(cx, baseY + 0.04, cz);
  shore.scale.set(1, 0.94, 1);
  shore.receiveShadow = true;

  const waterMat = new MeshStandardMaterial({
    color: 0x6f9ec4,
    roughness: 0.16,
    metalness: 0.05,
    transparent: true,
    opacity: 0.94,
  });
  const water = new Mesh(new CircleGeometry(WATER_R, 40), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, baseY + 0.07, cz);
  water.receiveShadow = true;

  const deep = new Mesh(
    new CircleGeometry(WATER_R * 0.62, 32),
    new MeshStandardMaterial({
      color: 0x557fa6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6,
    })
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(cx, baseY + 0.075, cz);

  group.add(shore, water, deep);

  // Lily pads and a reed clump for charm.
  const lilyMat = new MeshStandardMaterial({ color: 0x4f7d3e, roughness: 0.9, flatShading: true });
  const lilies: Mesh[] = [];
  const lilySpecs: Array<[number, number, number]> = [
    [-0.35, -0.3, 0.1],
    [0.3, 0.15, 0.08],
    [-0.05, 0.45, 0.07],
  ];
  for (const [ox, oz, r] of lilySpecs) {
    const pad = new Mesh(new CircleGeometry(r, 12), lilyMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(cx + ox, baseY + 0.082, cz + oz);
    group.add(pad);
    lilies.push(pad);
  }
  const bloom = new Mesh(
    new SphereGeometry(0.035, 7, 6),
    new MeshStandardMaterial({ color: 0xe8a8b8, roughness: 0.8, flatShading: true })
  );
  bloom.position.set(cx - 0.35, baseY + 0.12, cz - 0.3);
  group.add(bloom);

  const reedMat = new MeshStandardMaterial({ color: 0x6b8f4a, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const h = 0.3 + hash3(i, 3, 7) * 0.25;
    const reed = new Mesh(new ConeGeometry(0.025, h, 5), reedMat);
    reed.position.set(
      cx + 0.75 + hash3(i, 1, 2) * 0.2,
      baseY + 0.16 + h / 2,
      cz - 0.75 + hash3(i, 2, 5) * 0.25
    );
    reed.rotation.z = (hash3(i, 5, 9) - 0.5) * 0.3;
    reed.castShadow = true;
    group.add(reed);
  }

  // Pooled rain ripples: expanding rings recycled over the water.
  const ripples: Ripple[] = [];
  const rippleGeo = new RingGeometry(0.82, 1, 20);
  for (let i = 0; i < 22; i++) {
    const mat = new MeshBasicMaterial({
      color: 0xe6eef5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new Mesh(rippleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, baseY + 0.09, cz);
    mesh.visible = false;
    group.add(mesh);
    ripples.push({ mesh, age: 0, life: 0.8, active: false });
  }
  let spawnBudget = 0;
  const scratch = new Color();
  const rainWater = new Color(0x54718b);

  return {
    group,
    update(dt, elapsed, rainAmount) {
      // Lily pads bob gently; a touch livelier when it rains.
      const bob = 0.004 + rainAmount * 0.004;
      for (let i = 0; i < lilies.length; i++) {
        lilies[i].position.y = baseY + 0.082 + Math.sin(elapsed * 1.2 + i * 2.1) * bob;
      }

      spawnBudget += rainAmount * 20 * dt;
      for (const r of ripples) {
        if (r.active) {
          r.age += dt;
          const t = r.age / r.life;
          if (t >= 1) {
            r.active = false;
            r.mesh.visible = false;
            continue;
          }
          const s = 0.08 + t * 0.34;
          r.mesh.scale.set(s, s, 1);
          (r.mesh.material as MeshBasicMaterial).opacity = 0.5 * (1 - t);
        } else if (spawnBudget >= 1) {
          spawnBudget -= 1;
          r.active = true;
          r.age = 0;
          r.life = 0.7 + hash3(elapsed, r.mesh.id, 3) * 0.5;
          const a = hash3(elapsed, r.mesh.id, 7) * Math.PI * 2;
          const rr = Math.sqrt(hash3(elapsed, r.mesh.id, 13)) * (WATER_R - 0.15);
          r.mesh.position.set(cx + Math.cos(a) * rr, baseY + 0.09, cz + Math.sin(a) * rr);
          r.mesh.visible = true;
        }
      }

      // Muted, slightly darker water while it rains.
      scratch.setHex(0x6f9ec4).lerp(rainWater, rainAmount * 0.55);
      waterMat.color.copy(scratch);
    },
  };
}
