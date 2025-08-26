// Simple shared controller so other screens can control the player
export type PlayerControls = {
  togglePlay: () => void | Promise<void>;
  playNext: () => void | Promise<void>;
  playPrev: () => void | Promise<void>;
  toggleFavorite: () => void | Promise<void>;
  seekTo: (millis: number) => void | Promise<void>;
  playAtIndex: (index: number) => void | Promise<void>;
};

let controls: PlayerControls = {
  togglePlay: () => {},
  playNext: () => {},
  playPrev: () => {},
  toggleFavorite: () => {},
  seekTo: () => {},
  playAtIndex: () => {},
};

let state = {
  isPlaying: false,
  isFav: false,
  position: 0,
  duration: 0,
  track: null as any,
  queue: [] as any[],
  currentIndex: -1,
};

type State = typeof state;

const listeners = new Set<(s: State) => void>();

export function registerControls(c: PlayerControls) {
  controls = c;
}

export function getControls() {
  return controls;
}

export function setPlayerState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function subscribe(listener: (s: State) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}
