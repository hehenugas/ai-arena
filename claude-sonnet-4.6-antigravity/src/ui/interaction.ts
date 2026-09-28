// House click interaction — distinguishes click from orbit drag
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { store } from '../state/store';

export function setupHouseInteraction(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  houseMeshes: THREE.Object3D[],
  onToggle: (on: boolean) => void
): void {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let mouseDownPos = new THREE.Vector2();
  let isDragging = false;
  const DRAG_THRESHOLD = 5; // px

  renderer.domElement.addEventListener('pointerdown', (e) => {
    mouseDownPos.set(e.clientX, e.clientY);
    isDragging = false;
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      isDragging = true;
    }
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (isDragging) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(houseMeshes, false);
    if (hits.length > 0) {
      const next = !store.get().houseLightsOn;
      store.set({ houseLightsOn: next });
      onToggle(next);
    }
  });
}
