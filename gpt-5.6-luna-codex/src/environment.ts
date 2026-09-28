import * as THREE from 'three';
import type { SceneRefs } from './scene';
import type { WorldState } from './state';

const daySky = new THREE.Color(0xb9dcd9);
const sunsetSky = new THREE.Color(0xdf9c7e);
const nightSky = new THREE.Color(0x162b42);
const dayFog = new THREE.Color(0xb9dcd9);
const sunsetFog = new THREE.Color(0xc78573);
const nightFog = new THREE.Color(0x20344f);
const dayHemi = new THREE.Color(0xd7f1ee);
const nightHemi = new THREE.Color(0x415b86);
const dayGround = new THREE.Color(0x665043);
const nightGround = new THREE.Color(0x172334);

function smoothstep(edge0: number, edge1: number, value: number): number {
  const normalized = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function mixColor(target: THREE.Color, first: THREE.Color, second: THREE.Color, amount: number): void {
  target.copy(first).lerp(second, amount);
}

export class EnvironmentController {
  private weatherBlend = 0;
  private sky = new THREE.Color();
  private fog = new THREE.Color();
  private windmillRotation = 0;

  update(refs: SceneRefs, state: WorldState, delta: number, reducedMotion: boolean): void {
    const hour = ((state.time % 24) + 24) % 24;
    const daylight = smoothstep(5.2, 8.2, hour) * (1 - smoothstep(17.1, 20.9, hour));
    const sunset = Math.max(smoothstep(4.8, 7.0, hour) - smoothstep(7.0, 8.8, hour), 0)
      + Math.max(smoothstep(16.6, 18.8, hour) - smoothstep(18.8, 20.4, hour), 0);
    const night = 1 - daylight;
    const sunsetAmount = THREE.MathUtils.clamp(sunset, 0, 1);

    if (sunsetAmount > 0.04) {
      mixColor(this.sky, daySky, sunsetSky, sunsetAmount);
      mixColor(this.fog, dayFog, sunsetFog, sunsetAmount);
    } else {
      mixColor(this.sky, nightSky, daySky, daylight);
      mixColor(this.fog, nightFog, dayFog, daylight);
    }
    if (night > 0.55 && sunsetAmount < 0.05) {
      this.sky.lerp(nightSky, THREE.MathUtils.clamp((night - 0.55) * 2.2, 0, 1));
      this.fog.lerp(nightFog, THREE.MathUtils.clamp((night - 0.55) * 2.2, 0, 1));
    }
    const sceneBackground = refs.scene.background as THREE.Color;
    sceneBackground.lerp(this.sky, 1 - Math.exp(-delta * 5));
    const fog = refs.scene.fog as THREE.Fog;
    fog.color.lerp(this.fog, 1 - Math.exp(-delta * 5));
    refs.skyFill.material.color.lerp(this.sky, 1 - Math.exp(-delta * 5));

    const sunAngle = ((hour - 12) / 24) * Math.PI * 2;
    const sunHeight = Math.sin(((hour - 6) / 24) * Math.PI * 2);
    const horizontal = Math.cos(sunAngle) * 11;
    refs.sun.position.set(horizontal, 2.5 + sunHeight * 10, Math.sin(sunAngle) * 10);
    const warm = THREE.MathUtils.clamp(sunsetAmount * 0.85 + (1 - daylight) * 0.18, 0, 1);
    refs.sun.color.copy(new THREE.Color(0xffe5bd)).lerp(new THREE.Color(0xffb38a), warm);
    const targetSun = 0.35 + daylight * 1.9 + sunsetAmount * 0.25;
    refs.sun.intensity = THREE.MathUtils.damp(refs.sun.intensity, targetSun, 4.4, delta);
    refs.hemi.intensity = THREE.MathUtils.damp(refs.hemi.intensity, 0.65 + daylight * 1.2, 4, delta);
    refs.hemi.color.lerp(dayHemi, 1 - Math.exp(-delta * 4));
    refs.hemi.groundColor.lerp(dayGround, 1 - Math.exp(-delta * 3));
    if (night > 0.25) {
      refs.hemi.color.lerp(nightHemi, night * 0.55);
      refs.hemi.groundColor.lerp(nightGround, night * 0.65);
    }
    refs.stars.material.opacity = THREE.MathUtils.damp(refs.stars.material.opacity, THREE.MathUtils.clamp((night - 0.28) * 1.25, 0, 0.9), 4, delta);
    refs.stars.rotation.y += (reducedMotion ? 0 : delta * 0.003);

    const targetWeather = state.weather === 'rain' ? 1 : 0;
    this.weatherBlend = THREE.MathUtils.damp(this.weatherBlend, targetWeather, 4.5, delta);
    refs.rain.update(delta, state.wind, state.weather === 'rain');
    refs.rain.group.position.x = Math.sin(state.time * 0.15) * 0.05;
    refs.clouds.children.forEach((cloud, index) => {
      cloud.position.x += state.wind * (0.035 + index * 0.012) * delta;
      if (cloud.position.x > 14) cloud.position.x = -14;
      const cloudChild = cloud.children[0];
      const cloudMaterial = cloudChild instanceof THREE.Mesh ? cloudChild.material : undefined;
      if (cloudMaterial instanceof THREE.MeshStandardMaterial) {
        cloudMaterial.color.lerp(new THREE.Color(0x74869b), this.weatherBlend * 0.72);
        cloudMaterial.opacity = 0.86 + this.weatherBlend * 0.1;
      }
    });

    const motionScale = reducedMotion ? 0.18 : 1;
    this.windmillRotation += delta * (0.18 + state.wind * 2.25) * motionScale;
    refs.windmillBlades.rotation.z = this.windmillRotation;
    refs.trees.forEach(({ group, phase, amount }) => {
      group.rotation.z = Math.sin(performance.now() * 0.00125 * motionScale + phase) * state.wind * amount * 0.055;
      group.rotation.x = Math.cos(performance.now() * 0.001 * motionScale + phase) * state.wind * amount * 0.028;
    });

    refs.windows.forEach((window) => {
      const material = window.material;
      const target = state.houseLights ? 1.9 + night * 1.15 : 0.08;
      material.emissive.set(state.houseLights ? 0xffae5c : 0x182a28);
      material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, target, 8, delta);
    });
    const targetGlow = state.houseLights ? 1.25 + night * 0.7 : 0;
    refs.houseGlow.intensity = THREE.MathUtils.damp(refs.houseGlow.intensity, targetGlow, 7, delta);
    refs.houseGlow.distance = 3.8 + night * 1.3;

    refs.ripples.forEach(({ mesh, phase }) => {
      const cycle = (performance.now() * 0.0011 * motionScale + phase) % 2.4;
      const progress = cycle / 2.4;
      const ripple = mesh.material as THREE.MeshBasicMaterial;
      mesh.scale.set(1.35 + progress * 1.8, 0.75 + progress * 1.1, 1);
      ripple.opacity = this.weatherBlend * (1 - progress) * 0.38;
    });
  }
}
