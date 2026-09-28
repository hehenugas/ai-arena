import { CanvasTexture, RepeatWrapping } from 'three';
import {
  makeMottleTexture,
  makeRoofTexture,
  makeWaterNormalTexture,
  makeWoodTexture,
} from './textures';

export interface TextureSet {
  mottle: CanvasTexture;
  wood: CanvasTexture;
  roof: CanvasTexture;
  waterNormal: CanvasTexture;
}

let cache: TextureSet | null = null;

/** All procedural textures, created once and shared across builders. */
export function getTextures(): TextureSet {
  if (!cache) {
    cache = {
      mottle: makeMottleTexture(256, 0.09),
      wood: makeWoodTexture(256),
      roof: makeRoofTexture(256),
      waterNormal: makeWaterNormalTexture(256),
    };
  }
  return cache;
}

/** Independent repeat/offset wrapper around a shared texture image. */
export function variant(base: CanvasTexture, repeatX: number, repeatY: number): CanvasTexture {
  const tex = base.clone();
  tex.needsUpdate = true;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}
