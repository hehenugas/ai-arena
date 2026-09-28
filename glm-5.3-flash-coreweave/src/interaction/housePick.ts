import * as THREE from 'three';

/**
 * Distinguishes a click/tap from an orbit gesture: the pointer must stay within
 * a few pixels and be released quickly. Only then is the house raycast.
 */
export function initHousePick(
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  target: THREE.Object3D,
  onToggle: () => void,
): void {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  interface Down {
    x: number;
    y: number;
    t: number;
    moved: boolean;
  }
  let down: Down | null = null;
  let lastHover = 0;

  const toNdc = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const hitTest = (): boolean => {
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(target, true).length > 0;
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; // ignore aux buttons; primary + touch pass
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (down) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) down.moved = true;
      return;
    }
    const now = performance.now();
    if (e.pointerType === 'touch' || now - lastHover < 100) return;
    lastHover = now;
    toNdc(e);
    canvas.style.cursor = hitTest() ? 'pointer' : '';
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const quick = performance.now() - down.t < 600;
    const wasTap = !down.moved && quick;
    down = null;
    if (!wasTap) return;
    toNdc(e);
    if (hitTest()) onToggle();
  });

  canvas.addEventListener('pointercancel', () => {
    down = null;
  });
}
