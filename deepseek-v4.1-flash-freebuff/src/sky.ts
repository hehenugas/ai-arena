import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { FrameContext } from './state';
import { makeGlowTexture, mulberry32, smoothstep } from './utils';

const DOME_RADIUS = 220;
const GLOW_DISTANCE = 190;

const domeVertex = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = normalize( position );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const domeFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uSunDir;
  uniform float uGlowStrength;

  varying vec3 vDir;

  void main() {
    vec3 dir = normalize( vDir );

    // Most of the frame sits just above the horizon, so the gradient has to
    // reach the deeper top colour quickly to keep the sky from looking washed out.
    float t = smoothstep( -0.03, 0.3, dir.y );
    t = pow( t, 0.85 );
    vec3 color = mix( uHorizon, uTop, t );

    float sun = max( dot( dir, normalize( uSunDir ) ), 0.0 );
    color += uGlow * ( pow( sun, 6.0 ) * 0.35 + pow( sun, 48.0 ) * 0.9 ) * uGlowStrength;

    // Beneath the horizon the sky falls away into a soft band instead of a hard line.
    color = mix( color * 0.55, color, smoothstep( -0.26, 0.0, dir.y ) );

    gl_FragColor = vec4( color, 1.0 );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface Sky {
  group: Group;
  update(ctx: FrameContext): void;
}

export function createSky(): Sky {
  const group = new Group();
  group.name = 'sky';

  const uniforms = {
    uTop: { value: new Color('#3d7ccd') },
    uHorizon: { value: new Color('#cfe3f2') },
    uGlow: { value: new Color('#ffe0b4') },
    uSunDir: { value: new Vector3(0, 1, 0) },
    uGlowStrength: { value: 0.5 },
  };

  const dome = new Mesh(
    new SphereGeometry(DOME_RADIUS, 32, 20),
    new ShaderMaterial({
      uniforms,
      vertexShader: domeVertex,
      fragmentShader: domeFragment,
      side: BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  dome.renderOrder = -4;
  dome.frustumCulled = false;
  group.add(dome);

  const glowTexture = makeGlowTexture();

  const sunSprite = new Sprite(
    new SpriteMaterial({
      map: glowTexture,
      color: new Color('#fff4de'),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      opacity: 0.9,
    }),
  );
  sunSprite.scale.setScalar(34);
  sunSprite.renderOrder = -2;

  const moonSprite = new Sprite(
    new SpriteMaterial({
      map: glowTexture,
      color: new Color('#e9f0ff'),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      opacity: 0.8,
    }),
  );
  moonSprite.scale.setScalar(13);
  moonSprite.renderOrder = -2;

  group.add(sunSprite, moonSprite);

  const rand = mulberry32(77123);
  const makeStars = (count: number, size: number, radius: number): Points => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      // Keep the field above the horizon so stars never sit under the island.
      const y = Math.abs(u) * 0.96 + 0.04;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      positions[i * 3] = Math.cos(phi) * r * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(phi) * r * radius;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: '#e8f0ff',
      size,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const points = new Points(geometry, material);
    points.renderOrder = -3;
    points.frustumCulled = false;
    return points;
  };

  const starsFaint = makeStars(620, 1.4, DOME_RADIUS * 0.92);
  const starsBright = makeStars(110, 2.4, DOME_RADIUS * 0.92);
  group.add(starsFaint, starsBright);

  const sunPosition = new Vector3();
  const moonPosition = new Vector3();

  return {
    group,
    update(ctx: FrameContext) {
      const { palette, sunDir } = ctx;
      uniforms.uTop.value.copy(palette.skyTop);
      uniforms.uHorizon.value.copy(palette.horizon);
      uniforms.uGlow.value.copy(palette.glow);
      uniforms.uGlowStrength.value = palette.glowStrength;
      uniforms.uSunDir.value.copy(sunDir);

      sunPosition.copy(sunDir).multiplyScalar(GLOW_DISTANCE);
      sunSprite.position.copy(sunPosition);
      const sunVisibility = smoothstep(-0.16, 0.02, sunDir.y);
      const sunMaterial = sunSprite.material;
      sunMaterial.color.copy(palette.sunDisc);
      sunMaterial.opacity = sunVisibility * (1 - ctx.rain * 0.85);

      // The moon sits where the key light comes from, so the visible glow
      // always matches the direction of the shadows.
      moonPosition.copy(ctx.lightDir).multiplyScalar(GLOW_DISTANCE);
      moonSprite.position.copy(moonPosition);
      const moonMaterial = moonSprite.material;
      moonMaterial.opacity = smoothstep(0.1, -0.1, sunDir.y) * (1 - ctx.rain * 0.9) * 0.9;

      const starOpacity = palette.starOpacity;
      (starsFaint.material as PointsMaterial).opacity = starOpacity * 0.75;
      (starsBright.material as PointsMaterial).opacity = starOpacity;
    },
  };
}
