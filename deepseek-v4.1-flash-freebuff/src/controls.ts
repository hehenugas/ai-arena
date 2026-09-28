import { PerspectiveCamera, Raycaster, TOUCH, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp } from './utils';
import type { World } from './world';

/** A flattering three-quarter view: the whole island plus its floating rock. */
const INITIAL_DIRECTION = new Vector3(10.4, 4.7, 12.6).normalize();
const INITIAL_TARGET = new Vector3(0, -0.8, 0);

// How much of the diorama has to stay in frame (island radius plus a margin).
const FIT_HALF_WIDTH = 7.1;
const FIT_HALF_HEIGHT = 5.9;
const VIEW_MARGIN = 1.05;

const MIN_DISTANCE = 10.5;
const MAX_DISTANCE = 48;
const MIN_POLAR = 0.55;
const MAX_POLAR = 1.64;
const TAP_MOVE_LIMIT = 8;
const TAP_MOVE_LIMIT_TOUCH = 12;
const TAP_TIME_LIMIT = 500;
const RESET_DURATION = 0.7;

export interface CameraRig {
  camera: PerspectiveCamera;
  controls: OrbitControls;
  update(dt: number): void;
  setViewport(width: number, height: number): void;
  reset(): void;
  dispose(): void;
}

/** Pulls the camera back far enough for the island to fit any aspect ratio. */
function fitDistance(aspect: number, fovDegrees: number): number {
  const tanHalfV = Math.tan((fovDegrees * Math.PI) / 360);
  const forHeight = FIT_HALF_HEIGHT / tanHalfV;
  const forWidth = FIT_HALF_WIDTH / (tanHalfV * Math.max(0.32, aspect));
  return clamp(Math.max(forHeight, forWidth) * VIEW_MARGIN, MIN_DISTANCE, MAX_DISTANCE);
}

export function createCameraRig(
  canvas: HTMLCanvasElement,
  world: World,
  onToggleLights: () => void,
): CameraRig {
  const camera = new PerspectiveCamera(40, 1, 0.1, 400);
  const initialPosition = new Vector3().copy(INITIAL_TARGET).addScaledVector(INITIAL_DIRECTION, 17);
  let framedDistance = 17;
  camera.position.copy(initialPosition);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(INITIAL_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.72;
  controls.zoomSpeed = 0.8;
  controls.enablePan = false;
  controls.minDistance = MIN_DISTANCE;
  controls.maxDistance = MAX_DISTANCE;
  controls.minPolarAngle = MIN_POLAR;
  controls.maxPolarAngle = MAX_POLAR;
  controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE };

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let trackingPointer: number | null = null;
  let activePointers = 0;
  let hoverTimer = 0;

  const tween = {
    active: false,
    elapsed: 0,
    fromPosition: new Vector3(),
    fromTarget: new Vector3(),
  };

  const setRayFromEvent = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  };

  const onPointerDown = (event: PointerEvent): void => {
    activePointers += 1;
    // Any user input immediately takes over from the reset animation.
    tween.active = false;
    canvas.classList.add('is-dragging');
    if (!event.isPrimary || activePointers > 1) {
      trackingPointer = null;
      return;
    }
    trackingPointer = event.pointerId;
    downX = event.clientX;
    downY = event.clientY;
    downTime = performance.now();
  };

  const onPointerUp = (event: PointerEvent): void => {
    activePointers = Math.max(0, activePointers - 1);
    if (activePointers === 0) canvas.classList.remove('is-dragging');

    if (trackingPointer !== event.pointerId) return;
    trackingPointer = null;

    const limit = event.pointerType === 'touch' ? TAP_MOVE_LIMIT_TOUCH : TAP_MOVE_LIMIT;
    const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
    const elapsed = performance.now() - downTime;
    if (moved > limit || elapsed > TAP_TIME_LIMIT) return;

    setRayFromEvent(event);
    if (world.hitHouse(raycaster)) {
      onToggleLights();
      canvas.classList.remove('is-over-house');
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || trackingPointer !== null) return;
    const now = performance.now();
    if (now - hoverTimer < 110) return;
    hoverTimer = now;
    setRayFromEvent(event);
    canvas.classList.toggle('is-over-house', world.hitHouse(raycaster) && !tween.active);
  };

  const onPointerCancel = (): void => {
    activePointers = Math.max(0, activePointers - 1);
    trackingPointer = null;
    canvas.classList.remove('is-dragging');
  };

  const onPointerLeave = (): void => {
    canvas.classList.remove('is-over-house');
    trackingPointer = null;
    activePointers = 0;
    canvas.classList.remove('is-dragging');
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);

  const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  return {
    camera,
    controls,

    setViewport(width: number, height: number) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();

      // Keep the whole diorama framed on any aspect ratio, preserving the
      // zoom level the user has chosen relative to that framing.
      const next = fitDistance(camera.aspect, camera.fov);
      const scale = next / framedDistance;
      if (Number.isFinite(scale) && Math.abs(scale - 1) > 0.001) {
        camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
      }
      framedDistance = next;
      initialPosition.copy(controls.target).addScaledVector(INITIAL_DIRECTION, next);
    },

    reset() {
      tween.active = true;
      tween.elapsed = 0;
      tween.fromPosition.copy(camera.position);
      tween.fromTarget.copy(controls.target);
    },

    update(dt: number) {
      if (tween.active) {
        tween.elapsed += dt;
        const t = Math.min(1, tween.elapsed / RESET_DURATION);
        const eased = easeInOut(t);
        camera.position.lerpVectors(tween.fromPosition, initialPosition, eased);
        controls.target.lerpVectors(tween.fromTarget, INITIAL_TARGET, eased);
        if (t >= 1) tween.active = false;
      }
      controls.update();
    },

    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();
    },
  };
}
