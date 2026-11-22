// Screenshot staging: runs the game for a fixed time from a fresh state to capture
// representative frames (title, gameplay, win). The same seed always produces the same frames.

import { STEP, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WON } from './config.js';
import { createWorld } from './world.js';
import { createRandom } from './random.js';

const START_SECONDS = 3;
const PLAY_SECONDS = 20;
const WIN_SECONDS = 35;

export function stageShot(name, seed) {
  const random = createRandom(seed);
  const world = createWorld(random);
  const input = createMockInput();

  if (name === 'start') {
    for (let i = 0; i < START_SECONDS / STEP; i++) world.step(STEP, input);
    return { screen: SCREEN_TITLE, world: world.state() };
  }

  if (name === 'play') {
    world.setScreen(SCREEN_PLAY);
    for (let i = 0; i < PLAY_SECONDS / STEP; i++) {
      const state = world.state();
      const player = state.player;
      const artifact = state.artifact;
      if (!artifact.collected) {
        const dx = artifact.x - player.x, dy = artifact.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 30) { input.setDirection(dx / dist, dy / dist);
          let sneak = false; for (const g of state.guards) { const gdx = g.pos.x - player.x, gdy = g.pos.y - player.y; if (gdx*gdx+gdy*gdy<40000){sneak=true;break;} }
          input.setSneak(sneak);
        } else { input.setDirection(0,0); input.setInteract(true); }
      } else if (!state.exit.unlocked) {
        const dx = state.exit.x - player.x, dy = state.exit.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 30) input.setDirection(dx/dist, dy/dist);
        else { input.setDirection(0,0); input.setInteract(true); }
      }
      world.step(STEP, input); input.clearInteract();
      if (world.getScreen() !== SCREEN_PLAY) break;
    }
    return { screen: world.getScreen(), world: world.state() };
  }

  if (name === 'win') {
    world.setScreen(SCREEN_PLAY);
    for (let i = 0; i < WIN_SECONDS / STEP; i++) {
      const state = world.state();
      const player = state.player;
      const artifact = state.artifact;
      if (!artifact.collected) {
        const dx = artifact.x - player.x, dy = artifact.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 30) { input.setDirection(dx/dist, dy/dist);
          let sneak = false; for (const g of state.guards) { const gdx = g.pos.x - player.x, gdy = g.pos.y - player.y; if (gdx*gdx+gdy*gdy<40000){sneak=true;break;} }
          input.setSneak(sneak);
        } else { input.setDirection(0,0); input.setInteract(true); }
      } else if (!state.exit.unlocked) {
        const dx = state.exit.x - player.x, dy = state.exit.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 30) input.setDirection(dx/dist, dy/dist);
        else { input.setDirection(0,0); input.setInteract(true); }
      }
      world.step(STEP, input); input.clearInteract();
      if (world.getScreen() === SCREEN_WON) break;
    }
    return { screen: world.getScreen(), world: world.state() };
  }

  for (let i = 0; i < START_SECONDS / STEP; i++) world.step(STEP, input);
  return { screen: SCREEN_TITLE, world: world.state() };
}

function createMockInput() {
  let dx=0,dy=0,sneak=false,interact=false;
  return { direction(){return{x:dx,y:dy};}, isSneaking(){return sneak;}, takeActions(){const a=interact?1:0;interact=false;return a;}, setDirection(x,y){dx=x;dy=y;}, setSneak(s){sneak=s;}, setInteract(){interact=true;}, clearInteract(){interact=false;} };
}