// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between screens: title, play, paused, won, lost.
// ?seed=N fixes the RNG. ?shot=start|play|win (with &seed=N) stages that scene for a screenshot.

import { STEP, MAX_FRAME, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WON, SCREEN_LOST } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_INTERACT, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const titleScreen = document.getElementById('title');
const startBtn = document.getElementById('start-btn');
const ui = document.getElementById('ui');
const messageEl = document.getElementById('message');

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let accumulator = 0;
let last = performance.now();

function showMessage(text, duration = 3000) {
  messageEl.textContent = text;
  messageEl.classList.add('show');
  setTimeout(() => messageEl.classList.remove('show'), duration);
}

function announce(message) {
  status.textContent = message;
}

function startGame() {
  world.setScreen(SCREEN_PLAY);
  titleScreen.classList.add('hidden');
  ui.classList.remove('hidden');
  accumulator = 0;
  announce('Heist begun. Find the artifact and escape.');
}

function handleActions() {
  const actions = input.takeActions();
  const currentScreen = world.getScreen();
  if (actions & ACTION_INTERACT) {
    if (currentScreen === SCREEN_TITLE || currentScreen === SCREEN_WON || currentScreen === SCREEN_LOST) {
      startGame();
    }
  }
  if (actions & ACTION_PAUSE) {
    if (currentScreen === SCREEN_PLAY) {
      world.setScreen(SCREEN_PAUSED);
      announce('Paused.');
    } else if (currentScreen === SCREEN_PAUSED) {
      world.setScreen(SCREEN_PLAY);
      announce('Resumed.');
    }
  }
}

function step() {
  const currentScreen = world.getScreen();
  if (currentScreen === SCREEN_TITLE) {
    world.step(STEP, input);
    return;
  }
  if (currentScreen === SCREEN_PAUSED) return;
  const events = world.step(STEP, input);
  const state = world.state();
  if (events & 8) { // EVENT_CAUGHT
    announce('Caught! The guards spotted you.');
  } else if (events & 4) { // EVENT_ESCAPED
    announce(`Escape successful! Time: ${formatTime(state.gameTime)}`);
  } else if (events & 2) { // EVENT_GOT_ARTIFACT
    announce('Artifact secured! Exit unlocked.');
    showMessage('ARTIFACT SECURED - EXIT UNLOCKED');
  } else if (events & 1) { // EVENT_SPOTTED
    announce('Guard alert! Stay hidden.');
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds * 100) % 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  handleActions();
  const currentScreen = world.getScreen();
  if (currentScreen === SCREEN_TITLE || currentScreen === SCREEN_PLAY) {
    while (accumulator >= STEP && (world.getScreen() === SCREEN_TITLE || world.getScreen() === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
  } else {
    accumulator = 0;
  }
  renderer.draw(world.state(), currentScreen);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.getScreen() === SCREEN_PLAY) {
    world.setScreen(SCREEN_PAUSED);
    announce('Paused.');
  }
});

startBtn.addEventListener('click', startGame);
canvas.addEventListener('click', startGame);

announce('Midnight Heist. Press Space or click to begin.');
requestAnimationFrame(frame);

if (shot) {
  const scene = stageShot(shot, seed);
  let painted = 0;
  function paint() {
    renderer.draw(scene.world, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}