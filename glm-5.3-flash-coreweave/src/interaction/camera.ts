import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const HOME_POS = new THREE.Vector3(11.5, 5.8, 16.6);
const HOME_TARGET = new THREE.Vector3(0, 0.3, 0);

/** Orbit camera with damping and firm limits; reset eases back home (cancellable). */
export function createCameraRig(canvas: HTMLCanvasElement) {
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 160);
  camera.position.copy(HOME_POS);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 7.5;
  controls.maxDistance = 30;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.75;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;
  controls.update();

  let tweenT = -1; // <0 = idle
  const startPos = new THREE.Vector3();
  const startTarget = new THREE.Vector3();

  const cancelTween = () => {
    tweenT = -1;
  };
  canvas.addEventListener('pointerdown', cancelTween);
  canvas.addEventListener('wheel', cancelTween, { passive: true });

  function resetView(instant: boolean) {
    if (instant) {
      cancelTween();
      camera.position.copy(HOME_POS);
      controls.target.copy(HOME_TARGET);
      controls.update();
      return;
    }
    startPos.copy(camera.position);
    startTarget.copy(controls.target);
    tweenT = 0;
  }

  function update(dt: number) {
    if (tweenT >= 0) {
      tweenT = Math.min(tweenT + dt / 0.9, 1);
      const e =
        tweenT < 0.5 ? 4 * tweenT * tweenT * tweenT : 1 - Math.pow(-2 * tweenT + 2, 3) / 2;
      camera.position.lerpVectors(startPos, HOME_POS, e);
      controls.target.lerpVectors(startTarget, HOME_TARGET, e);
      if (tweenT >= 1) tweenT = -1;
    }
    controls.update(dt);
  }

  return { camera, controls, update, resetView };
}
