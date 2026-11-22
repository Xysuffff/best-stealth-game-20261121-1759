// Game configuration constants
// Agent-authored: all game constants tuned for Midnight Heist stealth gameplay.

export const TILE = 32;
export const GRID_W = 32;
export const GRID_H = 20;
export const WORLD_W = GRID_W * TILE;
export const WORLD_H = GRID_H * TILE;

export const PLAYER_SPEED = 140;
export const PLAYER_SNEAK_SPEED = 70;
export const PLAYER_RADIUS = 12;

export const GUARD_SPEED = 90;
export const GUARD_VISION_RANGE = 180;
export const GUARD_VISION_ANGLE = Math.PI / 3; // 60 degrees
export const GUARD_TURN_SPEED = 2.5;
export const GUARD_RADIUS = 14;

export const ARTIFACT_RADIUS = 16;
export const EXIT_RADIUS = 24;

export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

export const ALERT_DECAY = 0.3; // per second
export const ALERT_SIGHT_INCREASE = 25; // per second when seen
export const ALERT_NOISE_INCREASE = 15; // per noise event
export const ALERT_MAX = 100;
export const ALERT_WARN = 40;
export const ALERT_DANGER = 70;

export const NOISE_RADIUS_WALK = 80;
export const NOISE_RADIUS_RUN = 180;
export const NOISE_RADIUS_INTERACT = 60;

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_WON = 3;
export const SCREEN_LOST = 4;

export const EVENT_NONE = 0;
export const EVENT_SPOTTED = 1;
export const EVENT_GOT_ARTIFACT = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_CAUGHT = 8;

export const BEST_KEY = 'midnight-heist-best-time';

export const COLORS = {
  bg: '#0a0a0f',
  wall: '#1a1a2e',
  wallTop: '#252540',
  floor: '#0f0f1a',
  floorAlt: '#121222',
  shadow: 'rgba(0,0,0,0.4)',
  cover: '#1e1e35',
  coverEdge: '#2a2a4a',
  player: '#e8c860',
  playerSneak: '#a8c8e8',
  guard: '#d86060',
  guardAlert: '#f88080',
  guardVision: 'rgba(220,100,100,0.12)',
  guardVisionEdge: 'rgba(220,100,100,0.25)',
  artifact: '#f0e050',
  artifactGlow: 'rgba(240,224,80,0.4)',
  exit: '#60d880',
  exitGlow: 'rgba(96,216,128,0.4)',
  exitLocked: '#555570',
  uiText: '#e8e8f0',
  uiDim: '#888aa0',
  uiAlert: '#f88080',
  uiWarn: '#f8c860',
  uiGood: '#80e8a0',
  noiseRipple: 'rgba(220,220,240,0.3)',
};
