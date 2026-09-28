import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AppState } from '../state/AppState';
import { Island } from './Island';
import { House } from './House';
import { Windmill } from './Windmill';
import { Water } from './Water';
import { Vegetation } from './Vegetation';
import { Props } from './Props';
import { Environment } from './Environment';
import { Weather } from './Weather';

export class World {
  private container: HTMLElement;
  private appState: AppState;

  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private island: Island;
  private house: House;
  private windmill: Windmill;
  private water: Water;
  private vegetation: Vegetation;
  private props: Props;
  private environment: Environment;
  private weather: Weather;

  private lastTime = 0;
  private startTime = 0;
  private isRunning = false;
  private animationFrameId: number | null = null;

  // Initial camera settings
  private static readonly INITIAL_CAM_POS = new THREE.Vector3(13.5, 10.5, 14.5);
  private static readonly INITIAL_CAM_TARGET = new THREE.Vector3(0, 0.2, 0);

  // Smooth camera reset animation
  private resettingCamera = false;
  private resetProgress = 0;
  private resetDuration = 1.0;
  private camResetStartPos = new THREE.Vector3();
  private camResetStartTarget = new THREE.Vector3();

  // Raycasting & click detection
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pointerDownPos = new THREE.Vector2();
  private isPointerDown = false;

  constructor(container: HTMLElement, appState: AppState) {
    this.container = container;
    this.appState = appState;

    // Check WebGL support
    if (!this.checkWebGLSupport()) {
      throw new Error('WebGL is not supported by your browser.');
    }

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 800;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 120);
    this.camera.position.copy(World.INITIAL_CAM_POS);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(World.INITIAL_CAM_TARGET);
    this.controls.minDistance = 9.0;
    this.controls.maxDistance = 32.0;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.58; // Allows seeing island underbelly
    this.controls.enablePan = false; // Prevent scene drifting off-screen

    // 5. Build Scene Objects
    this.environment = new Environment();
    this.scene.add(this.environment.group);
    this.scene.background = this.environment.skyColor;

    this.island = new Island();
    this.scene.add(this.island.group);

    this.water = new Water();
    this.scene.add(this.water.group);

    this.house = new House();
    this.scene.add(this.house.group);

    this.windmill = new Windmill();
    this.scene.add(this.windmill.group);

    this.vegetation = new Vegetation();
    this.scene.add(this.vegetation.group);

    this.props = new Props();
    this.scene.add(this.props.group);

    this.weather = new Weather();
    this.scene.add(this.weather.group);

    this.startTime = performance.now() * 0.001;
    this.lastTime = this.startTime;

    // 6. Setup Event Listeners
    this.setupInteractions();
    this.bindState();

    // 7. Initial synchronous frame render so the canvas has content immediately
    this.renderFrame(0.016, 0.016);

    // 8. Start render loop
    this.start();
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  private setupInteractions(): void {
    const dom = this.renderer.domElement;

    // Track pointer down
    dom.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.pointerDownPos.set(e.clientX, e.clientY);
      // Cancel camera reset if user grabs controls
      if (this.resettingCamera) {
        this.resettingCamera = false;
      }
    });

    // Pointer move: hover feedback
    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Only check hover when not dragging
      if (!this.isPointerDown) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.house.clickableMeshes, true);
        dom.style.cursor = hits.length > 0 ? 'pointer' : 'default';
      }
    });

    // Pointer up: distinguish click from orbit drag
    dom.addEventListener('pointerup', (e) => {
      this.isPointerDown = false;
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

      // Only treat as click if pointer moved less than 5 pixels
      if (dist < 5) {
        const rect = dom.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.house.clickableMeshes, true);

        if (hits.length > 0) {
          this.appState.toggleHouseLights();
        }
      }
    });

    // Window resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private bindState(): void {
    this.appState.subscribe((state, key) => {
      if (!key || key === 'houseLights') {
        this.house.setLights(state.houseLights);
      }
    });
  }

  public resetCamera(): void {
    this.resettingCamera = true;
    this.resetProgress = 0;
    this.camResetStartPos.copy(this.camera.position);
    this.camResetStartTarget.copy(this.controls.target);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now() * 0.001;
    this.lastTime = this.startTime;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now() * 0.001;
    const delta = Math.min(now - this.lastTime, 0.1);
    this.lastTime = now;
    const elapsed = now - this.startTime;

    this.renderFrame(delta, elapsed);
  };

  private renderFrame(delta: number, elapsed: number): void {
    const state = this.appState.state;

    // Camera reset animation
    if (this.resettingCamera) {
      this.resetProgress += delta / this.resetDuration;
      if (this.resetProgress >= 1.0) {
        this.resetProgress = 1.0;
        this.resettingCamera = false;
      }
      // Ease out cubic
      const t = 1 - Math.pow(1 - this.resetProgress, 3);
      this.camera.position.lerpVectors(this.camResetStartPos, World.INITIAL_CAM_POS, t);
      this.controls.target.lerpVectors(this.camResetStartTarget, World.INITIAL_CAM_TARGET, t);
    }

    this.controls.update();

    // Update scene systems
    const windMultiplier = state.reducedMotion ? 0.35 : 1.0;
    const effectiveWind = state.windStrength * windMultiplier;

    this.environment.update(delta, state.timeOfDay, state.weather, effectiveWind);
    this.weather.update(delta, state.weather, effectiveWind);
    this.water.update(delta, state.weather === 'rain', this.weather.getIntensity(), elapsed);
    this.house.update(delta, effectiveWind, state.timeOfDay);
    this.windmill.update(delta, effectiveWind);
    this.vegetation.update(delta, effectiveWind, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

  public captureSnapshot(): string {
    this.renderFrame(0.016, 0.016);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
