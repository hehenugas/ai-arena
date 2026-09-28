import * as THREE from 'three';
import { Atmosphere } from './fx/atmosphere';
import { RainCollider } from './fx/collider';
import { Fireflies } from './fx/fireflies';
import { Rain } from './fx/rain';
import { Ripples } from './fx/ripples';
import { Smoke } from './fx/smoke';
import type { Frame } from './frame';
import { CameraRig, type Insets } from './interaction/cameraRig';
import { HousePicker } from './interaction/picking';
import type { Store, WorldState } from './state';
import { damp } from './utils/math';
import { Clouds } from './world/clouds';
import { House } from './world/house';
import { WIND_DIRECTION } from './world/layout';
import { Props } from './world/props';
import { createTerrain } from './world/terrain';
import { Trees } from './world/trees';
import { Windmill } from './world/windmill';

export type Quality = 'full' | 'lite';

const MAX_DT = 1 / 20;

export function detectQuality(): Quality {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || coarse || weak ? 'lite' : 'full';
}

export class PocketWorld {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig: CameraRig;
  private readonly atmosphere: Atmosphere;
  private readonly house: House;
  private readonly windmill: Windmill;
  private readonly trees: Trees;
  private readonly clouds: Clouds;
  private readonly props: Props;
  private readonly rain: Rain;
  private readonly ripples: Ripples;
  private readonly smoke: Smoke;
  private readonly fireflies: Fireflies;
  private readonly frame: Frame;
  private readonly reducedMotion: MediaQueryList;
  private last = performance.now();
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly host: HTMLElement,
    private readonly store: Store,
    quality: Quality,
    insets: Insets,
  ) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const s = store.state;
    this.frame = {
      dt: 0,
      elapsed: 0,
      hour: s.time,
      wind: s.wind,
      windDir: WIND_DIRECTION.clone(),
      rain: s.weather === 'rain' ? 1 : 0,
      night: 0,
      lights: s.lights ? 1 : 0,
      motion: this.reducedMotion.matches ? 0.3 : 1,
    };
    this.reducedMotion.addEventListener('change', (e) => {
      this.frame.motion = e.matches ? 0.3 : 1;
    });

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const maxRatio = quality === 'full' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-label', 'Floating island scene. Drag to orbit, scroll or pinch to zoom.');
    canvas.setAttribute('role', 'img');
    host.appendChild(canvas);

    this.rig = new CameraRig(canvas, () => this.reducedMotion.matches);

    const terrain = createTerrain();
    this.scene.add(terrain.group);
    this.atmosphere = new Atmosphere(this.scene, quality === 'full' ? 2048 : 1024, {
      grass: terrain.grassMaterial,
      water: terrain.waterMaterial,
    });

    this.house = new House(quality);
    this.windmill = new Windmill();
    this.trees = new Trees();
    this.clouds = new Clouds();
    this.props = new Props(quality);
    this.ripples = new Ripples(quality === 'full' ? 40 : 28);
    const collider = new RainCollider(this.house.group.position.y, this.trees.footprints);
    this.rain = new Rain(quality === 'full' ? 1400 : 700, collider, this.ripples);
    this.smoke = new Smoke(this.house.chimneyTop, 10);
    this.fireflies = new Fireflies();
    this.scene.add(
      this.house.group,
      this.windmill.group,
      this.trees.group,
      this.clouds.group,
      this.props.group,
      this.ripples.group,
      this.rain.lines,
      this.smoke.group,
      this.fireflies.points,
    );

    new HousePicker(canvas, this.rig.camera, this.house.pickTargets, () => {
      this.store.set({ lights: !this.store.state.lights }, 'scene');
    });

    let prevLights = s.lights;
    store.subscribe((state: Readonly<WorldState>) => {
      if (state.lights !== prevLights) this.house.poke();
      prevLights = state.lights;
    });

    this.rig.setInsets(insets);
    this.resize(true);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.renderer.setAnimationLoop(null);
      host.dispatchEvent(new CustomEvent('pocketworld:contextlost', { bubbles: true }));
    });
  }

  private resize(initial = false) {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h, initial);
  }

  setInsets(insets: Insets): void {
    this.rig.setInsets(insets);
  }

  resetView(): void {
    this.rig.reset();
  }

  start(): void {
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private tick() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, MAX_DT);
    this.last = now;

    const f = this.frame;
    const s = this.store.state;
    f.dt = dt;
    f.elapsed += dt;
    // Every transition is an exponential approach toward the current target, so any
    // change can interrupt any other without queued animations or discontinuities.
    f.hour = Math.abs(f.hour - s.time) < 1e-3 ? s.time : damp(f.hour, s.time, 5, dt);
    f.wind = Math.abs(f.wind - s.wind) < 1e-3 ? s.wind : damp(f.wind, s.wind, 2.2, dt);
    f.rain = damp(f.rain, s.weather === 'rain' ? 1 : 0, 1.3, dt);
    if (f.rain < 0.002 && s.weather === 'clear') f.rain = 0;
    f.lights = damp(f.lights, s.lights ? 1 : 0, 7, dt);

    this.rig.update(dt);
    this.atmosphere.update(f, this.rig.camera);
    this.house.update(f);
    this.windmill.update(f);
    this.trees.update(f);
    this.clouds.update(f);
    this.props.update(f);
    this.rain.update(f);
    this.ripples.update(f);
    this.smoke.update(f);
    this.fireflies.update(f);

    this.renderer.render(this.scene, this.rig.camera);
  }
}
