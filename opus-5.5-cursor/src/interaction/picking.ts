import * as THREE from 'three';

const TAP_DISTANCE = 6;
const TAP_TIME = 650;

/**
 * Turns a short, stationary single-pointer press on the house into a "tap".
 * Orbit drags and pinch gestures never count, even if they start on the house.
 */
export class HousePicker {
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly pointers = new Set<number>();
  private press: { id: number; x: number; y: number; t: number } | null = null;
  private gestureCancelled = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly targets: THREE.Object3D[],
    private readonly onTap: () => void,
  ) {
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.style.cursor = 'grab';
  }

  private hit(clientX: number, clientY: number): boolean {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.intersectObjects(this.targets, false).length > 0;
  }

  private readonly onDown = (e: PointerEvent) => {
    this.pointers.add(e.pointerId);
    if (this.pointers.size > 1) this.gestureCancelled = true;
    if (e.isPrimary && e.button === 0) {
      this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    }
    this.canvas.style.cursor = 'grabbing';
  };

  private readonly onMove = (e: PointerEvent) => {
    if (this.press && e.pointerId === this.press.id) {
      if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > TAP_DISTANCE) {
        this.gestureCancelled = true;
      }
      return;
    }
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      this.canvas.style.cursor = this.hit(e.clientX, e.clientY) ? 'pointer' : 'grab';
    }
  };

  private readonly onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    const p = this.press;
    if (p && e.pointerId === p.id) {
      const still = Math.hypot(e.clientX - p.x, e.clientY - p.y) <= TAP_DISTANCE;
      const quick = performance.now() - p.t <= TAP_TIME;
      if (!this.gestureCancelled && still && quick && this.hit(e.clientX, e.clientY)) this.onTap();
      this.press = null;
    }
    if (this.pointers.size === 0) this.gestureCancelled = false;
    this.canvas.style.cursor = e.pointerType === 'mouse' && this.hit(e.clientX, e.clientY) ? 'pointer' : 'grab';
  };

  private readonly onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.press = null;
    this.gestureCancelled = this.pointers.size > 0;
  };

  private readonly onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !this.press) this.canvas.style.cursor = 'grab';
  };
}
