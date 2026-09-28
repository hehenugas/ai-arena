export interface AppState {
  time: number;
  weather: 'clear' | 'rain';
  wind: number;
  lightsOn: boolean;
}

export const DEFAULTS: Readonly<AppState> = {
  time: 16,
  weather: 'clear',
  wind: 0.3,
  lightsOn: false,
};

export type StateListener = (state: AppState, prev: AppState) => void;

let current: AppState = { ...DEFAULTS };
const listeners: StateListener[] = [];
let resetFlag = false;

export function getState(): Readonly<AppState> {
  return current;
}

export function setState(partial: Partial<AppState>): void {
  const prev = { ...current };
  current = { ...current, ...partial };
  for (const fn of listeners) fn(current, prev);
}

export function resetState(): void {
  resetFlag = true;
  setState({ ...DEFAULTS });
}

export function consumeResetFlag(): boolean {
  const val = resetFlag;
  resetFlag = false;
  return val;
}

export function subscribe(fn: StateListener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
