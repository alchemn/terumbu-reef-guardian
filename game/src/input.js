// Keyboard, mouse and touch input. Held keys (or a pointer target) steer the turtle;
// one-shot presses — start/restart, pause, mute — are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter', 'KeyR']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  const keys = { up: false, down: false, left: false, right: false };
  let actions = 0;
  // Pointer target in canvas pixels, or null when the pointer is idle.
  let pointer = null;
  let pointerAge = 99;

  function toLocal(event) {
    const rect = target.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    pointer = null;
  });

  target.addEventListener('pointermove', (event) => {
    pointer = toLocal(event);
    pointerAge = 0;
  });
  target.addEventListener('pointerdown', (event) => {
    pointer = toLocal(event);
    pointerAge = 0;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerleave', () => {
    pointer = null;
  });

  return {
    /** Steering vector {x, y} in [-1, 1]: keys win, else glide toward the pointer. */
    move() {
      const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (kx !== 0 || ky !== 0) return { x: kx, y: ky, byPointer: false };
      if (pointer) return { x: 0, y: 0, byPointer: true, tx: pointer.x, ty: pointer.y };
      return { x: 0, y: 0, byPointer: false };
    },
    /** How long (seconds) since the pointer last moved; the world ages it. */
    pointerFresh() {
      return pointerAge < 2.5;
    },
    agePointer(dt) {
      pointerAge += dt;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
