import * as THREE from 'three';

export interface InteractionOptions {
  domElement: HTMLElement;
  camera: THREE.Camera;
  targets: THREE.Object3D[];
  onActivate: () => void;
}

/**
 * Turns a click/tap on the house into a light toggle while leaving orbit
 * gestures alone: a press only counts if the pointer barely moved.
 */
export function setupInteraction(options: InteractionOptions): void {
  const { domElement, camera, targets, onActivate } = options;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const press = { x: 0, y: 0, time: 0, id: -1 };
  let tracking = false;

  const hitsHouse = (clientX: number, clientY: number): boolean => {
    const rect = domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(targets, false).length > 0;
  };

  domElement.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    tracking = true;
    press.x = event.clientX;
    press.y = event.clientY;
    press.time = performance.now();
    press.id = event.pointerId;
  });

  domElement.addEventListener('pointerup', (event) => {
    if (!tracking || event.pointerId !== press.id) return;
    tracking = false;

    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    const held = performance.now() - press.time;
    // A drag (orbit) moves a lot; a slow press is also not a tap.
    if (moved > 7 || held > 700) return;

    if (hitsHouse(event.clientX, event.clientY)) onActivate();
  });

  domElement.addEventListener('pointercancel', () => {
    tracking = false;
  });

  if (finePointer) {
    domElement.addEventListener('pointermove', (event) => {
      if (tracking) return;
      domElement.style.cursor = hitsHouse(event.clientX, event.clientY) ? 'pointer' : '';
    });
  }
}
