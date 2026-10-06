import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const DEFAULT_CAMERA_POS = new THREE.Vector3(13.5, 8.2, 15.5);
export const DEFAULT_TARGET = new THREE.Vector3(0, 0.3, 0);

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  reset: () => void;
  update: (dt: number) => void;
}

/**
 * Damped orbit + zoom with sensible limits: the island can never be
 * accidentally lost, and panning is disabled so the composition stays put.
 */
export function createCameraRig(
  dom: HTMLElement,
  width: number,
  height: number
): CameraRig {
  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1200);
  camera.position.copy(DEFAULT_CAMERA_POS);

  const controls = new OrbitControls(camera, dom);
  controls.target.copy(DEFAULT_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 46;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI / 2 + 0.32; // lets the underside show
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.update();

  let anim: {
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
    dur: number;
  } | null = null;

  const reset = (): void => {
    anim = {
      fromPos: camera.position.clone(),
      toPos: DEFAULT_CAMERA_POS.clone(),
      fromTarget: controls.target.clone(),
      toTarget: DEFAULT_TARGET.clone(),
      t: 0,
      dur: 0.9,
    };
  };

  const update = (dt: number): void => {
    if (anim) {
      anim.t += dt;
      const k = Math.min(1, anim.t / anim.dur);
      const ease = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(anim.fromPos, anim.toPos, ease);
      controls.target.lerpVectors(anim.fromTarget, anim.toTarget, ease);
      if (k >= 1) anim = null;
    }
  };

  return { camera, controls, reset, update };
}