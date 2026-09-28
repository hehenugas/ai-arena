export type Quality = {
  rain: number;
  tufts: number;
  shadowMap: number;
  stars: number;
  pixelRatioCap: number;
};

export function detectQuality(): Quality {
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  const cores = navigator.hardwareConcurrency || 8;
  const low = small || cores <= 4;
  return {
    rain: low ? 140 : 300,
    tufts: low ? 36 : 52,
    shadowMap: low ? 1024 : 2048,
    stars: low ? 90 : 170,
    pixelRatioCap: low ? 1.35 : 1.75,
  };
}
