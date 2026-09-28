import * as THREE from 'three';
import { AppState } from '../state';
import { lerp } from '../utils';

export class SkySystem {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;
  private skyMesh: THREE.Mesh;
  private stars: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -15;
    this.sunLight.shadow.camera.right = 15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.3);
    scene.add(this.hemisphereLight);

    const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x87ceeb) },
        uBottomColor: { value: new THREE.Color(0xe0f0ff) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = smoothstep(-0.1, 0.5, h);
          vec3 color = mix(uBottomColor, uTopColor, t);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(this.skyMesh);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 90;
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0,
    });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(this.stars);
  }

  update(state: AppState, _delta: number): void {
    const time = state.time;
    const sunAngle = ((time - 6) / 12) * Math.PI;
    const sunX = Math.cos(sunAngle) * 50;
    const sunY = Math.sin(sunAngle) * 50;
    this.sunLight.position.set(sunX, Math.max(sunY, -10), 20);

    const dayFactor = Math.max(0, Math.sin(sunAngle));
    const rainFactor = state.weather === 'rain' ? 0.5 : 1;

    const sunColor = new THREE.Color();
    if (time > 6 && time < 18) {
      if (time > 16 && time < 19) {
        sunColor.setHSL(0.05, 0.8, 0.6);
      } else {
        sunColor.setHSL(0.1, 0.3, 0.9);
      }
    } else {
      sunColor.setHSL(0.6, 0.3, 0.1);
    }
    this.sunLight.color = sunColor;
    this.sunLight.intensity = dayFactor * rainFactor * 1.5;

    this.ambientLight.intensity = 0.2 + dayFactor * 0.3;
    this.hemisphereLight.intensity = 0.1 + dayFactor * 0.3;

    const skyMaterial = this.skyMesh.material as THREE.ShaderMaterial;
    const topColor = new THREE.Color();
    const bottomColor = new THREE.Color();

    if (time > 6 && time < 18) {
      if (time > 16 && time < 19) {
        topColor.setHSL(0.6, 0.5, 0.3);
        bottomColor.setHSL(0.05, 0.8, 0.6);
      } else {
        topColor.setHSL(0.55, 0.6, 0.5);
        bottomColor.setHSL(0.55, 0.4, 0.8);
      }
    } else {
      topColor.setHSL(0.65, 0.5, 0.05);
      bottomColor.setHSL(0.65, 0.3, 0.15);
    }

    if (state.weather === 'rain') {
      topColor.multiplyScalar(0.5);
      bottomColor.multiplyScalar(0.5);
    }

    skyMaterial.uniforms.uTopColor.value = topColor;
    skyMaterial.uniforms.uBottomColor.value = bottomColor;

    const starMaterial = this.stars.material as THREE.PointsMaterial;
    starMaterial.opacity = Math.max(0, 1 - dayFactor * 2);

    const fogColor = bottomColor.clone();
    this.scene.fog = new THREE.Fog(fogColor, 30, 100);
  }
}
