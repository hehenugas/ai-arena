import * as THREE from 'three';

interface Cloud {
  group: THREE.Group;
  speed: number;
  baseZ: number;
}

export function createClouds(scene: THREE.Scene): { update: (delta: number, wind: number, motionScale: number, day: number, rain: number) => void } {
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#f5f0df', emissive: '#807766', emissiveIntensity: 0.32, roughness: 1, transparent: true, opacity: 0.82, depthWrite: false });
  const clouds: Cloud[] = [];
  const placements = [
    { x: -3.2, y: 2.35, z: -1.55, s: 0.72, speed: 0.34 },
    { x: 2.65, y: 3.05, z: -2.1, s: 0.86, speed: 0.26 },
    { x: 0.9, y: 3.9, z: -3.8, s: 0.62, speed: 0.19 },
    { x: -2.1, y: 3.65, z: 1.8, s: 0.5, speed: 0.23 },
  ];
  for (const placement of placements) {
    const group = new THREE.Group();
    group.position.set(placement.x, placement.y, placement.z);
    group.scale.setScalar(placement.s);
    const puffs = [
      { x: -0.46, y: 0, z: 0, scale: [0.69, 0.34, 0.42] },
      { x: 0, y: 0.2, z: 0.04, scale: [0.65, 0.52, 0.48] },
      { x: 0.52, y: 0.04, z: -0.03, scale: [0.73, 0.37, 0.45] },
      { x: 0.16, y: -0.11, z: 0.2, scale: [0.82, 0.28, 0.39] },
    ];
    for (const puff of puffs) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), cloudMaterial);
      mesh.position.set(puff.x, puff.y, puff.z);
      mesh.scale.set(puff.scale[0], puff.scale[1], puff.scale[2]);
      group.add(mesh);
    }
    scene.add(group);
    clouds.push({ group, speed: placement.speed, baseZ: placement.z });
  }

  const dayCloud = new THREE.Color('#fff5df');
  const nightCloud = new THREE.Color('#6a7789');
  const rainCloud = new THREE.Color('#58636b');
  return {
    update(delta, wind, motionScale, day, rain) {
      cloudMaterial.color.copy(nightCloud).lerp(dayCloud, day).lerp(rainCloud, rain * 0.82);
      cloudMaterial.emissiveIntensity = 0.2 + day * 0.42;
      cloudMaterial.opacity = 0.68 + day * 0.17;
      for (const cloud of clouds) {
        cloud.group.position.x += delta * cloud.speed * wind * motionScale;
        if (cloud.group.position.x > 4.6) cloud.group.position.x = -4.6;
        cloud.group.position.z = cloud.baseZ + Math.sin(cloud.group.position.x * 0.3) * 0.08 * motionScale;
      }
    },
  };
}
