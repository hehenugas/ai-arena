import * as THREE from 'three';
import type { UpdaterCtx, WorldPiece } from '../state';
import { M } from '../materials';

/**
 * Octagonal windmill: stone skirt, cream tower, terracotta cap, and four
 * canvas sails whose speed eases toward the shared wind strength.
 */
export function createWindmill(): WorldPiece {
  const g = new THREE.Group();

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.88, 2.7, 10), M.wall);
  tower.position.y = 1.35;
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.08, 0.35, 10), M.stoneDark);
  skirt.position.y = 0.175;
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  g.add(skirt);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.52, 0.06), M.woodDark);
  door.position.set(0, 0.5, 0.82);
  door.castShadow = true;
  g.add(door);

  const win = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), M.stoneDark);
  win.position.set(0, 1.95, 0.63);
  g.add(win);

  const capRing = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.16, 10), M.woodDark);
  capRing.position.y = 2.78;
  capRing.castShadow = true;
  g.add(capRing);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.75, 10), M.roof);
  cap.position.y = 3.23;
  cap.castShadow = true;
  g.add(cap);

  // sail assembly, tilted slightly skyward
  const head = new THREE.Group();
  head.position.set(0, 2.45, 0);
  head.rotation.x = -0.16;

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), M.metal);
  axle.rotation.x = Math.PI / 2;
  axle.position.z = 0.4;
  axle.castShadow = true;
  head.add(axle);

  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M.metal);
  hub.position.z = 0.78;
  hub.castShadow = true;
  head.add(hub);

  const blades = new THREE.Group();
  blades.position.z = 0.85;
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    blade.rotation.z = (i * Math.PI) / 2;

    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.15, 0.035), M.wood);
    spar.position.y = 0.62;
    spar.castShadow = true;
    blade.add(spar);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.95, 0.014), M.sail);
    sail.position.set(0.17, 0.78, 0);
    sail.rotation.y = 0.28;
    sail.castShadow = true;
    blade.add(sail);

    blades.add(blade);
  }
  head.add(blades);
  g.add(head);

  g.position.set(3.6, 0, -2.2);
  g.rotation.y = -0.35;
  blades.rotation.z = Math.PI / 4; // classic diagonal rest pose

  let speed = 0;

  return {
    group: g,
    update(ctx: UpdaterCtx) {
      // At zero wind the mill stalls; speed eases so gusts feel weighty.
      const target = ctx.smooth.wind * 2.6;
      speed += (target - speed) * (1 - Math.exp(-1.6 * ctx.dt));
      blades.rotation.z -= speed * ctx.dt;
    },
  };
}
