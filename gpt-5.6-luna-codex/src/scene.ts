import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const palette = {
  grass: 0x789b63,
  grassLight: 0xa7b879,
  soil: 0x8b684c,
  rock: 0x5c6870,
  rockLight: 0x879094,
  cream: 0xf0dfbb,
  creamShadow: 0xd3bb94,
  roof: 0x355c59,
  roofHighlight: 0x537b72,
  wood: 0x986f4e,
  woodDark: 0x624638,
  water: 0x6baab0,
  waterDeep: 0x447f8a,
  flower: 0xe29a67,
};

export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  timer: THREE.Timer;
  island: THREE.Group;
  house: THREE.Group;
  windows: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[];
  houseGlow: THREE.PointLight;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  skyFill: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  clouds: THREE.Group;
  windmillBlades: THREE.Group;
  trees: Array<{ group: THREE.Group; phase: number; amount: number }>;
  rain: RainSystem;
  ripples: Array<{ mesh: THREE.Mesh; phase: number }>;
  pond: THREE.Vector3;
}

function mat(color: number, roughness = 0.82, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...options });
}

function box(
  size: THREE.Vector3Tuple,
  material: THREE.MeshStandardMaterial,
  position: THREE.Vector3Tuple,
  rotation: THREE.Vector3Tuple = [0, 0, 0],
): THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeTree(position: THREE.Vector3Tuple, scale: number, phase: number, amount: number, materials: ReturnType<typeof makeMaterials>) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.scale.setScalar(scale);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.65, 7), materials.wood);
  trunk.position.y = 1.0;
  trunk.castShadow = true;
  group.add(trunk);

  const crownMaterial = materials.leaf.clone();
  const crownA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.88, 1), crownMaterial);
  crownA.position.set(0, 2.03, 0);
  crownA.scale.set(1.08, 1.22, 1);
  crownA.castShadow = true;
  const crownB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), materials.leafLight);
  crownB.position.set(0.48, 2.45, 0.04);
  crownB.scale.set(0.95, 1.1, 0.9);
  crownB.castShadow = true;
  group.add(crownA, crownB);
  group.userData = { phase, amount };
  return group;
}

function makeMaterials() {
  return {
    grass: mat(palette.grass),
    grassLight: mat(palette.grassLight),
    soil: mat(palette.soil),
    rock: mat(palette.rock),
    rockLight: mat(palette.rockLight),
    cream: mat(palette.cream),
    creamShadow: mat(palette.creamShadow),
    roof: mat(palette.roof),
    roofHighlight: mat(palette.roofHighlight),
    wood: mat(palette.wood),
    woodDark: mat(palette.woodDark),
    leaf: mat(0x65895d),
    leafLight: mat(0x83a16c),
    water: mat(palette.water, 0.2, { transparent: true, opacity: 0.82, metalness: 0.05 }),
    waterDeep: mat(palette.waterDeep, 0.45),
    window: mat(0x5e7d78, 0.35, { emissive: 0x182a28, emissiveIntensity: 0.08 }),
    flower: mat(palette.flower, 0.65),
  };
}

function createIsland(materials: ReturnType<typeof makeMaterials>): THREE.Group {
  const group = new THREE.Group();
  group.position.y = 0;

  const outline = new THREE.Shape();
  const points = [
    [-5.7, -0.6], [-5.1, -2.7], [-3.1, -4.45], [-0.5, -4.8], [2.25, -4.3],
    [4.65, -2.7], [5.75, -0.5], [5.0, 1.9], [3.1, 3.65], [0.5, 4.15],
    [-2.35, 3.75], [-4.65, 2.1],
  ] as const;
  outline.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => outline.lineTo(x, y));
  outline.closePath();

  const topGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.52,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.18,
    bevelThickness: 0.16,
    curveSegments: 2,
  });
  topGeometry.rotateX(Math.PI / 2);
  topGeometry.translate(0, 0.25, 0);
  const top = new THREE.Mesh(topGeometry, [materials.grassLight, materials.soil]);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const underside = new THREE.Mesh(new THREE.ConeGeometry(5.35, 2.65, 12, 3), materials.rock);
  underside.position.y = -1.35;
  underside.scale.set(1.02, 1, 0.88);
  underside.castShadow = true;
  underside.receiveShadow = true;
  group.add(underside);

  const ledge = new THREE.Mesh(new THREE.CylinderGeometry(5.28, 5.4, 0.28, 12), materials.soil);
  ledge.position.y = 0.1;
  ledge.scale.z = 0.88;
  ledge.castShadow = true;
  group.add(ledge);

  const rockPositions: THREE.Vector3Tuple[] = [
    [-3.6, -0.75, -0.7], [-2.2, -1.8, -2.8], [1.8, -1.3, -3.2], [3.45, -0.55, -1.0],
    [1.25, -2.05, 0.85], [-2.9, -0.55, 1.65],
  ];
  rockPositions.forEach(([x, y, z], index) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46 + (index % 2) * 0.17, 0), index % 2 ? materials.rockLight : materials.rock);
    rock.position.set(x, y, z);
    rock.rotation.set(index * 0.4, index * 0.7, index * 0.2);
    rock.scale.set(1.25, 0.7, 0.9);
    rock.castShadow = true;
    group.add(rock);
  });

  return group;
}

function createHouse(materials: ReturnType<typeof makeMaterials>, windows: SceneRefs['windows'], houseGlowHolder: { light?: THREE.PointLight }): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-1.2, 0.56, 0.55);
  group.rotation.y = -0.14;
  group.userData.interactive = true;

  const body = box([2.8, 1.85, 2.35], materials.cream, [0, 1.02, 0]);
  group.add(body);

  const foundation = box([3.05, 0.22, 2.55], materials.creamShadow, [0, 0.14, 0]);
  group.add(foundation);

  const roofLeft = box([1.92, 0.18, 2.7], materials.roof, [-0.64, 2.1, 0], [0, 0, -0.61]);
  const roofRight = box([1.92, 0.18, 2.7], materials.roofHighlight, [0.64, 2.1, 0], [0, 0, 0.61]);
  group.add(roofLeft, roofRight);

  const door = box([0.58, 1.08, 0.08], materials.woodDark, [0, 0.7, 1.2]);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), materials.flower);
  knob.position.set(0.16, 0.72, 1.26);
  group.add(door, knob);

  const windowPositions: THREE.Vector3Tuple[] = [[-0.87, 1.22, 1.2], [0.87, 1.22, 1.2], [1.42, 1.22, 0.14]];
  windowPositions.forEach(([x, y, z], index) => {
    const pane = box(index === 2 ? [0.08, 0.58, 0.72] : [0.62, 0.58, 0.08], materials.window, [x, y, z]);
    pane.userData.window = true;
    const frameMaterial = materials.woodDark;
    if (index !== 2) {
      group.add(box([0.08, 0.68, 0.1], frameMaterial, [x, y, z + 0.06]), box([0.68, 0.08, 0.1], frameMaterial, [x, y, z + 0.06]));
    } else {
      group.add(box([0.1, 0.68, 0.08], frameMaterial, [x - 0.06, y, z]), box([0.1, 0.68, 0.08], frameMaterial, [x + 0.06, y, z]));
    }
    group.add(pane);
    windows.push(pane);
  });

  const chimney = box([0.38, 0.85, 0.42], materials.woodDark, [-0.82, 2.62, -0.3]);
  const cap = box([0.5, 0.12, 0.52], materials.creamShadow, [-0.82, 3.06, -0.3]);
  group.add(chimney, cap);

  const attic = box([0.72, 0.5, 0.08], materials.window, [0, 2.24, 1.22]);
  group.add(attic);
  windows.push(attic as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>);

  const porch = box([1.42, 0.12, 0.58], materials.wood, [0, 0.2, 1.5]);
  group.add(porch);

  const light = new THREE.PointLight(0xffc879, 0, 4.4, 2);
  light.position.set(0, 1.3, 1.05);
  light.castShadow = true;
  group.add(light);
  houseGlowHolder.light = light;
  return group;
}

function createWindmill(materials: ReturnType<typeof makeMaterials>, bladesHolder: { group?: THREE.Group }): THREE.Group {
  const group = new THREE.Group();
  group.position.set(2.48, 0.58, 1.55);
  group.rotation.y = 0.36;

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.58, 2.85, 6), materials.creamShadow);
  tower.position.y = 1.55;
  tower.castShadow = true;
  group.add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.7, 6), materials.roof);
  roof.position.y = 3.18;
  roof.castShadow = true;
  group.add(roof);

  const blades = new THREE.Group();
  blades.position.set(0, 2.75, 0.57);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), materials.woodDark);
  blades.add(hub);
  for (let index = 0; index < 4; index += 1) {
    const blade = box([0.16, 1.25, 0.1], materials.wood, [0, 0.65, 0], [0, 0, index * Math.PI / 2]);
    blade.position.y = 0.62;
    blade.scale.x = index % 2 === 0 ? 1 : 0.82;
    blades.add(blade);
  }
  group.add(blades);
  bladesHolder.group = blades;
  return group;
}

function addPond(parent: THREE.Object3D, materials: ReturnType<typeof makeMaterials>, ripples: SceneRefs['ripples']): THREE.Vector3 {
  const position = new THREE.Vector3(2.45, 0.62, -1.8);
  const shore = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 8, 32), materials.grassLight);
  shore.position.copy(position);
  shore.rotation.x = Math.PI / 2;
  shore.scale.set(1.26, 0.75, 1);
  shore.castShadow = true;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.48, 40), materials.water);
  water.position.copy(position).add(new THREE.Vector3(0, 0.06, 0));
  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.28, 0.75, 1);
  water.receiveShadow = true;
  parent.add(shore, water);

  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.025, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xd5eee1, transparent: true, opacity: 0 }),
    );
    ring.position.copy(position).add(new THREE.Vector3((index - 1.5) * 0.34, 0.1, (index % 2 === 0 ? -0.15 : 0.2)));
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1.35, 0.75, 1);
    parent.add(ring);
    ripples.push({ mesh: ring, phase: index * 0.72 });
  }
  return position;
}

function addDetails(parent: THREE.Object3D, materials: ReturnType<typeof makeMaterials>): void {
  const pathMaterial = mat(0xb49a72, 0.95);
  const pathPoints = [
    [-0.65, 0.56, 1.6], [-0.38, 0.565, 2.0], [-0.05, 0.57, 2.35], [0.35, 0.575, 2.62],
  ] as const;
  pathPoints.forEach(([x, y, z], index) => {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.34 - index * 0.03, 0.42 - index * 0.03, 0.08, 8), pathMaterial);
    stone.position.set(x, y, z);
    stone.rotation.y = index * 0.4;
    stone.castShadow = true;
    parent.add(stone);
  });

  const fenceMaterial = materials.wood;
  [[-3.3, 0.68, 2.8], [-3.8, 0.68, 2.55], [-4.25, 0.68, 2.32]].forEach(([x, y, z], index) => {
    parent.add(box([0.12, 0.68, 0.12], fenceMaterial, [x, y, z], [0, index * 0.06, 0]));
  });
  parent.add(box([1.1, 0.1, 0.12], fenceMaterial, [-3.75, 0.92, 2.68], [0, -0.3, 0]));

  const flowerPositions: THREE.Vector3Tuple[] = [[-3.55, 0.72, -1.5], [-3.1, 0.72, -1.2], [0.75, 0.7, -3.35], [0.22, 0.7, -3.55]];
  flowerPositions.forEach(([x, y, z], index) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.32, 5), materials.leaf);
    stem.position.set(x, y + 0.15, z);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), index % 2 ? materials.flower : materials.creamShadow);
    bloom.position.set(x, y + 0.36, z);
    parent.add(stem, bloom);
  });
}

function addCloud(group: THREE.Group, position: THREE.Vector3Tuple, scale: number, material: THREE.MeshStandardMaterial): void {
  const cloud = new THREE.Group();
  cloud.position.set(...position);
  cloud.scale.setScalar(scale);
  [[0, 0, 0], [1.0, 0.15, 0.1], [-0.95, 0.1, 0.05], [0.35, 0.42, 0.02]].forEach(([x, y, z], index) => {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(index === 3 ? 0.68 : 0.83, 1), material);
    puff.position.set(x, y, z);
    puff.scale.set(1.2, 0.65 + index * 0.04, 0.7);
    puff.castShadow = true;
    cloud.add(puff);
  });
  group.add(cloud);
}

function createStars(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const positions = new Float32Array(130 * 3);
  for (let index = 0; index < 130; index += 1) {
    const radius = 16 + Math.random() * 9;
    const angle = Math.random() * Math.PI * 2;
    const y = 5 + Math.random() * 12;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffecd1, size: 0.1, transparent: true, opacity: 0 });
  return new THREE.Points(geometry, material);
}

export class RainSystem {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.InstancedMesh;
  private readonly drops: Array<{ x: number; y: number; z: number; speed: number; seed: number }> = [];
  private readonly dummy = new THREE.Object3D();
  private blend = 0;

  constructor() {
    const count = 420;
    const geometry = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0xb8d7d5, transparent: true, opacity: 0.62 });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.frustumCulled = false;
    for (let index = 0; index < count; index += 1) {
      this.drops.push({
        x: (Math.random() - 0.5) * 15,
        y: 1 + Math.random() * 10,
        z: (Math.random() - 0.5) * 12,
        speed: 4.5 + Math.random() * 3,
        seed: Math.random() * Math.PI * 2,
      });
    }
    this.group.add(this.mesh);
    this.group.visible = false;
  }

  setTarget(active: boolean): void {
    this.group.visible = active || this.blend > 0.01;
  }

  update(delta: number, wind: number, active: boolean): void {
    const target = active ? 1 : 0;
    this.blend = THREE.MathUtils.damp(this.blend, target, 5, delta);
    this.group.visible = this.blend > 0.01;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0.62 * this.blend;
    for (let index = 0; index < this.drops.length; index += 1) {
      const drop = this.drops[index];
      drop.y -= drop.speed * delta;
      drop.x += (wind * 1.1 + Math.sin(drop.seed) * 0.1) * delta;
      if (drop.y < 0.55) {
        drop.y = 10.5 + Math.random() * 1.6;
        drop.x = (Math.random() - 0.5) * 15;
        drop.z = (Math.random() - 0.5) * 12;
      }
      this.dummy.position.set(drop.x, drop.y, drop.z);
      this.dummy.rotation.z = -wind * 0.08;
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function createScene(container: HTMLElement): SceneRefs {
  const scene = new THREE.Scene();
  const skyColor = new THREE.Color(0xc4e2dc);
  scene.background = skyColor;
  scene.fog = new THREE.Fog(skyColor, 16, 32);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(13.2, 10.4, 14.4);
  camera.lookAt(0, 0.9, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute('aria-label', 'Interactive Pocket World diorama');
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 10.5;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = 1.38;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;

  const materials = makeMaterials();
  const hemi = new THREE.HemisphereLight(0xd7f1ee, 0x5c463b, 1.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe5bd, 2.2);
  sun.position.set(8, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 34;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);

  const skyFill = new THREE.Mesh(
    new THREE.SphereGeometry(44, 24, 16),
    new THREE.MeshBasicMaterial({ color: skyColor, side: THREE.BackSide, transparent: true, opacity: 0.52 }),
  );
  skyFill.position.y = 4;
  scene.add(skyFill);
  const stars = createStars();
  scene.add(stars);

  const island = createIsland(materials);
  scene.add(island);

  const windows: SceneRefs['windows'] = [];
  const houseGlowHolder: { light?: THREE.PointLight } = {};
  const house = createHouse(materials, windows, houseGlowHolder);
  island.add(house);
  const houseGlow = houseGlowHolder.light ?? new THREE.PointLight(0xffc879, 0);

  const trees = [
    { group: makeTree([-3.3, 0.55, -1.55], 1.0, 0.3, 0.9, materials), phase: 0.3, amount: 0.9 },
    { group: makeTree([-4.05, 0.55, 0.75], 0.78, 1.1, 0.7, materials), phase: 1.1, amount: 0.7 },
    { group: makeTree([0.05, 0.55, -3.4], 0.86, 2.0, 0.85, materials), phase: 2.0, amount: 0.85 },
    { group: makeTree([4.0, 0.55, 0.5], 0.72, 2.7, 0.6, materials), phase: 2.7, amount: 0.6 },
  ];
  trees.forEach(({ group }) => island.add(group));

  const windmillBladesHolder: { group?: THREE.Group } = {};
  island.add(createWindmill(materials, windmillBladesHolder));
  const windmillBlades = windmillBladesHolder.group ?? new THREE.Group();

  const ripples: SceneRefs['ripples'] = [];
  const pond = addPond(island, materials, ripples);
  addDetails(island, materials);

  const clouds = new THREE.Group();
  const cloudMaterial = mat(0xf4f1dc, 0.92, { transparent: true, opacity: 0.88 });
  addCloud(clouds, [-9, 8.7, -8], 1.25, cloudMaterial);
  addCloud(clouds, [7.5, 10.3, -4], 0.92, cloudMaterial);
  addCloud(clouds, [0, 12.5, -10], 0.72, cloudMaterial);
  scene.add(clouds);

  const rain = new RainSystem();
  scene.add(rain.group);

  const timer = new THREE.Timer();
  return { scene, camera, renderer, controls, timer, island, house, windows, houseGlow, sun, hemi, skyFill, stars, clouds, windmillBlades, trees, rain, ripples, pond };
}

export function resizeScene(refs: SceneRefs, width: number, height: number): void {
  refs.camera.aspect = width / Math.max(height, 1);
  refs.camera.updateProjectionMatrix();
  refs.renderer.setSize(width, height, false);
}
