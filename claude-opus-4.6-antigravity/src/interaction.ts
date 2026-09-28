import * as THREE from 'three';
import { setState, getState } from './state';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = new THREE.Vector2();
let isPointerDown = false;
const DRAG_THRESHOLD = 5;

export function setupInteraction(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  houseGroup: THREE.Group
): void {
  const onPointerDown = (e: PointerEvent) => {
    isPointerDown = true;
    pointerDown.set(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isPointerDown) return;
    isPointerDown = false;

    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(houseGroup.children, true);

    if (hits.length > 0) {
      setState({ lightsOn: !getState().lightsOn });
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
}
