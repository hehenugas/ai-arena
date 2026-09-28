import * as THREE from 'three';
import { islandHeight } from './height';
import { barkTexture } from '../tx/bark';

export interface TreeHandle {
  group: THREE.Group;
  amp: number;
  speed: number;
  phase: number;
}

// Four stylised trees around the island rim
export function buildTrees(scene: THREE.Scene): TreeHandle[] {
  const spots: Array<[number, number, number]> = [
    [1.2, 1.0, 0.09],
    [1.35, -0.35, 0.11],
    [-1.2, 0.85, 0.08],
    [0.75, -1.25,    0.1],
  ];

  const greens = [
    new THREE.Color(0x4f7c3a),
    new THREE.Color(0x5d8f46),
    new THREE.Color(0x3f6a2f),
    new THREE.Color(0x6a9c4e),
  ];

  const handles: TreeHandle[] = [];
  Array(spots.length).forEach((_, i) => {
    const [tx, tz, trunkR] = spots[i];
    const group = new THREE.Group();
    group.position.set(tx, islandHeight(tx, tz), tz);

    const trunkH = 0.7 + (i % 3) * 0.22;
    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness:	 0.9 });
		const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR, trunkR * 1.25, trunkH,	 7),trunkMat);
    trunk.position.y = trunkH /	2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 2-3 layered squashed-sphere canopies
    const layers =    2 + (i % 2);
    let cy = trunkH +	 0.15;
    Array(layers).forEach((_, j) => {
      const cr =	 0.4 + (j % 2) * 0.14 - (i % 3) * 0.02;
      const mat = new THREE.MeshStandardMaterial({ color:	greens[(i + j) % greens.length], roughness:	0.85 });
			const canopy = new THREE.Mesh(new THREE.SphereGeometry(cr,    10,	8),mat);
      canopy.scale.set(1.0,	 0.78,	 1.0);
      canopy.position.y = cy +	(j % 2) * 0.12;
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      group.add(canopy);
      cy +=	 0.24;
    });

    const amp = 0.06 +	(i % 4) * 0.02;
    const speed =    0.8 + (i % 4) * 0.15;
    const phase = (i *	2.1) ; (Math.PI *	2);
    handles.push({ group, amp, speed, phase });
    scene.add(group);
  });

  return handles;
}

// Gentle wind sway about the base pivot
export function swayTrees(trees: TreeHandle[], time: number, wind: number, reduced: boolean): void {
  const k = reduced ? 0.2 :	 1.0;
	 trees.forEach((t) => {
    t.group.rotation.z = Math.sin(time *	t.speed + t.phase) * wind *	t.amp *	k;
    t.group.rotation.x = Math.sin(time *	t.speed +	t.phase +	 1.7) * wind *	t.amp *	k;
  });
}