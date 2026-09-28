import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { angleDelta, damp } from '../utils/math';

const TARGET = new THREE.Vector3(0, -0.75, 0);
const DEFAULT_AZIMUTH = 0.18;
const DEFAULT_POLAR = 1.2;
/** Radius of the sphere that must stay in frame (island, windmill and underside). */
const FIT_RADIUS = 5.9;
const FOV = 34;

export interface Insets {
  left: number;
  bottom: number;
}

/**
 * Orbit camera that frames the island in whatever part of the viewport the UI panel
 * leaves free, using a view offset rather than moving the orbit target.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private width = 1;
  private height = 1;
  private readonly inset: Insets = { left: 0, bottom: 0 };
  private readonly insetSmooth: Insets = { left: 0, bottom: 0 };
  private userMoved = false;
  private resetting = false;
  private readonly spherical = new THREE.Spherical();
  private readonly offset = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, private readonly reducedMotion: () => boolean) {
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 260);
    this.controls = new OrbitControls(this.camera, canvas);
    const c = this.controls;
    c.target.copy(TARGET);
    c.enableDamping = true;
    c.dampingFactor = 0.075;
    c.enablePan = false;
    c.rotateSpeed = 0.65;
    c.zoomSpeed = 0.8;
    c.minPolarAngle = 0.32;
    c.maxPolarAngle = 1.8;
    c.minDistance = 8.5;
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.addEventListener('start', () => {
      this.userMoved = true;
      this.resetting = false;
    });
    this.placeAt(DEFAULT_AZIMUTH, DEFAULT_POLAR, 20);
  }

  private placeAt(azimuth: number, polar: number, radius: number) {
    this.spherical.set(radius, polar, azimuth);
    this.offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.controls.target).add(this.offset);
    this.camera.lookAt(this.controls.target);
  }

  /** Distance at which the island fits inside the unobstructed part of the screen. */
  fitDistance(insets: Insets = this.inset): number {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const freeW = Math.max(this.width - insets.left, this.width * 0.35);
    const freeH = Math.max(this.height - insets.bottom, this.height * 0.35);
    const vertical = Math.atan((tanHalf * freeH) / this.height);
    const horizontal = Math.atan((tanHalf * freeW) / this.height);
    return FIT_RADIUS / Math.sin(Math.min(vertical, horizontal));
  }

  private applyLimits() {
    const fit = this.fitDistance();
    this.controls.maxDistance = Math.max(fit * 1.35, 24);
    this.controls.minDistance = Math.min(8.5, fit * 0.6);
  }

  setInsets(insets: Insets): void {
    this.inset.left = insets.left;
    this.inset.bottom = insets.bottom;
    this.applyLimits();
    if (!this.userMoved) this.snapDistance(false);
  }

  resize(width: number, height: number, initial = false): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.camera.aspect = this.width / this.height;
    this.applyLimits();
    if (initial) {
      this.insetSmooth.left = this.inset.left;
      this.insetSmooth.bottom = this.inset.bottom;
      this.placeAt(DEFAULT_AZIMUTH, DEFAULT_POLAR, this.fitDistance());
    } else if (!this.userMoved) {
      this.snapDistance(true);
    }
    this.applyViewOffset();
  }

  /** Keep the default composition when the viewport changes and the user has not taken over. */
  private snapDistance(immediate: boolean) {
    if (immediate) {
      this.offset.copy(this.camera.position).sub(this.controls.target);
      this.spherical.setFromVector3(this.offset);
      this.placeAt(this.spherical.theta, this.spherical.phi, this.fitDistance());
    } else {
      this.resetting = true;
    }
  }

  reset(): void {
    this.userMoved = false;
    if (this.reducedMotion()) {
      this.resetting = false;
      this.placeAt(DEFAULT_AZIMUTH, DEFAULT_POLAR, this.fitDistance());
      this.controls.update();
    } else {
      this.resetting = true;
    }
  }

  private applyViewOffset() {
    const l = this.insetSmooth.left;
    const b = this.insetSmooth.bottom;
    if (l < 0.5 && b < 0.5) this.camera.clearViewOffset();
    else this.camera.setViewOffset(this.width, this.height, -l / 2, b / 2, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    const li = this.insetSmooth;
    const lambda = this.reducedMotion() ? 30 : 7;
    const nl = damp(li.left, this.inset.left, lambda, dt);
    const nb = damp(li.bottom, this.inset.bottom, lambda, dt);
    if (Math.abs(nl - li.left) > 0.05 || Math.abs(nb - li.bottom) > 0.05) {
      li.left = nl;
      li.bottom = nb;
      this.applyViewOffset();
    }

    if (this.resetting) {
      this.offset.copy(this.camera.position).sub(this.controls.target);
      this.spherical.setFromVector3(this.offset);
      const k = 4.5;
      const az = this.spherical.theta + angleDelta(this.spherical.theta, DEFAULT_AZIMUTH) * (1 - Math.exp(-k * dt));
      const polar = damp(this.spherical.phi, DEFAULT_POLAR, k, dt);
      const fit = this.fitDistance();
      const radius = damp(this.spherical.radius, fit, k, dt);
      this.placeAt(az, polar, radius);
      if (
        Math.abs(angleDelta(az, DEFAULT_AZIMUTH)) < 0.001 &&
        Math.abs(polar - DEFAULT_POLAR) < 0.001 &&
        Math.abs(radius - fit) < 0.01
      ) {
        this.resetting = false;
      }
    }
    this.controls.update(dt);
  }
}
