import * as THREE from 'three';
import { store } from '../state';

export class InteractionManager {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private clickableObjects: THREE.Object3D[] = [];

  // Drag detection
  private downPos: THREE.Vector2 = new THREE.Vector2();
  private isPointerDown: boolean = false;
  private dragThreshold: number = 6; // pixels

  // Hover state
  private isHoveringHouse: boolean = false;
  private onHoverChange?: (hovering: boolean) => void;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    clickableObjects: THREE.Object3D[],
    onHoverChange?: (hovering: boolean) => void
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.clickableObjects = clickableObjects;
    this.onHoverChange = onHoverChange;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.initEvents();
  }

  private initEvents() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
  }

  private updatePointerCoords(event: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown = (event: PointerEvent) => {
    this.isPointerDown = true;
    this.downPos.set(event.clientX, event.clientY);
  };

  private onPointerMove = (event: PointerEvent) => {
    // Only raycast hover on non-touch or when pointer is up
    if (event.pointerType === 'mouse' && !this.isPointerDown) {
      this.updatePointerCoords(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

      const hovering = intersects.length > 0;
      if (hovering !== this.isHoveringHouse) {
        this.isHoveringHouse = hovering;
        this.domElement.style.cursor = hovering ? 'pointer' : 'default';
        if (this.onHoverChange) {
          this.onHoverChange(hovering);
        }
      }
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    // Check movement distance from pointerdown
    const moveDist = Math.hypot(
      event.clientX - this.downPos.x,
      event.clientY - this.downPos.y
    );

    // If movement exceeds threshold, this was a camera orbit/drag, not a click!
    if (moveDist > this.dragThreshold) {
      return;
    }

    // It is a valid tap/click: raycast to see if the house was clicked
    this.updatePointerCoords(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (intersects.length > 0) {
      // Toggle house lights!
      store.toggleHouseLights();
    }
  };

  public dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
  }
}
