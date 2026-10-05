import { Group, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const INITIAL_CAMERA = new Vector3(10.4, 2.4, 12.6);
const INITIAL_TARGET = new Vector3(0, -0.3, 0);
const CLICK_SLOP = 7; // pixels a pointer may travel and still count as a click

export interface Interaction {
  update(): void;
  resetView(): void;
}

/**
 * Orbit camera with damping, plus a click-vs-drag discriminator so tapping the
 * house toggles its lights while orbiting never does.
 */
export function createInteraction(
  camera: PerspectiveCamera,
  dom: HTMLElement,
  houseGroup: Group,
  onHouseClick: () => void
): Interaction {
  camera.position.copy(INITIAL_CAMERA);

  const controls = new OrbitControls(camera, dom);
  controls.target.copy(INITIAL_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 24;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.65;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.7;
  controls.update();

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let downId = -1;
  let lastHoverCheck = 0;

  const pickHouse = (clientX: number, clientY: number): boolean => {
    const rect = dom.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(houseGroup, true).length > 0;
  };

  dom.addEventListener('pointerdown', (e) => {
    downId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    downTime = performance.now();
  });

  dom.addEventListener('pointerup', (e) => {
    if (e.pointerId !== downId) return;
    downId = -1;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const held = performance.now() - downTime;
    if (moved <= CLICK_SLOP && held < 600 && pickHouse(e.clientX, e.clientY)) {
      onHouseClick();
    }
  });

  // Pointer cursor over the house, checked sparingly.
  dom.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (downId !== -1 || now - lastHoverCheck < 90) return;
    lastHoverCheck = now;
    dom.style.cursor = pickHouse(e.clientX, e.clientY) ? 'pointer' : '';
  });

  return {
    update() {
      controls.update();
    },
    resetView() {
      camera.position.copy(INITIAL_CAMERA);
      controls.target.copy(INITIAL_TARGET);
      controls.update();
    },
  };
}
