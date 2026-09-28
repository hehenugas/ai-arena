// Height of the grass surface above island centre, in world units.
export function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rr = Math.min(r / 1.52, 1.0);
  const base =  	 0.38 +  	 0.36 * rr * rr;
  const bump =  	 Math.sin(r * 9.5 + x * 2.3 - z * 1.7) * 0.035;
  return base + bump * (0.4 +  	 0.6 * rr);
}