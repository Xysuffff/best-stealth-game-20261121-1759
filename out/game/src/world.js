// Game world: ties together level, player, guards, artifact, exit.
// Step advances simulation and returns event flags.
// Agent-authored: world coordinator with alert system, win/lose conditions, and best time tracking.

import { STEP, ALERT_DECAY, ALERT_SIGHT_INCREASE, ALERT_NOISE_INCREASE, ALERT_MAX, ALERT_WARN, ALERT_DANGER,
  EVENT_NONE, EVENT_SPOTTED, EVENT_GOT_ARTIFACT, EVENT_ESCAPED, EVENT_CAUGHT,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WON, SCREEN_LOST } from './config.js';
import { createLevel } from './level.js';
import { createGuard } from './guard.js';
import { createPlayer } from './player.js';
import { createAudio, startAmbient, stopAmbient } from './audio.js';

export function createWorld(random) {
  const level = createLevel(random);
  const audio = createAudio();

  // Create guards from patrol paths
  const guards = level.patrolPaths.map((path, i) => createGuard(path, i, level));

  const player = createPlayer(level.playerStart.x, level.playerStart.y, level);

  const artifact = { ...level.artifact, collected: false, pulse: 0 };
  const exit = { ...level.exit, unlocked: false, pulse: 0 };

  let alertLevel = 0;
  let gameTime = 0;
  let bestTime = 0;
  let screen = SCREEN_TITLE;
  let gameOver = false;
  let gameWon = false;

  let currentPlayerState = { x: level.playerStart.x, y: level.playerStart.y, sneaking: false, inCover: false };

  function readBest() {
    try {
      return Number.parseInt(window.localStorage.getItem('midnight-heist-best-time') ?? '0', 10) || 0;
    } catch { return 0; }
  }

  function saveBest(time) {
    try { window.localStorage.setItem('midnight-heist-best-time', String(time)); } catch {}
  }

  function step(dt, input) {
    if (screen !== SCREEN_PLAY) return EVENT_NONE;

    let events = EVENT_NONE;
    gameTime += dt;

    artifact.pulse += dt * 3;
    if (exit.unlocked) exit.pulse += dt * 5;

    const pResult = player.update(dt, input, level, guards, artifact, exit, audio);
    currentPlayerState = { x: pResult.x, y: pResult.y, sneaking: pResult.sneaking, inCover: pResult.inCover };
    events |= pResult.events;

    let maxGuardAlert = 0;
    for (const guard of guards) {
      const guardEvents = guard.update(dt, currentPlayerState, guards);
      if (guardEvents & 1) events |= EVENT_SPOTTED;
      maxGuardAlert = Math.max(maxGuardAlert, guard.getAlertLevel());
    }

    if (events & EVENT_SPOTTED) {
      alertLevel = Math.min(ALERT_MAX, alertLevel + ALERT_SIGHT_INCREASE * dt);
      audio.playWarning();
    } else {
      alertLevel = Math.max(0, alertLevel - ALERT_DECAY * dt);
    }
    alertLevel = Math.max(alertLevel, maxGuardAlert * ALERT_MAX);

    if (alertLevel >= ALERT_MAX && (events & EVENT_SPOTTED)) {
      gameOver = true; gameWon = false; screen = SCREEN_LOST;
      audio.playCaught(); stopAmbient();
      events |= EVENT_CAUGHT;
    }

    if (events & EVENT_ESCAPED) {
      gameOver = true; gameWon = true; screen = SCREEN_WON;
      if (gameTime < bestTime || bestTime === 0) { bestTime = gameTime; saveBest(bestTime); }
      stopAmbient();
    }

    return events;
  }

  function getState() {
    return {
      player: currentPlayerState,
      guards: guards.map(g => ({
        pos: g.getPosition(),
        vision: g.getVisionCone(),
        alert: g.getAlertLevel(),
      })),
      artifact: { x: artifact.x, y: artifact.y, collected: artifact.collected, pulse: artifact.pulse },
      exit: { x: exit.x, y: exit.y, unlocked: exit.unlocked, pulse: exit.pulse },
      level,
      alertLevel,
      gameTime,
      bestTime,
      screen,
      gameOver,
      gameWon,
    };
  }

  function setScreen(newScreen) {
    screen = newScreen;
    if (newScreen === SCREEN_PLAY && (gameOver || gameWon)) {
      // Restart
      gameOver = false;
      gameWon = false;
      alertLevel = 0;
      gameTime = 0;
      artifact.collected = false;
      artifact.pulse = 0;
      exit.unlocked = false;
      exit.pulse = 0;
      player.reset(level.playerStart.x, level.playerStart.y);
      currentPlayerState = { x: level.playerStart.x, y: level.playerStart.y, sneaking: false, inCover: false };
      // Recreate guards to reset their positions
      guards.length = 0;
      guards.push(...level.patrolPaths.map((path, i) => createGuard(path, i, level)));
      startAmbient();
    }
  }

  bestTime = readBest();
  startAmbient();

  return { state: getState, step, reset: () => {}, setScreen, getScreen: () => screen };
}