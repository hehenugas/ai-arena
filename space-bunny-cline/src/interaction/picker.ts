import * as THREE from 'three';

const CLICK_SLOP = 6; // px of travel still counted as a click, not an orbit drag

export interface PickerOptions {
  dom: HTMLElement;
  camera: THREE.Camera;
  targets: THREE.Object3D[];
  onSelect: (hit: THREE.Object3D | null) => void;
  onGestureStart?: () => void;
}

/**
 * Turns pointer input into "the user meant to click the house". A drag that
 * happens to start on the house never fires, because the pointer must barely
 * move between press and release.
 */
export function createPicker(options: PickerOptions): () => void {
  const { dom, camera, targets, onSelect, onGestureStart } = options;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let tracking = false;
  let moved = false;
  let lastHover = 0;
  let hovered: THREE.Object3D | null = null;

  const pick = (event: PointerEvent): THREE.Object3D | null => {
    const rect = dom.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(targets, true);
    return hits.length > 0 ? hits[0].object : null;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    tracking = true;
    moved = false;
    downX = event.clientX;
    downY = event.clientY;
    downTime = performance.now();
    onGestureStart?.();
  };

  const onMove = (event: PointerEvent) => {
    if (tracking) {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > CLICK_SLOP) moved = true;
      return;
    }
    // hover feedback, throttled to ~20 Hz
    const now = performance.now();
    if (now - lastHover < 50) return;
    lastHover = now;
    const next = pick(event);
    if (next !== hovered) {
      hovered = next;
      dom.style.cursor = next ? 'pointer' : 'grab';
    }
  };

  const onUp = (event: PointerEvent) => {
    if (!tracking) return;
    tracking = false;
    const quick = performance.now() - downTime < 600;
    if (moved || !quick) return;
    const hit = pick(event);
    if (hit) onSelect(hit);
  };

  const onCancel = () => {
    tracking = false;
  };

  dom.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  return () => {
    dom.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };
}
