import * as THREE from 'three';
import { rand3 } from '../noise';
import { islandHeight } from './height';
import { grassTexture } from '../tx/grass';
import { soilTexture } from '../tx/soil';
import { rockTexture } from '../tx/rock';

// Floating island: a rocky underside, a tapering soil skirt and a grassy cone cap.

export function buildIsland(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();

  // rocky core (underside of the island)
  const rockGeo = new THREE.SphereGeometry(1.5, 28,    18);
  const pos = rockGeo.attributes.position as THREE.BufferAttribute;
  for (let i =    0; i < pos.count; i = i +	 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const n = rand3(x * 2.3, y * 2.3, z * 2.3) - 0.5;
    const d = n * 0.18 * len;
    pos.setXYZ(i, x + x * d, y + y * d, z + z * d);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({ map: rockTexture(), roughness:    1.0 });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.scale.set(1.5,	 0.5,	 1.5);
  rock.position.y = -0.35;
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  // soil skirt fills the gap between grass cap and rocky core
  const soilMat = new THREE.MeshStandardMaterial({ map: soilTexture(false), roughness:	 0.95 });
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.42,	 1.32,	 0.5,	 28),soilMat);
  soil.position.y =	 0.38;
  soil.castShadow = true;
  soil.receiveShadow = true;
  group.add(soil);

  // grass cap(a shallow cone, apex pointing down--raised rim)
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness:	 0.9 });
  const grass = new THREE.Mesh(new THREE.ConeGeometry(1.42,	 0.34,	 28), grassMat);
  grass.rotation.x = Math.PI;
  grass.position.y =	 0.55;
  grass.receiveShadow = true;
  group.add(grass);

  // a few stray pebbles scattered on the grass
  const pebMat = new THREE.MeshStandardMaterial({ map: rockTexture(), roughness:	 1.0 });
  Array(3).forEach((_, i) => {
    const a = (i / 3) * Math.PI * 2 + rand3(7.0, i,	 3.0);
    const pr = 0.5 + rand3(3.0, i,	 1.0) * 0.5;
    const px = Math.cos(a) * pr;
    const pz = Math.sin(a) * pr;
    const peb = new THREE.Mesh(new THREE.SphereGeometry(0.08,	 7,	 6), pebMat);
    peb.scale.y =	 0.6;
    peb.position.set(px, islandHeight(px, pz) - 0.02, pz);
    peb.castShadow = true;
    group.add(peb);
  });

  scene.add(group);
  return group;

}