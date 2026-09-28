import * as THREE from 'three';
import type { SceneRefs } from './scene';

export function setupHouseInteraction(refs: SceneRefs, onToggle: () => void): () => void {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downAt = 0;

  const onPointerDown = (event: PointerEvent) => {
    downX = event.clientX;
    downY = event.clientY;
    downAt = performance.now();
  };

  const onPointerUp = (event: PointerEvent) => {
    const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
    if (moved > 8 || performance.now() - downAt > 550) return;
    const bounds = refs.renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, refs.camera);
    const intersections = raycaster.intersectObject(refs.house, true);
    if (intersections.length > 0) onToggle();
  };

  refs.renderer.domElement.addEventListener('pointerdown', onPointerDown);
  refs.renderer.domElement.addEventListener('pointerup', onPointerUp);
  return () => {
    refs.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    refs.renderer.domElement.removeEventListener('pointerup', onPointerUp);
  };
}
