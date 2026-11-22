// Keyboard input. Held keys give a movement vector; one-shot presses (interact, pause)
// are queued as bit flags and taken once by the loop, so a press between two frames
// is never lost and never counted twice.
// Agent-authored: input handler with WASD/arrows, sneak toggle, interact, and pause.

export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SNEAK = 4; // held, not one-shot

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['Space', 'Enter']);
const PAUSE = new Set(['Escape', 'KeyP']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let sneak = false;
  let actions = 0;

  function onKeyDown(event) {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (SNEAK.has(event.code)) sneak = true;
    else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  }

  function onKeyUp(event) {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (SNEAK.has(event.code)) sneak = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // Keys released while tab is hidden never send keyup: let go of everything on blur.
  window.addEventListener('blur', () => { up = down = left = right = sneak = false; });
  target.addEventListener('pointerdown', () => { actions |= ACTION_INTERACT; });

  return {
    /** Movement vector: { x: -1..1, y: -1..1 }, normalized. */
    direction() {
      let x = (right ? 1 : 0) - (left ? 1 : 0);
      let y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Whether sneak is held. */
    isSneaking() {
      return sneak;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
