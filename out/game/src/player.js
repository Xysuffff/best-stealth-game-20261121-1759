// Player character with movement, sneaking, and interaction.
// Agent-authored: player controller with sneaking, noise generation, and cover detection.

import { PLAYER_SPEED, PLAYER_SNEAK_SPEED, PLAYER_RADIUS, STEP } from './config.js';

export function createPlayer(startX, startY, level) {
  let x = startX;
  let y = startY;
  let sneaking = false;
  let footstepTimer = 0;
  let lastFootstepSound = 0;

  function update(dt, input, level, guards, artifact, exit, audio) {
    // Agent-authored: per-frame player update - movement, collision, footsteps, interaction.

    const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    let events = 0;

    // Movement
    const { x: dx, y: dy } = input.direction();
    if (dx !== 0 || dy !== 0) {
      let nextX = x + dx * speed * dt;
      let nextY = y + dy * speed * dt;

      // Wall collision
      for (const wall of level.walls) {
        if (circleRectOverlap(nextX, nextY, PLAYER_RADIUS, wall)) {
          const cx = Math.max(wall.x, Math.min(nextX, wall.x + wall.w));
          const cy = Math.max(wall.y, Math.min(nextY, wall.y + wall.h));
          const pdx = nextX - cx;
          const pdy = nextY - cy;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist < PLAYER_RADIUS && pdist > 0) {
            nextX += (pdx / pdist) * (PLAYER_RADIUS - pdist);
            nextY += (pdy / pdist) * (PLAYER_RADIUS - pdist);
          }
        }
      }

      x = nextX;
      y = nextY;

      // Footstep sounds and noise
      footstepTimer += dt;
      const footstepInterval = sneaking ? 0.5 : 0.3;
      if (footstepTimer >= footstepInterval) {
        footstepTimer = 0;
        audio.playFootstep(sneaking);
        // Make noise for guards
        const noiseRadius = sneaking ? 80 : 180;
        for (const guard of guards) {
          guard.makeNoise(x, y, noiseRadius);
        }
      }
    }

    // Sneaking
    sneaking = input.isSneaking();

    // Interaction
    const actions = input.takeActions();
    if (actions & 1) { // ACTION_INTERACT
      // Check artifact
      if (!artifact.collected) {
        const dx = artifact.x - x;
        const dy = artifact.y - y;
        if (dx * dx + dy * dy < 40 * 40) {
          artifact.collected = true;
          audio.playArtifactPickup();
          events |= 2; // EVENT_GOT_ARTIFACT
          // Make noise
          for (const guard of guards) {
            guard.makeNoise(x, y, 60);
          }
        }
      }
      // Check exit
      if (artifact.collected && !exit.unlocked) {
        const dx = exit.x - x;
        const dy = exit.y - y;
        if (dx * dx + dy * dy < 50 * 50) {
          exit.unlocked = true;
          audio.playEscape();
          events |= 4; // EVENT_ESCAPED
        }
      }
    }

    // Check if in cover
    const inCover = level.isInCover(x, y);

    return {
      x, y,
      sneaking,
      inCover,
      events,
    };
  }

  function getPosition() {
    // Agent-authored: returns current player position.

    return { x, y };
  }

  function isSneaking() {
    // Agent-authored: returns whether player is currently sneaking.

    return sneaking;
  }

  function reset(startX, startY) {
    // Agent-authored: resets player to start position for new game.

    x = startX;
    y = startY;
    sneaking = false;
    footstepTimer = 0;
  }

  return { update, getPosition, isSneaking, reset };
}

function circleRectOverlap(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}