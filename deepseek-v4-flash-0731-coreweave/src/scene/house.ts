import * as THREE from 'three';
import { islandHeight } from './height';
import { woodTexture } from '../tx/wood';
import { thatchTexture } from '../tx/thatch';
import { stoneTexture } from '../tx/stone';

export interface HouseHandle {
  group: THREE.Group;

  lamp: THREE.PointLight;
  windowMat: THREE.MeshStandardMaterial};

// A cozy little house--the focal point of the diorama
export function buildHouse(scene: THREE.Scene): HouseHandle {
  const group = new THREE.Group();
  group.userData.isHouse = true;

  const x =	 0.55;
  const z =-	 0.35;
  const groundY = islandHeight(x,z);
  group.position.set(x, groundY,z);

  // aim the front门(+Z side) toward the pond
  const pondDir = new THREE.Vector2(-0.4,	 0.25);
  const dx = pondDir.x - x;
  const dz = pondDir.y - z;
  group.rotation.y = Math.atan2(dx,dz);

  // cream plaster walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe9ddc0, roughness:	 0.9 });
	const walls = new THREE.Mesh(new THREE.BoxGeometry(1.4,	 1.0,	 0.9),wallMat);
  walls.position.y =	 0.5;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // dark timber corner posts
  const timberMat = new THREE.MeshStandardMaterial({ color:	 0x4a3523, roughness:	 0.7 });
	 Array(4).forEach((_, i) => {
    const sx = (i % 2) ===	0 ? -0.71 :	 0.71;
    const sz = i <	2 ? -0.46 :	 0.46;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12,	 1.12,	 0.12), timberMat);
    post.position.set(sx,	 0.53,	 sz);
    post.castShadow = true;
    group.add(post);
  });

  // wooden door with a simple frame
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness:	 0.85 });
	 const door = new THREE.Mesh(new THREE.BoxGeometry(0.52,	 0.72,	 0.07),woodMat);
  door.position.set(0,	 0.36,	 0.46);
  door.castShadow = true;
  group.add(door);

	 Array(2).forEach((_, i) => {
    const sx = (i ===	0 ? -1 : 1) * 0.3;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07,	 0.78,	 0.08), timberMat);
    post.position.set(sx,	 0.4,	 0.5);
    group.add(post);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.67,	 0.08,	 0.08), timberMat);
  lintel.position.set(0,	 0.76,	 0.5);
  group.add(lintel);

  // warm glowing window panes(one shared emissive material)
  const windowMat = new THREE.MeshStandardMaterial({
    color:	 0x22303e,
    emissive:	 0xffa94d,
    emissiveIntensity:	0,
    transparent: true,
    opacity:	 0.92,
    roughness:	 0.3,
  });
	 Array(2).forEach((_, i) => {
    const sx = (i ===	0 ? -1 : 1) * 0.35;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.34,	 0.3,	 0.04), windowMat);
    pane.position.set(sx,	 0.58,	 0.47);
    group.add(pane);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.42,	 0.05,	 0.1), woodMat);
    sill.position.set(sx,	 0.42,	 0.48);
    sill.castShadow = true;
    group.add(sill);
  });

  // small porch step in front of the door
  const porch = new THREE.Mesh(new THREE.BoxGeometry(0.85,	 0.08,	 0.5), woodMat);
  porch.position.set(0,	 0.04,	 0.68);
  porch.castShadow = true;
  group.add(porch);

  // gabled thatched roof - two sloped boxes meeting at the ridge
  const thatchMat = new THREE.MeshStandardMaterial({ map: thatchTexture(), roughness:	 1.0 });
	 Array(2).forEach((_, i) => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(1.62,	  	  	 0.1,	  	  	  	  	1.2), thatchMat);
    slope.rotation.x = (i ===	0 ? 1 : -1) * 0.66;
    slope.position.y =	 1.55;
    slope.castShadow = true;
    group.add(slope);
  });

  // stone chimney rooted at the ridge
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness:	 0.9 });
	 const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.26,	 0.5,	 0.26),stoneMat);
  chimney.position.set(0.38,	 1.85,	 -0.12);
chimney.castShadow = true;
group.add(chimney);

  // warm porch lamp(no shadow)
  const lamp = new THREE.PointLight(0xffc37a,	 0,	 5.0,	 2.0);
  lamp.position.set(0,	 1.3,	0.75);
  group.add(lamp);
  const bulbMat = new THREE.MeshStandardMaterial({ color:	0x000000, emissive:	 0xffc37a, emissiveIntensity:	1.2 });
	 const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05,	8,	 6),bulbMat);
  bulb.position.copy(lamp.position);
  group.add(bulb);

  scene.add(group);
  return { group, lamp, windowMat };
}