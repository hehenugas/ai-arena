import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HOME_CAMERA, HOME_TARGET } from "../scene/layout";
import { isHouseObject } from "../scene/house";

const DRAG_THRESHOLD = 6;

export type CameraRig = {
  camera: THREE.PerspectiveCamera;
  update: () => void;
  reset: () => void;
};

export function createCameraRig(canvas: HTMLCanvasElement): CameraRig {
  const camera = new THREE.PerspectiveCamera(34, 1, 0.08, 180);
  camera.position.set(HOME_CAMERA.x, HOME_CAMERA.y, HOME_CAMERA.z);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.75;
  controls.minDistance = 5.7;
  controls.maxDistance = 12.4;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = 1.48;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  controls.update();
  controls.saveState();

  return {
    camera,
    update() {
      controls.update();
    },
    reset() {
      controls.reset();
    },
  };
}

export function bindHousePicking(canvas: HTMLCanvasElement, camera: THREE.Camera, root: THREE.Object3D, onHouse: () => void): void {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let tracking = false;
  let dragged = false;
  let downX = 0;
  let downY = 0;

  const setPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const inside = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  };

  const hover = (event: PointerEvent) => {
    if (!inside(event)) {
      canvas.classList.remove("is-house");
      return;
    }
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(root, true);
    canvas.classList.toggle("is-house", isHouseObject(hits[0]?.object ?? null));
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    tracking = true;
    dragged = false;
    downX = event.clientX;
    downY = event.clientY;
    canvas.classList.add("is-dragging");
  });

  window.addEventListener("pointermove", (event) => {
    if (!tracking) {
      hover(event);
      return;
    }
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > DRAG_THRESHOLD) dragged = true;
  });

  window.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    const shouldPick = !dragged && event.button === 0;
    tracking = false;
    canvas.classList.remove("is-dragging");
    if (!shouldPick) return;
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(root, true);
    if (isHouseObject(hits[0]?.object ?? null)) onHouse();
  });

  window.addEventListener("pointercancel", () => {
    tracking = false;
    dragged = false;
    canvas.classList.remove("is-dragging");
  });
}
