import * as THREE from 'three';
import { islandHeight } from './height';
import { rockTexture } from '../tx/rock';
import { grassTexture } from '../tx/grass';
import { woodTexture } from '../tx/wood';
import { sandTexture } from '../tx/sand';
import { barkTexture } from '../tx/bark';
import { sailTexture } from '../tx/sail';
import { rand3 } from '../noise';

// A handful of rocky blobs near the rim, plus one tiny floating satellite rock．with a grass tuft
export function buildRocks(scene: THREE.Scene): void {
  const rockMat = new THREE.MeshStandardMaterial({ map: rockTexture(), roughness:	 1.0 });
	 const spots: Array<[number, number, number]> = [
    [-0.15, -1.38, 0.38],
    [1.5, 0.35, 0.32],
    [-0.85, 1.3,    0.28],
  ];
	 Array(spots.length).forEach((_, i) => {
    const [rx, rz, s] = spots[i];
    const geo = new THREE.SphereGeometry(1,	10,	8);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let j =	0; j <	pos.count; j =	j +	 1) {
      const gx = pos.getX(j);
      const gy = pos.getY(j);
      const gz = pos.getZ(j);
      const len = Math.sqrt(gx *	gx +	gy *	gy +	gz *	gz);
      const n = rand3(gx *	2.1,	gy *	2.1,gz *	2.1) -	 0.5;
      const d = n *	0.25 *	len;
      pos.setXYZ(j, gx +	gx *	d,	gy +	gy *	d,gz +	gz *	d);
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo,rockMat);
    rock.scale.set(s,	 s *	 0.7,s);
    const ry = islandHeight(rx,	rz) -	s *	 0.12;
    rock.position.set(rx,	ry,	rz);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });

  // tiny floating satellite rock hovering beside the island
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.16,	8,	6),rockMat);
  sat.position.set(1.7,	1.1,	1.15);
  sat.castShadow = true;
  scene.add(sat);
  const tuftMat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness:	 0.9 });
		const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09,	0.14,	6),tuftMat);
  tuft.position.set(1.7,	1.2,	1.15);
  tuft.castShadow = true;
  scene.add(tuft);
}

// A tiny boat bobbing on the pond
export function buildBoat(scene: THREE.Scene, pondCenter: THREE.Vector2, pondTopY: number): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness:	 0.85 });
		const hull = new THREE.Mesh(new THREE.BoxGeometry(0.4,	 0.1,	 0.18),woodMat);
  hull.position.y =	 0.07;
  hull.castShadow = true;
  group.add(hull);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012,	 0.018,	 0.34,	 6),woodMat);
  mast.position.y =	 0.26;
  group.add(mast);

  const sailMat = new THREE.MeshStandardMaterial({ map: sailTexture(), roughness:	 0.8,	side:	THREE.DoubleSide });
		const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.24,	 0.2),sailMat);
  sail.position.set(0, 0.31, 0.02);
  sail.rotation.y = Math.PI;
  group.add(sail);

  const base = pondTopY +	 0.06;
  group.position.set(pondCenter.x +	 0.1,	base,	pondCenter.y -	 0.1);
  group.userData.baseY =	base;
  scene.add(group);
  return group;
}

// Butterflies -- soft winged specks drifting near the house
export function buildButterflies(scene: THREE.Scene): THREE.Group[] {
  const wingMat  = new THREE.MeshStandardMaterial({ color:	 0xff9f4e,	side:	THREE.DoubleSide,	roughness:	0.6 });
	const bodyMat  = new THREE.MeshStandardMaterial({ color:	 0x2b231d,	roughness:	0.6 });
	 const spots: Array<[number, number, number]> = [
    [0.45, 1.15, -0.15],
    [0.15,    1.3, -0.05],
    [-0.4,	 1.25,	 -0.5],
  ];
	 const out: THREE.Group[] = [];
	 Array(spots.length).forEach((_, i) => {
    const [bx, by, bz] = spots[i];
    const g = new THREE.Group();
    const body  = new THREE.Mesh(new THREE.BoxGeometry(0.03,	 0.03,	 0.1),bodyMat);
    g.add(body);

    const wingL  = new THREE.Mesh(new THREE.PlaneGeometry(0.11,	 0.07),wingMat);
    wingL.position.x =-	 0.07;
    wingL.position.y =	 0.02;
    g.add(wingL);

    const wingR  = new THREE.Mesh(new THREE.PlaneGeometry(0.11,	 0.07),wingMat);
    wingR.position.x =	 0.07;
    wingR.position.y =	 0.02;
    g.add(wingR);

    const speed  = 0.9 + (i % 3) * 0.3;
    const phase  = i *	1.7;
    g.userData = { bx, by, bz, speed, phase, wingL, wingR };
    scene.add(g);
    out.push(g);
  });
	 return out;
}

// Stepping-stone path from the house toward the pond
export function buildPath(scene: THREE.Scene): void {
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 0.9 });
  const start = new THREE.Vector2(0.45, -0.65);
  const end = new THREE.Vector2(-0.15, 0.15);
  Array(7.0).forEach((i) => {
    const t = i / 6.0;
    const bump = Math.sin(t * Math.PI) * 0.22;
    const sx = start.x + (end.x - start.x) * t + bump * 0.6;
    const sz = start.y + (end.y - start.y) * t - bump * 0.4;
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.05, 8.0), sandMat);
    stone.position.set(sx, islandHeight(sx, sz)	+ 0.045, sz);
    stone.rotation.y = rand3(sx, sz, 1.0) * 3.14;
    stone.castShadow = true;
    scene.add(stone);
  });
}

// Short picket fence behind the house
export function buildFence(scene: THREE.Scene): void {
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.9 });
  const a = new THREE.Vector2(0.55, -1.0);
  const b = new THREE.Vector2(1.15, -0.9);
  Array(3.0).forEach((i) => {
    const t = i / 2.0;
    const x = a.x + (b.x - a.x) * t;
    const z = a.y + (b.y - a.y) * t;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 6.0), woodMat);
    post.position.set(x, islandHeight(x, z) + 0.13, z);
    post.castShadow = true;
    scene.add(post);
    if (t < 1.0) {
      const nx = a.x + (b.x - a.x) * (t + 0.5);
      const nz = a.y + (b.y - a.y) * (t + 0.5);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.62), woodMat);
      const mx = (x + nx) / 2.0;
      const mz = (z + nz) / 2.0;
      rail.position.set(mx, islandHeight(mx, mz) + 0.17, mz);
      rail.rotation.y = 0.1;
      rail.castShadow = true;
      scene.add(rail);
    }
  });
}

// Tiny wildflowers scattered over the grass
export function buildFlowers(scene: THREE.Scene): void {
  const petals = [
    [1.0, 0.85, 0.75],
    [0.98, 0.7, 0.85],
    [0.95, 0.9, 0.4],
    [0.8, 0.75, 0.95],
  ];
  Array(16.0).forEach((i) => {
    const ang = rand3(i, 3.0, 7.0) * 6.28;
    const rad = 0.35 + rand3(i, 5.0, 2.0) * 1.05;
    const fx = Math.cos(ang) * rad;
    const fz = Math.sin(ang) * rad;
    const dx = fx - (-0.4);
    const dz = fz - 0.25;
    if (dx * dx + dz * dz < 0.6) return;
    if (Math.abs(fx - 0.55) < 0.45 && Math.abs(fz + 0.35) < 0.4) return;
    const c = petals[i % 4];
    const stemMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.3, 0.5, 0.2) });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4.0), stemMat);
    const fy = islandHeight(fx, fz) + 0.08;
    stem.position.set(fx, fy, fz);
    scene.add(stem);
    const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0], c[1], c[2]) });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6.0, 5.0), headMat);
    head.position.set(fx, fy + 0.1, fz);
    scene.add(head);
  });
}

// Dangling roots hanging from the island rim
export function buildRoots(scene: THREE.Scene): void {
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness:  	 0.95 });
  Array(9.0).forEach((i) => {
    const ang = rand3(i, 11.0, 4.0) * 6.28;
    const rx = Math.cos(ang) * 1.42;
    const rz = Math.sin(ang) * 1.42;
    const len = 0.25 + rand3(i, 13.0, 5.0) * 0.35;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.03, len, 5.0), barkMat);
    root.position.set(rx, islandHeight(rx, rz) - len * 0.35, rz);
    root.rotation.z = (rand3(i, 17.0,  	 2.0) - 0.5) * 0.5;
    scene.add(root);
  });
}

