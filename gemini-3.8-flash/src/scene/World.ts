import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AppState } from '../types';
import { store } from '../state';
import { Island } from './Island';
import { House } from './House';
import { Windmill } from './Windmill';
import { Water } from './Water';
import { Foliage } from './Foliage';
import { Environment } from './Environment';
import { WeatherSystem } from './WeatherSystem';
import { InteractionManager } from '../interaction/InteractionManager';

export class World {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  // Scene Components
  public island: Island;
  public house: House;
  public windmill: Windmill;
  public water: Water;
  public foliage: Foliage;
  public environment: Environment;
  public weatherSystem: WeatherSystem;
  public interactionManager!: InteractionManager;

  // Animation & Loop
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private timeElapsed: number = 0;

  // Default camera framing (Flattering 3/4 miniature view)
  public readonly defaultCameraPos = new THREE.Vector3(9.2, 6.2, 10.8);
  public readonly defaultControlsTarget = new THREE.Vector3(0, 0.35, 0);

  // Camera transition animation
  private isCameraTransitioning: boolean = false;
  private cameraLerpAlpha: number = 1.0;
  private startCameraPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private targetCameraPos = new THREE.Vector3();
  private targetControlsTarget = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 800;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.copy(this.defaultCameraPos);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.defaultControlsTarget);
    // Distance limits: prevent losing the island
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 21.0;
    // Polar angle limits: view top and sculpted underside, prevent disorienting upside down
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.72; // ~130 deg
    // Pan restricted: prevent losing island off-screen
    this.controls.enablePan = false;

    // 5. Construct Components
    this.environment = new Environment(this.scene);

    this.island = new Island();
    this.scene.add(this.island.group);

    this.house = new House();
    if (store.getState().houseLights) {
      this.house.updateLights(true);
    }
    this.scene.add(this.house.group);

    this.windmill = new Windmill();
    this.scene.add(this.windmill.group);

    this.water = new Water();
    this.scene.add(this.water.group);

    this.foliage = new Foliage();
    this.scene.add(this.foliage.group);

    this.weatherSystem = new WeatherSystem();
    if (store.getState().weather === 'rain') {
      this.weatherSystem.setWeather('rain');
      this.weatherSystem.rainBlend = 1.0;
    }
    this.scene.add(this.weatherSystem.group);

    // 6. Interaction Manager for 3D clicks
    this.interactionManager = new InteractionManager(
      this.camera,
      this.renderer.domElement,
      this.house.clickableMeshes
    );

    // 7. Subscribe to reactive state
    this.clock = new THREE.Clock();
    store.subscribe((state, changedKey) => this.onStateChange(state, changedKey));

    // 8. Event listeners
    window.addEventListener('resize', this.onWindowResize);

    // 9. Initial update and render immediately (ensures canvas has content before first rAF)
    this.environment.updateEnvironment(
      store.getState().time,
      store.getState().weather,
      this.weatherSystem.rainBlend
    );
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    const logEl = document.getElementById('debug-text');
    if (logEl) {
      logEl.innerText += `\nRendered: calls=${this.renderer.info.render.calls}, tris=${this.renderer.info.render.triangles}, cam=${this.camera.position.x.toFixed(1)},${this.camera.position.y.toFixed(1)},${this.camera.position.z.toFixed(1)}`;
    }

    // 10. Start render loop
    this.start();
  }

  private onStateChange(state: Readonly<AppState>, changedKey?: keyof AppState) {
    // Update weather target
    if (!changedKey || changedKey === 'weather') {
      this.weatherSystem.setWeather(state.weather);
    }

    // Update house lights
    if (!changedKey || changedKey === 'houseLights') {
      this.house.updateLights(state.houseLights);
    }
  }

  public resetCamera() {
    this.startCameraPos.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);
    this.targetCameraPos.copy(this.defaultCameraPos);
    this.targetControlsTarget.copy(this.defaultControlsTarget);

    this.cameraLerpAlpha = 0.0;
    this.isCameraTransitioning = true;
  }

  public setCameraPreset(preset: 'iso' | 'top' | 'house') {
    this.startCameraPos.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);

    if (preset === 'iso') {
      this.targetCameraPos.copy(this.defaultCameraPos);
      this.targetControlsTarget.copy(this.defaultControlsTarget);
    } else if (preset === 'top') {
      this.targetCameraPos.set(0.1, 15.0, 1.0);
      this.targetControlsTarget.set(0, 0, 0);
    } else if (preset === 'house') {
      this.targetCameraPos.set(-0.2, 1.4, 1.2);
      this.targetControlsTarget.set(-1.6, 0.9, -1.2);
    }

    this.cameraLerpAlpha = 0.0;
    this.isCameraTransitioning = true;
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth || 1280;
    const height = this.container.clientHeight || window.innerHeight || 800;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private start() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      // Clamp delta time to avoid large jumps when returning from background tab
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const state = store.getState();

      const motionScale = state.reducedMotion ? 0.3 : 1.0;
      this.timeElapsed += delta * motionScale;

      // Handle camera interpolation during reset or preset view switch
      if (this.isCameraTransitioning) {
        this.cameraLerpAlpha += delta * 2.2;
        if (this.cameraLerpAlpha >= 1.0) {
          this.cameraLerpAlpha = 1.0;
          this.isCameraTransitioning = false;
        }

        // Cubic ease out
        const t = 1 - Math.pow(1 - this.cameraLerpAlpha, 3);
        this.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, t);
        this.controls.target.lerpVectors(this.startTarget, this.targetControlsTarget, t);
      }

      this.controls.update();

      // Update weather simulation
      this.weatherSystem.update(delta * motionScale, state.wind);

      // Update environment lighting and sky dome
      this.environment.updateEnvironment(
        state.time,
        state.weather,
        this.weatherSystem.rainBlend
      );
      this.environment.updateClouds(delta * motionScale, state.wind);

      // Update island wetness appearance
      this.island.updateWeather(state.weather, this.weatherSystem.rainBlend);

      // Update windmill spin
      this.windmill.update(delta * motionScale, state.wind);

      // Update tree foliage sway
      this.foliage.update(delta * motionScale, this.timeElapsed, state.wind);

      // Update house chimney smoke
      this.house.update(delta * motionScale, state.wind);

      // Update water pond ripples
      this.water.update(delta * motionScale, this.timeElapsed, this.weatherSystem.rainBlend);

      // Render
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.interactionManager.dispose();
    this.renderer.dispose();
  }
}
