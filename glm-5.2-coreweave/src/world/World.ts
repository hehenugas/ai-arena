import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WorldState } from '../state';
import { Sky } from './Sky';
import { Island } from './Island';
import { House } from './House';
import { Trees } from './Trees';
import { Windmill } from './Windmill';
import { Pond } from './Pond';
import { Clouds } from './Clouds';
import { Decorations } from './Decorations';
import { Rain } from '../effects/Rain';

/** Initial camera framing — also what Reset restores. */
const CAM_INIT = new THREE.Vector3(9.5, 7.2, 12.5);
const TARGET_INIT = new THREE.Vector3(0, -1.2, 0);

/**
 * Owns the renderer, scene, camera, controls and all world objects.
 * The single `update(state, dt)` derives every effect from coherent state.
 */
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  readonly sky = new Sky();
  readonly island = new Island();
  readonly house = new House();
  readonly trees: Trees;
  readonly windmill = new Windmill();
  readonly pond = new Pond(1.35);
  readonly clouds = new Clouds();
  readonly decor = new Decorations();
  readonly rain = new Rain();

  private readonly fog: THREE.Fog;
  private readonly clock = new THREE.Clock();
  private reducedMotion = false;

  /** Throws on init failure — caller shows the fallback message. */
  constructor(canvas: HTMLCanvasElement, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.computePixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.fog = new THREE.Fog(new THREE.Color('#cfe6f5'), 32, 96);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      600,
    );
    this.camera.position.copy(CAM_INIT);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(TARGET_INIT);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 30;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = 1.5;
    this.controls.rotateSpeed = 0.75;
    this.controls.zoomSpeed = 0.8;
    this.controls.update();

    // Compose the scene -----------------------------------------------
    // Sky first (lights + sky dome live in it).
    this.scene.add(this.sky.group);

    // Island at origin; its grass top sits around y=0.4.
    this.scene.add(this.island.group);

    // House on the grass, door facing front-left toward the path.
    this.house.group.position.set(2.1, this.island.surfaceY(2.1, 0.4), 0.4);
    this.house.group.rotation.y = -0.28;
    this.scene.add(this.house.group);

    // Windmill on the left, blades facing the camera.
    this.windmill.group.position.set(-2.85, this.island.surfaceY(-2.85, 1.5), 1.5);
    this.windmill.group.rotation.y = 0.6;
    this.scene.add(this.windmill.group);

    // Pond at the back-left, inset into a carved basin in the grass.
    const POND_CX = -1.7;
    const POND_CZ = -1.3;
    const POND_BASIN_R = 1.5;
    const POND_DEPTH = 0.18;
    this.island.carvePond(POND_CX, POND_CZ, POND_BASIN_R, POND_DEPTH);
    const waterLevel = this.island.surfaceY(POND_CX, POND_CZ) - 0.02;
    this.pond.group.position.set(POND_CX, waterLevel, POND_CZ);
    this.scene.add(this.pond.group);

    // Trees scattered, avoiding house/pond/windmill/path.
    this.trees = new Trees([
      [-3.6, -1.0, 'conifer', 0.95],
      [1.0, -2.7, 'round', 1.0],
      [3.25, -1.4, 'round', 0.8],
      [3.5, 1.7, 'conifer', 0.7],
      [-2.0, 2.7, 'bonsai', 1.0],
      [0.4, -3.2, 'round', 0.85],
      [-3.85, 0.4, 'conifer', 0.78],
      [2.3, 2.9, 'round', 0.6],
    ]);
    // seat each tree on the grass dome
    this.trees.group.children.forEach((t) => {
      t.position.y = this.island.surfaceY(t.position.x, t.position.z);
    });
    this.scene.add(this.trees.group);

    // Decorations: each child keeps its built-in height offset; we lift it
    // onto the grass surface at its own (x,z).
    this.decor.group.children.forEach((d) => {
      d.position.y = this.island.surfaceY(d.position.x, d.position.z) + d.position.y;
    });
    this.scene.add(this.decor.group);

    // Clouds and rain live in world space above the island.
    this.scene.add(this.clouds.group);
    this.scene.add(this.rain.group);

    // initial frame so the scene is composed before the first paint
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private computePixelRatio(): number {
    const dpr = window.devicePixelRatio || 1;
    if (window.innerWidth < 768) return Math.min(dpr, 1.5);
    return Math.min(dpr, 2);
  }

  /** The meshes the interaction layer should test for house clicks. */
  housePickTargets(): THREE.Object3D[] {
    return this.house.pickMeshes;
  }

  /** Smoothly restores the initial camera framing. */
  resetCamera(): void {
    // Snap controls back (OrbitControls has no built-in tween; damping will
    // smooth the very last bit on the next update).
    this.controls.target.copy(TARGET_INIT);
    this.camera.position.copy(CAM_INIT);
    this.controls.update();
  }

  /** Derive the whole scene from coherent state. */
  update(state: WorldState, dt: number): void {
    const t = this.clock.getElapsedTime();
    const weatherTarget = state.weather === 'rain' ? 1 : 0;

    // functional wind drives windmill + rain directly
    this.windmill.update(state.wind, dt);
    this.rain.update(weatherTarget, state.wind, dt);

    // decorative motion is reduced when the user prefers reduced motion
    const decWind = this.reducedMotion ? state.wind * 0.3 : state.wind;
    this.trees.update(decWind, t);
    this.decor.update(decWind, t);

    // clouds darken with the smoothed rain intensity (not the raw target),
    // so they ease into storm as rain fades in
    this.clouds.update(state.wind, this.rain.intensity, t, dt);

    // pond ripples follow the smoothed rain intensity
    this.pond.update(dt, decWind, t);
    this.pond.consumeRain(dt, this.rain.intensity);

    // sky + lights follow time and weather (smoothed internally)
    this.sky.update(state.time, weatherTarget, dt);

    // house lights
    this.house.setLights(state.lightsOn, dt);

    // keep fog color matched to the sky horizon so the void blends in
    this.fog.color.copy(this.sky.horizonColor);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.computePixelRatio());
    this.renderer.setSize(w, h, false);
  }

  dispose(): void {
    this.controls.dispose();
    this.sky.dispose();
    this.island.dispose();
    this.house.dispose();
    this.trees.dispose();
    this.windmill.dispose();
    this.pond.dispose();
    this.clouds.dispose();
    this.decor.dispose();
    this.rain.dispose();
    this.renderer.dispose();
  }
}
