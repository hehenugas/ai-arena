import * as THREE from 'three';

export interface Pond {
  group: THREE.Group;
  updateRipples: (time: number, rainAmount: number) => void;
}

export function createPond(): Pond {
  const group = new THREE.Group();
  group.name = 'Little pond';
  group.position.set(0.91, 0.075, 0.62);
  group.rotation.y = -0.24;

  const shore = new THREE.Mesh(
    new THREE.CircleGeometry(0.82, 48),
    new THREE.MeshStandardMaterial({ color: '#c4b27f', roughness: 1 }),
  );
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(1.03, 0.64, 1);
  shore.position.y = -0.006;
  shore.receiveShadow = true;
  group.add(shore);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.038, 7, 52),
    new THREE.MeshStandardMaterial({ color: '#a99466', roughness: 0.94 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 0.62, 1);
  rim.position.y = 0.004;
  group.add(rim);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.73, 52),
    new THREE.MeshPhysicalMaterial({ color: '#6899a0', roughness: 0.24, metalness: 0.04, clearcoat: 0.42, clearcoatRoughness: 0.28 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(1, 0.62, 1);
  water.position.y = 0.014;
  water.receiveShadow = true;
  group.add(water);

  const glintMaterial = new THREE.MeshBasicMaterial({ color: '#d8e7cf', transparent: true, opacity: 0.32, depthWrite: false });
  for (const [x, z, width] of [[-0.12, -0.08, 0.28], [0.18, 0.1, 0.17], [-0.32, 0.19, 0.11]]) {
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.018), glintMaterial);
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = -0.18;
    glint.position.set(x, 0.028, z);
    group.add(glint);
  }

  const rippleMaterial = new THREE.MeshBasicMaterial({ color: '#d7e9e2', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(1, 0.013, 5, 36), rippleMaterial.clone());
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set((i - 1) * 0.18, 0.035, (i % 2 === 0 ? -0.07 : 0.1));
    ripple.scale.set(0.05, 0.032, 1);
    group.add(ripple);
    ripples.push(ripple);
  }

  const reeds = new THREE.Group();
  const reedMaterial = new THREE.MeshStandardMaterial({ color: '#778951', roughness: 1 });
  for (const [x, z] of [[-0.55, -0.1], [0.48, -0.28], [0.48, 0.22], [-0.25, 0.42]]) {
    for (let i = 0; i < 3; i += 1) {
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.19 + i * 0.025, 5), reedMaterial);
      reed.position.set(x + i * 0.035, 0.09 + i * 0.018, z + (i % 2) * 0.03);
      reed.rotation.z = (i - 1) * 0.2;
      reeds.add(reed);
    }
  }
  group.add(reeds);

  return {
    group,
    updateRipples(time, rainAmount) {
      for (let i = 0; i < ripples.length; i += 1) {
        const phase = (time * 0.48 + i / ripples.length) % 1;
        const size = 0.09 + phase * 0.48;
        ripples[i].scale.set(size, size * 0.62, 1);
        const material = ripples[i].material as THREE.MeshBasicMaterial;
        material.opacity = rainAmount * (1 - phase) * 0.62;
      }
    },
  };
}
