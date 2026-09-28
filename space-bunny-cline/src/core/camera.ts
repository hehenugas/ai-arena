import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const HOME = {
  position: new THREE.Vector3(7.86, 2.72, 11.02),
  target: new THREE.Vector3(0, -0.75, 0),
};

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface CameraRig {
  controls: OrbitControls;
  /** Returns to the framing shot, unless the user grabs the camera first. */
  flyHome(duration?: number): void;
  /** Stops an in-flight reset without snapping the camera. */
  cancelFlight(): void;
  update(dt: number): void;
  dispose(): void;
}

/** Orbit controls with limits, damping, and an interruptible reset flight. */
export function createCameraRig(camera: THREE.PerspectiveCamera, dom: HTMLElement): CameraRig {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 6.5;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.46;

  camera.position.copy(HOME.position);
  controls.target.copy(HOME.target);
  controls.update();

  const fromPos = new THREE.Vector3();
  const fromTarget = new THREE.Vector3();
  let t = 1;
  let duration = 0.9;

  const cancel = () => {
    t = 1;
  };
  controls.addEventListener('start', cancel);

  return {
    controls,
    flyHome(ms = 900) {
      fromPos.copy(camera.position);
      fromTarget.copy(controls.target);
      duration = Math.max(0.05, ms / 1000);
      t = 0;
    },
    cancelFlight() {
      t = 1;
    },
    update(dt) {
      if (t < 1) {
        t = Math.min(1, t + dt / duration);
        const k = easeInOutCubic(t);
        camera.position.lerpVectors(fromPos, HOME.position, k);
        controls.target.lerpVectors(fromTarget, HOME.target, k);
        if (t >= 1) cancel();
      }
      controls.update();
    },
    dispose() {
      controls.removeEventListener('start', cancel);
      controls.dispose();
    },
  };
}
