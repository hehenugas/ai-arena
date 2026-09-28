import {
  ACESFilmicToneMapping,
  Clock,
  Fog,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Environment } from './environment/environment';
import { LightRig } from './environment/lighting';
import { Sky } from './environment/sky';
import { WeatherSystem } from './weather';
import { AppState, windVector } from './state';
import { Panel } from './ui';
import {
  createCameraRig,
  createPicker,
  createPressTracker,
  type CameraRig,
  type Picker,
  type PressTracker,
} from './interaction';
import { createHouse } from './objects/house';
import { createWindmill } from './objects/windmill';
import { createPond } from './objects/pond';
import { createTrees, updateTrees, type Tree } from './objects/trees';
import { createDetails } from './objects/details';
import { createClouds } from './objects/clouds';
import {
  createFloatingRocks,
  createIsland,
  grassHeight,
  updateFloatingRocks,
} from './objects/island';
import { FLOATERS, HOUSE, WINDMILL } from './objects/layout';
import { getTextures } from './textureSet';
import { DEG, clamp } from './utils';

// Initial three-quarter composition: high enough to read the layout, low
// enough that the sculpted underside stays in frame.
const INITIAL_TARGET = new Vector3(0, 0.5, 0);
const INITIAL_AZ = 0.88;
const INITIAL_EL = 0.38;
const INITIAL_DIST = 17.2;

function initialPosition(out: Vector3): Vector3 {
  return out.set(
    INITIAL_TARGET.x + INITIAL_DIST * Math.cos(INITIAL_EL) * Math.sin(INITIAL_AZ),
    INITIAL_TARGET.y + INITIAL_DIST * Math.sin(INITIAL_EL),
    INITIAL_TARGET.z + INITIAL_DIST * Math.cos(INITIAL_EL) * Math.cos(INITIAL_AZ),
  );
}

function fovFor(aspect: number): number {
  const base = 42;
  if (aspect >= 1.05) return base;
  // Keep a workable horizontal field of view on portrait screens.
  const targetH = 46 * DEG;
  const vfov = (2 * Math.atan(Math.tan(targetH / 2) / aspect)) / DEG;
  return clamp(vfov, 34, 74);
}

export class App {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private clock = new Clock();
  private state = new AppState();
  private environment = new Environment();
  private sky: Sky;
  private rig: LightRig;
  private cameraRig: CameraRig;
  private weather: WeatherSystem;
  private panel: Panel;
  private canvas: HTMLCanvasElement;

  private house!: ReturnType<typeof createHouse>;
  private windmill!: ReturnType<typeof createWindmill>;
  private pond!: ReturnType<typeof createPond>;

  private treeList: Tree[] = [];
  private details!: ReturnType<typeof createDetails>;
  private clouds!: ReturnType<typeof createClouds>;
  private floaters: ReturnType<typeof createFloatingRocks>['rocks'] = [];

  private tracker: PressTracker;
  private picker: Picker;
  private tmpWind = new Vector3();
  private motion = 1;
  private raf = 0;
  private lastHover = 0;
  private disposed = false;
  private resizeHandler = () => this.resize();
  private motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private motionHandler = () => {
    this.motion = this.motionQuery.matches ? 0 : 1;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.scene.fog = new Fog('#d3e6ee', 20, 130);

    this.camera = new PerspectiveCamera(fovFor(window.innerWidth / window.innerHeight), 1, 0.1, 900);
    initialPosition(this.camera.position);
    this.camera.lookAt(INITIAL_TARGET);

    // --- world ---
    getTextures();
    const island = createIsland(null);
    this.scene.add(island.group);

    this.house = createHouse();
    this.house.group.position.set(HOUSE.x, grassHeight(HOUSE.x, HOUSE.z) - 0.02, HOUSE.z);
    this.house.group.rotation.y = HOUSE.yaw;
    this.scene.add(this.house.group);

    this.windmill = createWindmill();
    this.windmill.group.position.set(
      WINDMILL.x,
      grassHeight(WINDMILL.x, WINDMILL.z) - 0.03,
      WINDMILL.z,
    );
    this.windmill.group.rotation.y = WINDMILL.yaw;
    this.scene.add(this.windmill.group);

    this.pond = createPond();
    this.scene.add(this.pond.group);

    const trees = createTrees();
    this.treeList = trees.trees;
    this.scene.add(trees.group);

    this.details = createDetails();
    this.scene.add(this.details.group);

    this.clouds = createClouds(this.scene);

    const floating = createFloatingRocks(FLOATERS);
    this.floaters = floating.rocks;
    this.scene.add(floating.group);

    // --- sky, lights, weather ---
    this.sky = new Sky(this.scene);
    this.rig = new LightRig(this.scene, isMobile ? 1024 : 2048);
    this.weather = new WeatherSystem(this.scene, isMobile ? 900 : 1500);

    // --- interaction & UI ---
    this.cameraRig = createCameraRig(this.camera, canvas);
    this.tracker = createPressTracker(canvas);
    this.picker = createPicker(this.camera, canvas, this.scene, this.house.group);

    this.panel = new Panel(this.state);
    this.panel.onReset = () => this.cameraRig.startReset();

    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('resize', this.resizeHandler);
    this.motionQuery.addEventListener('change', this.motionHandler);
    this.motionHandler();

    this.resize();
    this.applyEnvironment();
  }

  start(): void {
    this.renderer.render(this.scene, this.camera);
    this.clock.start();
    const loop = (): void => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private tick(): void {
    // Clamp huge deltas so a background tab can't cause a jump.
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.state;
    s.update(dt);

    this.applyEnvironment();

    const wind = s.windEff;
    this.pond.update(this.environment.env, dt, wind, s.rainMix);
    this.house.update(s.houseLights, this.environment.env.nightFactor);
    this.windmill.update(dt, wind);
    updateTrees(this.treeList, t, wind);
    this.clouds.update(dt, wind, s.rainMix, this.environment.env.dayFactor);

    windVector(wind, this.tmpWind);
    this.weather.update(dt, s.rainMix, this.tmpWind.x, this.tmpWind.z);

    this.details.update(t, wind, this.motion);
    updateFloatingRocks(this.floaters, t, this.motion);

    this.cameraRig.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private applyEnvironment(): void {
    const s = this.state;
    const env = this.environment.compute(s.effTime, s.rainMix);

    this.sky.update({
      top: env.skyTop,
      horizon: env.skyHorizon,
      bottom: env.skyBottom,
      sunColor: env.sunColor,
      sunDir: env.sunDir,
      glow: env.sunGlow,
      starAlpha: env.starAlpha,
    });
    this.rig.update(env);

    this.renderer.toneMappingExposure = env.exposure;
    const fog = this.scene.fog as Fog;
    fog.color.copy(env.fogColor);
    fog.near = env.fogNear;
    fog.far = env.fogFar;
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!this.tracker.wasClick()) return;
    if (this.picker.overHouse(e.clientX, e.clientY)) {
      this.state.toggleHouseLights();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.tracker.isPressed()) {
      this.canvas.style.cursor = '';
      return;
    }
    const now = performance.now();
    if (now - this.lastHover < 120) return;
    this.lastHover = now;
    this.canvas.style.cursor = this.picker.overHouse(e.clientX, e.clientY) ? 'pointer' : '';
  };

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.5 : 2),
    );
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = fovFor(this.camera.aspect);
    this.camera.updateProjectionMatrix();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('resize', this.resizeHandler);
    this.motionQuery.removeEventListener('change', this.motionHandler);
    this.tracker.dispose();
    this.cameraRig.dispose();
    this.renderer.dispose();
  }
}
