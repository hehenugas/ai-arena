import * as THREE from 'three';

/**
 * Click-vs-drag aware picking. Calls `onHouseClick` only when the pointer
 * pressed and released on the house hitbox with minimal movement.
 */
export function setupHousePicking(
  dom: HTMLElement,
  camera: THREE.Camera,
  hitbox: THREE.Object3D,
  onHouseClick: () => void
): void {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downOnHouse = false;
  let pointerId = -1;

  const pick = (x: number, y: number): boolean => {
    const rect = dom.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(hitbox, false).length > 0;
  };

  dom.addEventListener('pointerdown', (e) => {
    if (pointerId !== -1) return;
    pointerId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    downOnHouse = pick(e.clientX, e.clientY);
  });

  dom.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (downOnHouse && moved < 8 && pick(e.clientX, e.clientY)) {
      onHouseClick();
    }
    downOnHouse = false;
  });

  dom.addEventListener('pointercancel', () => {
    pointerId = -1;
    downOnHouse = false;
  });
}
