import * as THREE from 'three';

const DRAG_THRESHOLD = 6;     // px — beyond this, the gesture is an orbit, not a click
const TAP_TIME_MS = 400;

/**
 * Distinguishes a click/tap on the house from an orbit drag.
 * Only a quick, nearly stationary press toggles the lights.
 */
export class HouseClickHandler {
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private moved = false;
  private active = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly targets: () => THREE.Object3D[],
    private readonly onToggle: () => void,
  ) {
    this.canvas.addEventListener('pointerdown', this.handleDown, { passive: true });
    this.canvas.addEventListener('pointermove', this.handleMove, { passive: true });
    this.canvas.addEventListener('pointerup', this.handleUp, { passive: true });
    this.canvas.addEventListener('pointercancel', this.handleCancel, { passive: true });
  }

  private handleDown = (e: PointerEvent): void => {
    if (e.button !== undefined && e.button !== 0) return; // left / touch only
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downTime = performance.now();
    this.moved = false;
    this.active = true;
  };

  private handleMove = (e: PointerEvent): void => {
    if (!this.active) return;
    if (Math.abs(e.clientX - this.downX) > DRAG_THRESHOLD || Math.abs(e.clientY - this.downY) > DRAG_THRESHOLD) {
      this.moved = true;
    }
  };

  private handleUp = (): void => {
    if (!this.active) return;
    this.active = false;
    if (this.moved) return;                            // it was an orbit drag
    if (performance.now() - this.downTime > TAP_TIME_MS) return; // long press, ignore
    this.tryPick(this.downX, this.downY);
  };

  private handleCancel = (): void => {
    this.active = false;
  };

  private tryPick(x: number, y: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((y - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets(), false);
    if (hits.length > 0) {
      this.onToggle();
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handleDown);
    this.canvas.removeEventListener('pointermove', this.handleMove);
    this.canvas.removeEventListener('pointerup', this.handleUp);
    this.canvas.removeEventListener('pointercancel', this.handleCancel);
  }
}
