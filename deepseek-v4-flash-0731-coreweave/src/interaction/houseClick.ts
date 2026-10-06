import * as THREE from 'three';

/**
 * Click/tap-to-toggle for the house. A <6 px, <600 ms pointer gesture that
 * raycasts onto the house toggles the lights; any larger movement is treated
 * as an orbit drag and is ignored.
 */
export function attachHouseClick(
  dom: HTMLElement,
  camera: THREE.Camera,
  house: THREE.Object3D,
  onToggle: () => void
): () => void {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downT = 0;
  let down = false;

  const onDown = (e: PointerEvent): void => {
    down = true;
    downX = e.clientX;
    downY = e.clientY;
    downT = performance.now();
  };

  const onUp = (e: PointerEvent): void => {
    if (!down) return;
    down = false;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    const dt = performance.now() - downT;
    if (dx * dx + dy * dy > 36 || dt > 600) return;

    const rect = dom.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(house, true);
    if (hits.length > 0) onToggle();
  };

  const onCancel = (): void => {
    down = false;
  };

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', onCancel);

  return () => {
    dom.removeEventListener('pointerdown', onDown);
    dom.removeEventListener('pointerup', onUp);
    dom.removeEventListener('pointercancel', onCancel);
  };
}