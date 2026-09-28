/** Direction the wind blows toward, on the horizontal plane. */
export const WIND_DIR_X = 0.878;
export const WIND_DIR_Z = 0.478;

export const HOME_CAMERA = { x: 5.45, y: 1.88, z: 5.95 };
export const HOME_TARGET = { x: 0.1, y: 0.48, z: -0.02 };

export const HOUSE = {
  x: 0.62,
  z: 0.0,
  get rotation() {
    return Math.atan2(HOME_CAMERA.x - this.x, HOME_CAMERA.z - this.z);
  },
};

export const POND = {
  x: -0.28,
  z: 1.22,
  rx: 0.86,
  rz: 0.6,
};

export const WINDMILL = {
  x: -1.22,
  z: -1.08,
};

export type TreeKind = "round" | "pine" | "small" | "bush";

export type TreeSpec = {
  x: number;
  z: number;
  kind: TreeKind;
  scale: number;
  phase: number;
  yaw: number;
};

export const TREES: TreeSpec[] = [
  { x: 1.68, z: -0.78, kind: "round", scale: 1.12, phase: 0.4, yaw: 0.3 },
  { x: -1.72, z: -0.08, kind: "round", scale: 0.88, phase: 1.7, yaw: 1.2 },
  { x: -0.18, z: -1.62, kind: "pine", scale: 1.08, phase: 2.4, yaw: 0.6 },
  { x: 1.95, z: 0.48, kind: "small", scale: 0.92, phase: 0.9, yaw: 2.1 },
  { x: 0.08, z: -0.88, kind: "small", scale: 0.78, phase: 3.3, yaw: 0.2 },
  { x: -1.68, z: 1.22, kind: "bush", scale: 0.9, phase: 2.2, yaw: 1.4 },
  { x: 1.48, z: 0.22, kind: "bush", scale: 0.82, phase: 1.1, yaw: 0.5 },
];

export const FENCE: Array<[number, number]> = [
  [-1.55, -1.15],
  [-1.92, -0.82],
  [-2.02, -0.38],
  [-1.78, -0.02],
  [-1.42, -0.28],
];

export const ROCKS: Array<{ x: number; z: number; s: number; yaw: number }> = [
  { x: 1.42, z: 1.52, s: 0.18, yaw: 0.4 },
  { x: 1.68, z: 1.28, s: 0.11, yaw: 1.3 },
  { x: 1.18, z: 1.68, s: 0.09, yaw: 2.2 },
  { x: -1.82, z: -0.72, s: 0.22, yaw: 0.7 },
  { x: -1.55, z: -0.95, s: 0.12, yaw: 1.8 },
  { x: 0.95, z: 1.58, s: 0.1, yaw: 0.2 },
];

export const BENCH = { x: -1.05, z: 0.72 };
