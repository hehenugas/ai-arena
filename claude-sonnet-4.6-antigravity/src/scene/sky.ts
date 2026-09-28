// Gradient sky background using a large sphere with vertex colors
import * as THREE from 'three';

export interface SkyObjects {
  mesh: THREE.Mesh;
  update: (topColor: THREE.Color, horizonColor: THREE.Color) => void;
}

export function createSky(): SkyObjects {
  const geo = new THREE.SphereGeometry(150, 32, 16);
  geo.scale(-1, 1, -1); // invert normals — renders from inside

  // Add vertex color attribute for gradient
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;

  function update(topColor: THREE.Color, horizonColor: THREE.Color): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col = geo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const y = pos.getY(i);
      // t=0 at equator, t=1 at top, horizon band near y=0
      const t = Math.max(0, Math.min(1, (y + 10) / 80));
      const c = horizonColor.clone().lerp(topColor, t);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  return { mesh, update };
}

// Star field for nighttime
export function createStars(): THREE.Points {
  const count = 1200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Distribute on upper hemisphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9); // skip bottom
    const r = 130;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  return new THREE.Points(geo, mat);
}
