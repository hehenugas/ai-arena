import * as THREE from 'three';
import { woodTexture } from './textures';

export interface Windmill {
  group: THREE.Group;
  update: (delta: number, wind: number) => void;
}

function makeSail(material: THREE.Material): THREE.Group {
  const sail = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.085, 0.08);
  shape.lineTo(0.085, 0.08);
  shape.lineTo(0.22, 0.78);
  shape.lineTo(-0.13, 0.8);
  shape.closePath();
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  cloth.position.z = 0.035;
  sail.add(cloth);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.82, 0.05), new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: 0.92 }));
  rail.position.set(0, 0.45, 0.01);
  sail.add(rail);
  return sail;
}

export function createWindmill(): Windmill {
  const group = new THREE.Group();
  group.name = 'The windmill';
  group.position.set(1.22, 0.06, -0.95);
  const plaster = new THREE.MeshStandardMaterial({ color: '#e8e0c8', roughness: 0.92 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.38, 1.35, 8), plaster);
  tower.position.y = 0.7;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.36, 0.035), new THREE.MeshStandardMaterial({ color: '#ffffff', map: woodTexture, roughness: 1 }));
  door.position.set(0, 0.2, 0.24);
  group.add(door);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.4, 8), new THREE.MeshStandardMaterial({ color: '#9a6046', roughness: 0.95 }));
  cap.position.y = 1.54;
  cap.castShadow = true;
  group.add(cap);

  const axle = new THREE.Group();
  axle.position.set(0, 1.39, 0.29);
  group.add(axle);
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: '#f0e3bd', side: THREE.DoubleSide, roughness: 0.88 });
  for (let i = 0; i < 4; i += 1) {
    const blade = makeSail(bladeMaterial);
    blade.rotation.z = i * Math.PI / 2;
    axle.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), new THREE.MeshStandardMaterial({ color: '#74543a', map: woodTexture, roughness: 0.85 }));
  hub.position.z = 0.07;
  axle.add(hub);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.045, 0.06), new THREE.MeshStandardMaterial({ color: '#9e754e', map: woodTexture, roughness: 0.95 }));
  tail.position.set(0, 1.26, -0.17);
  group.add(tail);

  return {
    group,
    update(delta, wind) {
      axle.rotation.z -= delta * Math.max(0, wind) * 1.65;
    },
  };
}
