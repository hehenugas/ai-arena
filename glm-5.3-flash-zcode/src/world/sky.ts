import {
  BackSide,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { moonDirection, sunDirection, type SkySample } from '../palette';
import { hash3 } from './noise';

const VERT = /* glsl */ `
varying vec3 vWorldPosition;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uDeep;
varying vec3 vWorldPosition;
void main() {
  float h = normalize(vWorldPosition).y;
  vec3 color;
  if (h >= 0.0) {
    color = mix(uHorizon, uTop, pow(min(h * 1.5, 1.0), 0.7));
  } else {
    color = mix(uHorizon, uDeep, min(-h * 1.8, 1.0));
  }
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface Sky {
  group: Group;
  update(time: number, rainAmount: number, sample: SkySample): void;
}

export function createSky(): Sky {
  const group = new Group();

  const domeMat = new ShaderMaterial({
    uniforms: {
      uTop: { value: new Color(0x6f9fd4) },
      uHorizon: { value: new Color(0xf6e7c4) },
      uDeep: { value: new Color(0x46536e) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: BackSide,
    depthWrite: false,
  });
  const dome = new Mesh(new SphereGeometry(58, 32, 15), domeMat);
  group.add(dome);

  // Stars: two shells worth of points on the upper hemisphere.
  const starCount = 340;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let tries = 0; tries < 20; tries++) {
      x = hash3(i, tries, 1) * 2 - 1;
      y = hash3(tries, i, 2);
      z = hash3(i, tries, 3) * 2 - 1;
      const len = Math.hypot(x, y, z);
      if (len > 0.05 && y / len > 0.06) {
        const s = 53 / len;
        starPos[i * 3] = x * s;
        starPos[i * 3 + 1] = y * s;
        starPos[i * 3 + 2] = z * s;
        break;
      }
    }
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  const starMat = new PointsMaterial({
    color: 0xdfe8ff,
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new Points(starGeo, starMat);
  group.add(stars);

  const celestial = (discR: number, haloR: number, discColor: number, haloColor: number) => {
    const g = new Group();
    const disc = new Mesh(
      new CircleGeometry(discR, 24),
      new MeshBasicMaterial({
        color: discColor,
        transparent: true,
        fog: false,
        toneMapped: false,
        depthWrite: false,
      })
    );
    const halo = new Mesh(
      new CircleGeometry(haloR, 24),
      new MeshBasicMaterial({
        color: haloColor,
        transparent: true,
        opacity: 0.32,
        fog: false,
        toneMapped: false,
        depthWrite: false,
      })
    );
    halo.position.z = -0.1;
    g.add(halo, disc);
    group.add(g);
    return { g, disc, halo };
  };

  const sun = celestial(1.9, 3.8, 0xfff3c9, 0xffd98a);
  const moon = celestial(1.25, 2.5, 0xeef2fb, 0xcdd9f0);

  const dir = { x: 0, y: 0, z: 0 };

  return {
    group,
    update(time, rainAmount, sample) {
      domeMat.uniforms.uTop.value.copy(sample.skyTop);
      domeMat.uniforms.uHorizon.value.copy(sample.skyHorizon);
      domeMat.uniforms.uDeep.value.copy(sample.skyDeep);

      starMat.opacity = sample.night * (1 - rainAmount * 0.85);
      stars.visible = starMat.opacity > 0.02;
      stars.rotation.y = time * 0.02; // slow drift so the night sky is alive

      sunDirection(time, dir);
      const sunUp = Math.min(Math.max((dir.y + 0.06) / 0.18, 0), 1);
      sun.g.position.set(dir.x * 50, dir.y * 50, dir.z * 50);
      sun.g.lookAt(0, 0, 0);
      sun.g.visible = sunUp > 0.01;
      (sun.disc.material as MeshBasicMaterial).opacity = sunUp;
      (sun.halo.material as MeshBasicMaterial).opacity = 0.32 * sunUp * (1 - rainAmount * 0.8);

      moonDirection(time, dir);
      const moonUp = Math.min(Math.max((-dir.y + 0.02) / 0.15, 0), 1);
      moon.g.position.set(dir.x * 48, dir.y * 48, dir.z * 48);
      moon.g.lookAt(0, 0, 0);
      moon.g.visible = moonUp > 0.01;
      (moon.disc.material as MeshBasicMaterial).opacity = moonUp * (1 - rainAmount * 0.75);
      (moon.halo.material as MeshBasicMaterial).opacity = 0.26 * moonUp * (1 - rainAmount * 0.8);
    },
  };
}
