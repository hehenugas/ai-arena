import {
  Camera,
  Intersection,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { easeInOutCubic } from './utils';

const CLICK_SLOP = 7; // px of movement before a press becomes a drag
const CLICK_MS = 500;

export interface CameraRig {
  controls: OrbitControls;
  initialPosition: Vector3;
  initialTarget: Vector3;
  startReset(): void;
  update(dt: number): void;
  dispose(): void;
}

export function createCameraRig(camera: PerspectiveCamera, dom: HTMLElement): CameraRig {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 8.5;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = 1.48;
  controls.enablePan = true;
  controls.screenSpacePanning = false;

  const initialPosition = camera.position.clone();
  const initialTarget = controls.target.clone();

  // Keep the target near the island so panning can never lose the scene.
  const clampTarget = (): void => {
    const t = controls.target;
    t.x = Math.max(-3.2, Math.min(3.2, t.x));
    t.z = Math.max(-3.2, Math.min(3.2, t.z));
    t.y = Math.max(-1.2, Math.min(3.2, t.y));
  };
  controls.addEventListener('change', clampTarget);

  // Camera reset animation — any user input interrupts it immediately.
  let resetTime = -1;
  const fromPos = new Vector3();
  const fromTarget = new Vector3();
  const cancel = (): void => {
    resetTime = -1;
  };
  controls.addEventListener('start', cancel);
  dom.addEventListener('wheel', cancel, { passive: true });

  const startReset = (): void => {
    fromPos.copy(camera.position);
    fromTarget.copy(controls.target);
    resetTime = 0;
  };

  return {
    controls,
    initialPosition,
    initialTarget,
    startReset,
    update(dt: number): void {
      if (resetTime >= 0) {
        resetTime += dt;
        const k = easeInOutCubic(Math.min(1, resetTime / 0.7));
        camera.position.lerpVectors(fromPos, initialPosition, k);
        controls.target.lerpVectors(fromTarget, initialTarget, k);
        if (resetTime >= 0.7) resetTime = -1;
      }
      controls.update();
    },
    dispose(): void {
      controls.removeEventListener('change', clampTarget);
      controls.removeEventListener('start', cancel);
      dom.removeEventListener('wheel', cancel);
      controls.dispose();
    },
  };
}

export interface PressTracker {
  /** True if the press that just ended was a click rather than a drag. */
  wasClick(): boolean;
  isPressed(): boolean;
  dispose(): void;
}

/**
 * Distinguishes a tap/click from an orbit gesture: a press that stays within a
 * small pixel radius and finishes quickly counts as a click.
 */
export function createPressTracker(dom: HTMLElement): PressTracker {
  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let pressing = false;
  let moved = false;

  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pressing = true;
    moved = false;
    downX = e.clientX;
    downY = e.clientY;
    downTime = performance.now();
  };
  const onMove = (e: PointerEvent): void => {
    if (!pressing) return;
    if (Math.abs(e.clientX - downX) > CLICK_SLOP || Math.abs(e.clientY - downY) > CLICK_SLOP) {
      moved = true;
    }
  };
  const release = (): void => {
    pressing = false;
  };

  dom.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  return {
    wasClick(): boolean {
      if (moved) return false;
      return performance.now() - downTime <= CLICK_MS;
    },
    isPressed(): boolean {
      return pressing;
    },
    dispose(): void {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    },
  };
}

export interface Picker {
  /** Does the pointer currently sit over the house? (for cursor feedback) */
  overHouse(x: number, y: number): boolean;
}

export function createPicker(camera: Camera, dom: HTMLElement, scene: Object3D, house: Object3D): Picker {
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  const isHouseAt = (clientX: number, clientY: number): boolean => {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits: Intersection[] = raycaster.intersectObject(scene, true);
    if (hits.length === 0) return false;
    let obj: Object3D | null = hits[0].object;
    while (obj) {
      if (obj === house) return true;
      obj = obj.parent;
    }
    return false;
  };

  return { overHouse: isHouseAt };
}
