import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  Scene,
} from 'three';
import type { Env } from './environment';

/**
 * One shadow-casting key light (sun by day, moon by night) plus soft fill.
 * Blending between sun and moon happens inside Environment.compute().
 */
export class LightRig {
  private sun: DirectionalLight;
  private hemi: HemisphereLight;
  private ambient: AmbientLight;
  private target = new Object3D();

  constructor(scene: Scene, shadowMapSize: number) {
    this.target.position.set(0, 0, 0);
    scene.add(this.target);

    this.sun = new DirectionalLight('#ffeed6', 3);
    this.sun.castShadow = true;
    this.sun.target = this.target;
    const shadow = this.sun.shadow;
    shadow.mapSize.set(shadowMapSize, shadowMapSize);
    shadow.camera.near = 2;
    shadow.camera.far = 110;
    shadow.camera.left = -13;
    shadow.camera.right = 13;
    shadow.camera.top = 13;
    shadow.camera.bottom = -13;
    shadow.bias = -0.0004;
    shadow.normalBias = 0.035;
    scene.add(this.sun);

    this.hemi = new HemisphereLight('#cfe3ee', '#6f6152', 0.9);
    scene.add(this.hemi);

    this.ambient = new AmbientLight('#bfd4e4', 0.12);
    scene.add(this.ambient);
  }

  update(env: Env): void {
    this.sun.position.copy(env.lightPos).multiplyScalar(55);
    this.sun.color.copy(env.lightColor);
    this.sun.intensity = env.lightIntensity;

    this.hemi.color.copy(env.hemiSky);
    this.hemi.groundColor.copy(env.hemiGround);
    this.hemi.intensity = env.hemiIntensity;

    this.ambient.color.copy(env.ambientColor);
    this.ambient.intensity = env.ambientIntensity;
  }
}
