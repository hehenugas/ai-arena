import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import type { FrameContext } from './state';
import { buildWaterGeometry, type IslandInfo } from './terrain';
import { mulberry32 } from './utils';

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>

  attribute float aShore;

  varying vec3 vWorld;
  varying float vShore;

  void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorld = worldPosition.xyz;
    vShore = aShore;

    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>

  uniform float uTime;
  uniform float uRain;
  uniform float uWind;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uSunIntensity;
  uniform float uAmbient;

  varying vec3 vWorld;
  varying float vShore;

  float waveHeight( vec2 p, float t ) {
    return sin( p.x * 1.9 + t * 1.1 ) * 0.5
         + sin( p.y * 2.3 - t * 1.35 ) * 0.5
         + sin( ( p.x + p.y ) * 4.3 + t * 2.0 ) * 0.22;
  }

  void main() {
    vec2 p = vWorld.xz;
    float e = 0.14;
    float h = waveHeight( p, uTime );
    float hx = waveHeight( p + vec2( e, 0.0 ), uTime );
    float hz = waveHeight( p + vec2( 0.0, e ), uTime );

    float amp = ( 0.055 + uWind * 0.12 ) * ( 1.0 + uRain * 1.3 );
    vec3 n = normalize( vec3( -( hx - h ) / e * amp, 1.0, -( hz - h ) / e * amp ) );

    vec3 viewDir = normalize( cameraPosition - vWorld );
    vec3 lightDir = normalize( uSunDir );
    vec3 halfway = normalize( lightDir + viewDir );

    float diffuse = max( dot( n, lightDir ), 0.0 );
    float specular = pow( max( dot( n, halfway ), 0.0 ), 120.0 );
    float fresnel = pow( 1.0 - max( dot( n, viewDir ), 0.0 ), 3.2 );

    vec3 base = mix( uDeep, uShallow, 0.22 + 0.52 * ( 1.0 - vShore ) );
    vec3 color = base * ( uAmbient + diffuse * uSunIntensity * 0.55 );
    color += uSunColor * specular * uSunIntensity * 0.85;
    color = mix( color, uSky, fresnel * 0.55 );

    float dimple = sin( p.x * 33.0 + uTime * 8.0 ) * sin( p.y * 31.0 - uTime * 7.0 );
    color *= 1.0 - uRain * ( 0.05 + 0.045 * ( dimple * 0.5 + 0.5 ) );

    float alpha = mix( 0.58, 0.93, smoothstep( 1.0, 0.22, vShore ) );
    gl_FragColor = vec4( color, alpha );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createPondMaterial(): ShaderMaterial {
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uRain: { value: 0 },
      uWind: { value: 0.3 },
      uDeep: { value: new Color('#1b3d52') },
      uShallow: { value: new Color('#4c8494') },
      uSky: { value: new Color('#cfe3f2') },
      uSunColor: { value: new Color('#fff1d8') },
      uSunDir: { value: [0, 1, 0] },
      uSunIntensity: { value: 2 },
      uAmbient: { value: 0.6 },
    },
  ]);

  return new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    fog: true,
  });
}

export interface Pond {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createPond(info: IslandInfo): Pond {
  const group = new Group();
  group.name = 'pond';

  const material = createPondMaterial();
  const mesh = new Mesh(buildWaterGeometry(info), material);
  mesh.position.set(info.pond.x, info.waterLevel, info.pond.z);
  mesh.renderOrder = 1;
  mesh.receiveShadow = false;
  group.add(mesh);

  const uniformSunDir = material.uniforms.uSunDir.value as unknown as number[];
  const sky = material.uniforms.uSky.value as Color;
  const sunColor = material.uniforms.uSunColor.value as Color;

  return {
    group,
    update(ctx: FrameContext) {
      material.uniforms.uTime.value = ctx.elapsed;
      material.uniforms.uRain.value = ctx.rain;
      material.uniforms.uWind.value = ctx.wind;
      sky.copy(ctx.palette.horizon);
      sunColor.copy(ctx.palette.keyColor);
      uniformSunDir[0] = ctx.lightDir.x;
      uniformSunDir[1] = ctx.lightDir.y;
      uniformSunDir[2] = ctx.lightDir.z;
      material.uniforms.uSunIntensity.value = ctx.palette.keyIntensity;
      material.uniforms.uAmbient.value = 0.3 + ctx.palette.hemiIntensity * 0.55 + ctx.palette.ambient;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Ripples                                                            */
/* ------------------------------------------------------------------ */

interface Ripple {
  mesh: Mesh<RingGeometry, MeshBasicMaterial>;
  material: MeshBasicMaterial;
  age: number;
  life: number;
  active: boolean;
}

export interface RipplePool {
  group: Group;
  spawn(x: number, z: number): void;
  update(dt: number, visible: number): void;
}

const RIPPLE_COUNT = 34;
const RIPPLE_GEOMETRY = new RingGeometry(0.55, 1, 22);

/** A fixed pool of ripple rings that are recycled instead of re-created. */
export function createRipplePool(info: IslandInfo): RipplePool {
  const group = new Group();
  group.name = 'ripples';
  const rand = mulberry32(4711);
  const ripples: Ripple[] = [];

  for (let i = 0; i < RIPPLE_COUNT; i++) {
    const material = new MeshBasicMaterial({
      color: '#e6f4ff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: true,
    });
    const mesh = new Mesh(RIPPLE_GEOMETRY, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(info.pond.x, info.waterLevel + 0.014, info.pond.z);
    mesh.visible = false;
    mesh.renderOrder = 3;
    mesh.matrixAutoUpdate = true;
    group.add(mesh);
    ripples.push({ mesh, material, age: 0, life: 0, active: false });
  }

  return {
    group,
    spawn(x: number, z: number) {
      for (const ripple of ripples) {
        if (ripple.active) continue;
        ripple.active = true;
        ripple.age = 0;
        ripple.life = 1.1 + rand() * 0.7;
        ripple.mesh.position.set(x, info.waterLevel + 0.014, z);
        ripple.mesh.visible = true;
        return;
      }
    },
    update(dt: number, visible: number) {
      for (const ripple of ripples) {
        if (!ripple.active) continue;
        ripple.age += dt;
        const t = ripple.age / ripple.life;
        if (t >= 1 || visible <= 0.001) {
          ripple.active = false;
          ripple.mesh.visible = false;
          ripple.material.opacity = 0;
          continue;
        }
        const scale = 0.12 + t * 1.15;
        ripple.mesh.scale.setScalar(scale);
        ripple.material.opacity = Math.pow(1 - t, 1.6) * 0.34 * visible;
      }
    },
  };
}
