import * as THREE from 'three';
import { AppState } from '../state';
import { updateHouseLights } from '../scene/house';

export function setupPicker(
  camera: THREE.PerspectiveCamera,
  house: THREE.Group,
  state: AppState
): void {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let mouseDownPos = { x: 0, y: 0 };

  const canvas = document.getElementById('scene') as HTMLCanvasElement;

  canvas.addEventListener('mousedown', (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mouseup', (e) => {
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(house, true);

      if (intersects.length > 0) {
        state.houseLights = !state.houseLights;
        updateHouseLights(house, state.houseLights);
      }
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });

  canvas.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - mouseDownPos.x;
      const dy = touch.clientY - mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(house, true);

        if (intersects.length > 0) {
          state.houseLights = !state.houseLights;
          updateHouseLights(house, state.houseLights);
        }
      }
    }
  });
}
