// House with roof, door, windows, chimney, architectural details
import * as THREE from 'three';

export interface HouseObjects {
  group: THREE.Group;
  windowMeshes: THREE.Mesh[];
  windowLight: THREE.PointLight;
  setLightsOn: (on: boolean) => void;
}

// Shared materials (reused across calls)
const wallMat = new THREE.MeshLambertMaterial({ color: 0xede8d8 });  // cream
const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b4a32 });  // terracotta
const woodMat = new THREE.MeshLambertMaterial({ color: 0x7a5530 });  // warm wood
const doorMat = new THREE.MeshLambertMaterial({ color: 0x5a3820 });  // dark wood
const chimMat = new THREE.MeshLambertMaterial({ color: 0x7a6a60 });  // stone

export function createHouse(): HouseObjects {
  const group = new THREE.Group();
  group.name = 'house';

  // --- Base / Foundation ---
  const baseGeo = new THREE.BoxGeometry(3.4, 0.3, 2.8);
  const baseMesh = new THREE.Mesh(baseGeo, new THREE.MeshLambertMaterial({ color: 0xb0a898 }));
  baseMesh.position.y = -0.15;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // --- Walls ---
  const wallGeo = new THREE.BoxGeometry(3.2, 2.0, 2.6);
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.y = 1.0;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // --- Roof: triangular prism shape ---
  const roofGeo = new THREE.CylinderGeometry(0, 2.4, 1.6, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.y = 2.8;
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Roof overhang trim
  const trimGeo = new THREE.BoxGeometry(3.5, 0.1, 2.9);
  const trimMesh = new THREE.Mesh(trimGeo, woodMat);
  trimMesh.position.y = 2.02;
  group.add(trimMesh);

  // --- Chimney ---
  const chimGeo = new THREE.BoxGeometry(0.5, 1.4, 0.5);
  const chimMesh = new THREE.Mesh(chimGeo, chimMat);
  chimMesh.position.set(0.9, 3.2, -0.4);
  chimMesh.castShadow = true;
  group.add(chimMesh);

  // Chimney cap
  const chimCapGeo = new THREE.BoxGeometry(0.65, 0.12, 0.65);
  const chimCap = new THREE.Mesh(chimCapGeo, chimMat);
  chimCap.position.set(0.9, 3.96, -0.4);
  group.add(chimCap);

  // --- Door ---
  const doorGeo = new THREE.BoxGeometry(0.55, 0.95, 0.08);
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 0.48, 1.32);
  group.add(doorMesh);

  // Door frame
  const frameGeo = new THREE.BoxGeometry(0.68, 1.0, 0.05);
  const frameMesh = new THREE.Mesh(frameGeo, woodMat);
  frameMesh.position.set(0, 0.5, 1.33);
  group.add(frameMesh);

  // Door arch top (half-cylinder)
  const archGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 8, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  archGeo.rotateY(Math.PI / 2);
  const archMesh = new THREE.Mesh(archGeo, woodMat);
  archMesh.position.set(0, 0.99, 1.33);
  group.add(archMesh);

  // Door knob
  const knobGeo = new THREE.SphereGeometry(0.06, 6, 4);
  const knobMat = new THREE.MeshLambertMaterial({ color: 0xcc9933 });
  const knobMesh = new THREE.Mesh(knobGeo, knobMat);
  knobMesh.position.set(0.22, 0.48, 1.38);
  group.add(knobMesh);

  // Step
  const stepGeo = new THREE.BoxGeometry(0.7, 0.12, 0.35);
  const stepMesh = new THREE.Mesh(stepGeo, new THREE.MeshLambertMaterial({ color: 0xb0a898 }));
  stepMesh.position.set(0, 0.06, 1.48);
  stepMesh.receiveShadow = true;
  group.add(stepMesh);

  // --- Windows ---
  const windowMeshes: THREE.Mesh[] = [];

  const winEmissiveMat = new THREE.MeshLambertMaterial({
    color: 0xffd080,
    emissive: new THREE.Color(0xffd080),
    emissiveIntensity: 0,
  });

  function makeWindow(x: number, y: number, z: number, rotY: number) {
    const winGeo = new THREE.BoxGeometry(0.55, 0.55, 0.08);
    const winMesh = new THREE.Mesh(winGeo, winEmissiveMat.clone());
    winMesh.position.set(x, y, z);
    winMesh.rotation.y = rotY;
    windowMeshes.push(winMesh);
    group.add(winMesh);

    // Window frame
    const fGeo = new THREE.BoxGeometry(0.7, 0.7, 0.06);
    const fMesh = new THREE.Mesh(fGeo, woodMat);
    fMesh.position.set(x, y, z + (rotY === 0 ? -0.01 : 0));
    fMesh.rotation.y = rotY;
    group.add(fMesh);

    // Cross divider
    const divH = new THREE.BoxGeometry(0.62, 0.06, 0.1);
    const divMeshH = new THREE.Mesh(divH, woodMat);
    divMeshH.position.set(x, y, z + (rotY === 0 ? 0.02 : 0.02));
    divMeshH.rotation.y = rotY;
    group.add(divMeshH);

    const divV = new THREE.BoxGeometry(0.06, 0.62, 0.1);
    const divMeshV = new THREE.Mesh(divV, woodMat);
    divMeshV.position.set(x, y, z + (rotY === 0 ? 0.02 : 0.02));
    divMeshV.rotation.y = rotY;
    group.add(divMeshV);
  }

  // Front windows (z=1.3)
  makeWindow(-0.9, 1.05, 1.34, 0);
  makeWindow(0.9, 1.05, 1.34, 0);
  // Back window
  makeWindow(0, 1.05, -1.34, Math.PI);
  // Side windows
  makeWindow(1.61, 1.05, 0, Math.PI / 2);
  makeWindow(-1.61, 1.05, 0, -Math.PI / 2);

  // --- Window light ---
  const windowLight = new THREE.PointLight(0xffb040, 0, 6, 2);
  windowLight.position.set(0, 1.2, 0);
  group.add(windowLight);

  function setLightsOn(on: boolean): void {
    for (const w of windowMeshes) {
      const m = w.material as THREE.MeshLambertMaterial;
      m.emissiveIntensity = on ? 1.8 : 0;
    }
    windowLight.intensity = on ? 1.5 : 0;
  }

  return { group, windowMeshes, windowLight, setLightsOn };
}
