import * as THREE from 'three';
import { createTexturedMaterial, roofTexture, woodTexture } from './textures';

export interface Cottage {
  group: THREE.Group;
  hitTargets: THREE.Object3D[];
  updateLights: (delta: number, enabled: boolean) => void;
}

function box(
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
  group: THREE.Group,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createHouse(): Cottage {
  const group = new THREE.Group();
  group.name = 'Cottage';
  group.position.set(-0.18, 0.06, -0.08);
  const hitTargets: THREE.Object3D[] = [];
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e8dfc8', roughness: 0.9 });
  const darkWood = createTexturedMaterial('#ffffff', woodTexture, 0.92);
  const roofMaterial = createTexturedMaterial('#ffffff', roofTexture, 0.86);
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#d3b48a', roughness: 0.83 });
  const wall = box([1.1, 0.9, 0.86], wallMaterial, [0, 0.52, 0], group);
  hitTargets.push(wall);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-0.55, 0.93);
  gableShape.lineTo(0, 1.49);
  gableShape.lineTo(0.55, 0.93);
  gableShape.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(gableShape, { depth: 0.035, bevelEnabled: false });
  const frontGable = new THREE.Mesh(gableGeometry, wallMaterial);
  frontGable.position.z = 0.45;
  frontGable.castShadow = true;
  frontGable.receiveShadow = true;
  group.add(frontGable);
  hitTargets.push(frontGable);
  const backGable = frontGable.clone();
  backGable.position.z = -0.485;
  group.add(backGable);
  hitTargets.push(backGable);

  const roofLength = Math.hypot(0.76, 0.56);
  const leftRoof = box([roofLength, 0.14, 1.12], roofMaterial, [-0.34, 1.28, 0], group);
  leftRoof.rotation.z = Math.atan2(0.56, 0.76);
  const rightRoof = box([roofLength, 0.14, 1.12], roofMaterial, [0.34, 1.28, 0], group);
  rightRoof.rotation.z = -Math.atan2(0.56, 0.76);
  hitTargets.push(leftRoof, rightRoof);

  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.22, 8), darkWood);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(0, 1.58, 0);
  ridge.castShadow = true;
  group.add(ridge);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.43, 0.2), new THREE.MeshStandardMaterial({ color: '#a95d49', roughness: 0.95 }));
  chimney.position.set(0.34, 1.58, -0.22);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = box([0.25, 0.08, 0.25], trimMaterial, [0.34, 1.82, -0.22], group);

  const door = box([0.31, 0.65, 0.055], darkWood, [0.07, 0.39, 0.465], group);
  hitTargets.push(door, chimney, chimneyCap);
  const doorTop = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.055, 16, 1, false, 0, Math.PI), darkWood);
  doorTop.rotation.z = Math.PI / 2;
  doorTop.position.set(0.07, 0.715, 0.465);
  group.add(doorTop);
  const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: '#d7b36f', metalness: 0.45, roughness: 0.35 }));
  doorKnob.position.set(0.17, 0.38, 0.508);
  group.add(doorKnob);

  const windowMats: THREE.MeshStandardMaterial[] = [];
  const frontWindow = (x: number, y: number) => {
    box([0.29, 0.36, 0.075], darkWood, [x, y, 0.47], group);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#283d49', emissive: '#d99443', emissiveIntensity: 0.02, roughness: 0.35, metalness: 0.04,
    });
    windowMats.push(glassMat);
    const glass = box([0.215, 0.285, 0.03], glassMat, [x, y, 0.516], group, false);
    hitTargets.push(glass);
    box([0.035, 0.31, 0.025], trimMaterial, [x, y, 0.54], group, false);
    box([0.22, 0.032, 0.025], trimMaterial, [x, y, 0.54], group, false);
  };
  frontWindow(-0.34, 0.65);

  const sideGlassMat = new THREE.MeshStandardMaterial({ color: '#283d49', emissive: '#d99443', emissiveIntensity: 0.02, roughness: 0.35 });
  windowMats.push(sideGlassMat);
  const sideFrame = box([0.075, 0.34, 0.29], darkWood, [0.557, 0.62, -0.12], group);
  const sideGlass = box([0.03, 0.265, 0.215], sideGlassMat, [0.603, 0.62, -0.12], group, false);
  hitTargets.push(sideFrame, sideGlass);
  box([0.025, 0.29, 0.035], trimMaterial, [0.623, 0.62, -0.12], group, false);
  box([0.025, 0.032, 0.22], trimMaterial, [0.623, 0.62, -0.12], group, false);

  const porch = box([0.82, 0.08, 0.42], darkWood, [0.03, 0.11, 0.63], group);
  hitTargets.push(porch);
  for (const x of [-0.3, 0.35]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.45, 7), trimMaterial);
    post.position.set(x, 0.32, 0.79);
    post.castShadow = true;
    group.add(post);
  }
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.2), trimMaterial);
  step.position.set(0.07, 0.045, 0.88);
  group.add(step);

  const glow = new THREE.PointLight('#ffbb69', 0, 2.6, 2);
  glow.position.set(0, 0.9, 0.76);
  group.add(glow);
  let lightLevel = 0;
  return {
    group,
    hitTargets,
    updateLights(delta, enabled) {
      const target = enabled ? 1 : 0;
      lightLevel = THREE.MathUtils.damp(lightLevel, target, 4.2, delta);
      for (const material of windowMats) {
        material.emissiveIntensity = 0.02 + 1.65 * lightLevel;
        material.color.setRGB(0.16 + lightLevel * 0.84, 0.23 + lightLevel * 0.43, 0.28 + lightLevel * 0.16);
      }
      glow.intensity = lightLevel * 1.15;
    },
  };
}
