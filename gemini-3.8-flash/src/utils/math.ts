export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getTimePhase(hours: number): { label: string; icon: string } {
  if (hours >= 5 && hours < 7.5) {
    return { label: 'Sunrise', icon: '🌅' };
  } else if (hours >= 7.5 && hours < 11.5) {
    return { label: 'Morning', icon: '🌤️' };
  } else if (hours >= 11.5 && hours < 16) {
    return { label: 'Midday', icon: '☀️' };
  } else if (hours >= 16 && hours < 18.5) {
    return { label: 'Golden Hour', icon: '🌇' };
  } else if (hours >= 18.5 && hours < 20.5) {
    return { label: 'Dusk', icon: '🌆' };
  } else {
    return { label: 'Night', icon: '🌙' };
  }
}
