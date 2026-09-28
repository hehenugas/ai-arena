import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface ControlsHandle {
  controls: OrbitControls;
  update(dt:	number): void;
}

// Orbit controls with damping, plus click-to-select via raycasting
export function setupControls(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
  scene: THREE.Scene,
  onHouseClick: () => void,
): ControlsHandle {
  const controls  = new OrbitControls(camera,dom);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;
  controls.enablePan  = false;
  controls.minDistance  = 3.0;
  controls.maxDistance  = 15.0;
  controls.minPolarAngle  = 0.15;
  controls.maxPolarAngle  = 1.5;
  controls.target.set(0,	0.35,	0);

	  let startX  = 0.0;
	  let startY  = 0.0;
	  let startT  = 0.0;
	  const raycaster  = new THREE.Raycaster();
	  const ndc  = new THREE.Vector2();

	  dom.addEventListener('pointerdown', (e: PointerEvent) => {
    startX  = e.clientX;
    startY  = e.clientY;
    startT  = performance.now();
  });

	  dom.addEventListener('pointerup', (e: PointerEvent) => {
    const dx  = e.clientX -	startX;
    const dy  = e.clientY -	startY;
    const dt  = performance.now() -	startT;
    if (dx *	dx +	dy *	dy >	64.0) return;
    if (dt >	500.0) return;
    const rect  = dom.getBoundingClientRect();
    ndc.x  = ((e.clientX -	rect.left) /	rect.width) *	2 -	1;
    ndc.y  = -(((e.clientY -	rect.top) /	rect.height) *	2 -	1);
    raycaster.setFromCamera(ndc,camera);
    const hits  = raycaster.intersectObjects(scene.children,	true);
    if (hits.length >	0) {
      let obj: THREE.Object3D | null  = hits[0].object;
      while (obj) {
        if ((obj.userData as { isHouse?:	boolean }).isHouse) {
          onHouseClick();
          break;
        }
        obj  = obj.parent;
      }
    }
  });

	  return {
    controls,
    update:	(_dt:	number): void =>	{
      controls.update();
    },
  };
}