import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function setupControls(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): OrbitControls {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 8;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minPolarAngle = Math.PI / 6;
  controls.target.set(0, 0, 0);
  controls.update();
  return controls;
}
