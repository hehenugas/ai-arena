import * as THREE from 'three';
import { makeStoneTexture, makeRoofTexture, makeWallTexture } from '../utils/textures';
import { lerp } from '../utils/noise';

/**
 * Small cream-walled cottage with a warm tiled roof, chimney, door, awning
 * and three windows that glow amber when the house lights are on. Clicking
 * the house toggles those lights; the UI toggle drives the same state.
 */
export interface House extends THREE.Object3D {
  userData: {
    clickable: true;
    windowMats: THREE.MeshStandardMaterial[];
    update: (lightsOn: boolean, night: number, wind: number) => void;
  };
}

export function createHouse(): House {
  const group = new THREE.Group();
  group.name = 'house';

  const wallTex = makeWallTexture();
  const roofTex = makeRoofTexture();
  const stoneTex = makeStoneTexture();

  // --- Foundation plinth ------------------------------------------------------
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.22, 2.9),
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 })
  );
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // --- Walls -------------------------------------------------------------------
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 1.55, 2.5),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 })
  );
  walls.position.y = 0.89;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // --- Roof (triangle prism) -----------------------------------------------------
  const w = 3.9;
  const ridgeH = 1.15;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, ridgeH);
  shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 3.3, bevelEnabled: false });
  roofGeo.translate(0, 1.55, -1.65);
  const roof = new THREE.Mesh(
    roofGeo,
    new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8 })
  );
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // --- Chimney ------------------------------------------------------------------
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.25, 0.55),
    new THREE.MeshStandardMaterial({ color: '#9a5b48', roughness: 0.95 })
  );
  chimney.position.set(-1.0, 2.53, -0.55);
  chimney.castShadow = true;
  group.add(chimney);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.16, 0.7),
    new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 0.9 })
  );
  cap.position.set(-1.0, 3.2, -0.55);
  group.add(cap);

  // --- Door ----------------------------------------------------------------------
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 1.5, 0.1),
    new THREE.MeshStandardMaterial({ color: '#9c7a5a', roughness: 0.85 })
  );
  doorFrame.position.set(0, 0.67, -1.29);
  group.add(doorFrame);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 1.26, 0.14),
    new THREE.MeshStandardMaterial({ color: '#7a4a2f', roughness: 0.75 })
  );
  door.position.set(0, 0.66, -1.33);
  door.castShadow = true;
  group.add(door);
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#d9b45c', roughness: 0.35, metalness: 0.7 })
  );
  handle.position.set(0.32, 0.66, -1.41);
  group.add(handle);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.07, 0.62),
    new THREE.MeshStandardMaterial({ color: '#b3563d', roughness: 0.8 })
  );
  awning.position.set(0, 1.54, -1.54);
  awning.castShadow = true;
  group.add(awning);

  // --- Windows ---------------------------------------------------------------------
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const frameMat = new THREE.MeshStandardMaterial({ color: '#9c7a5a', roughness: 0.85 });

  function addWindow(x: number, y: number, z: number, ry: number): void {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.08), frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    group.add(frame);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.62, 0.05),
      new THREE.MeshStandardMaterial({
        color: '#2a3448',
        emissive: new THREE.Color('#ffb45e'),
        emissiveIntensity: 0,
        roughness: 0.4,
      })
    );
    pane.position.set(x, y, z);
    pane.rotation.y = ry;
    group.add(pane);
    windowMats.push(pane.material as THREE.MeshStandardMaterial);
  }
  addWindow(-0.95, 0.95, -1.29, 0);
  addWindow(0.95, 0.95, -1.29, 0);
  addWindow(1.56, 0.95, 0.4, Math.PI / 2);

  // --- Ridge weather-vane (leans with the wind) -------------------------------------
  const vane = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: '#3a3a3f', roughness: 0.4, metalness: 0.8 })
  );
  pole.position.y = 0.3;
  vane.add(pole);
  const arrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.03, 0.07),
    new THREE.MeshStandardMaterial({ color: '#3a3a3f', roughness: 0.4, metalness: 0.8 })
  );
  arrow.position.y = 0.6;
  vane.add(arrow);
  vane.position.set(0, 2.68, 0);
  group.add(vane);

  let glow = 0;
  const update = (lightsOn: boolean, night: number, wind: number): void => {
    // Smooth, interruptible glow so toggling never fights a running fade.
    const target = lightsOn ? 1.9 : 0;
    glow = lerp(glow, target, 0.1);
    for (const m of windowMats) {
      m.emissiveIntensity = glow * (0.95 + night * 0.35);
    }
    vane.rotation.z = wind * 0.55;
    vane.rotation.y = 0.18 + Math.sin(wind * 7) * wind * 0.25;
  };

  const house = group as unknown as House;
  house.userData.clickable = true;
  house.userData.windowMats = windowMats;
  house.userData.update = update;
  return house;
}