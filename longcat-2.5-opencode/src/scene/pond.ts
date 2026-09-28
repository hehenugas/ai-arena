import * as THREE from 'three';

export function createPond(): THREE.Group {
  const group = new THREE.Group();

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRainIntensity: { value: 0 },
      uWaterColor: { value: new THREE.Color(0x4a90b8) },
      uSkyColor: { value: new THREE.Color(0x87ceeb) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uRainIntensity;
      uniform vec3 uWaterColor;
      uniform vec3 uSkyColor;
      varying vec2 vUv;

      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);

        float ripple = sin(dist * 40.0 - uTime * 4.0) * 0.5 + 0.5;
        ripple *= uRainIntensity;

        vec3 color = uWaterColor;
        color += vec3(0.15) * ripple;

        float edge = smoothstep(0.5, 0.35, dist);
        color = mix(color * 0.6, color, edge);

        float reflection = smoothstep(0.3, 0.0, dist);
        color = mix(color, uSkyColor * 0.5, reflection * 0.3);

        gl_FragColor = vec4(color, 0.85);
      }
    `,
    transparent: true,
  });

  const water = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.05;
  water.receiveShadow = true;
  group.add(water);

  const shore = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.8, 32),
    new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.9 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = 0.02;
  shore.receiveShadow = true;
  group.add(shore);

  group.userData.waterMaterial = waterMaterial;
  return group;
}
