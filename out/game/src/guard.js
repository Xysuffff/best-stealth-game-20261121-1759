// Guard AI with vision cones and patrol behavior.
// Agent-authored: original guard AI with vision cones, patrol paths, and alert system.

import { GUARD_SPEED, GUARD_VISION_RANGE, GUARD_VISION_ANGLE, GUARD_TURN_SPEED, GUARD_RADIUS, STEP } from './config.js';

export function createGuard(path, index, level) {
  let waypointIndex = 0;
  let forward = true;
  let angle = 0;
  let targetAngle = 0;
  let alert = 0; // 0-1, how alert the guard is
  let suspicious = 0; // 0-1, investigating last known player position
  let suspiciousPos = null;
  let stuckTimer = 0;
  let lastX = path[0].x;
  let lastY = path[0].y;

  // Initial angle towards first waypoint
  if (path.length > 1) {
    const dx = path[1].x - path[0].x;
    const dy = path[1].y - path[0].y;
    angle = Math.atan2(dy, dx);
    targetAngle = angle;
  }

  function update(dt, player, guards) {
    const speed = GUARD_SPEED * (alert > 0.5 ? 1.3 : 1);
    let events = 0;

    // Check if player is visible
    const canSeePlayer = checkVision(player, level);

    if (canSeePlayer) {
      alert = Math.min(1, alert + dt * 2);
      suspicious = 1;
      suspiciousPos = { x: player.x, y: player.y };
      events |= 1; // SPOTTED
    } else {
      alert = Math.max(0, alert - dt * 0.5);
      if (suspicious > 0) suspicious = Math.max(0, suspicious - dt * 0.3);
    }

    // Movement
    if (suspicious > 0.5 && suspiciousPos) {
      // Investigate last known position
      const dx = suspiciousPos.x - lastX;
      const dy = suspiciousPos.y - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) {
        suspiciousPos = null;
        suspicious = 0;
      } else {
        targetAngle = Math.atan2(dy, dx);
        lastX += Math.cos(targetAngle) * speed * dt;
        lastY += Math.sin(targetAngle) * speed * dt;
      }
    } else {
      // Patrol
      if (path.length <= 1) return events;

      const target = path[waypointIndex];
      const dx = target.x - lastX;
      const dy = target.y - lastY;
      const dist = Math.hypot(dx, dy);

      if (dist < 15) {
        // Reached waypoint
        if (forward) {
          if (waypointIndex < path.length - 1) waypointIndex++;
          else { forward = false; waypointIndex--; }
        } else {
          if (waypointIndex > 0) waypointIndex--;
          else { forward = true; waypointIndex++; }
        }
        targetAngle = Math.atan2(path[waypointIndex].y - lastY, path[waypointIndex].x - lastX);
      } else {
        targetAngle = Math.atan2(dy, dx);
        // Move towards waypoint
        let nextX = lastX + Math.cos(targetAngle) * speed * dt;
        let nextY = lastY + Math.sin(targetAngle) * speed * dt;

        // Simple wall collision - push away from walls
        for (const wall of level.walls) {
          if (circleRectOverlap(nextX, nextY, GUARD_RADIUS, wall)) {
            // Push out
            const cx = Math.max(wall.x, Math.min(nextX, wall.x + wall.w));
            const cy = Math.max(wall.y, Math.min(nextY, wall.y + wall.h));
            const pdx = nextX - cx;
            const pdy = nextY - cy;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist < GUARD_RADIUS && pdist > 0) {
              nextX += (pdx / pdist) * (GUARD_RADIUS - pdist);
              nextY += (pdy / pdist) * (GUARD_RADIUS - pdist);
            }
          }
        }
        lastX = nextX;
        lastY = nextY;
      }
    }

    // Smooth angle interpolation
    let diff = targetAngle - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    angle += diff * Math.min(1, GUARD_TURN_SPEED * dt);

    // Stuck detection
    const moved = Math.hypot(lastX - path[waypointIndex]?.x ?? lastX, lastY - path[waypointIndex]?.y ?? lastY);
    if (moved < 5) stuckTimer += dt; else stuckTimer = 0;
    if (stuckTimer > 2) {
      // Force advance waypoint
      if (forward) waypointIndex = Math.min(path.length - 1, waypointIndex + 1);
      else waypointIndex = Math.max(0, waypointIndex - 1);
      stuckTimer = 0;
    }

    return events;
  }

  function checkVision(player, level) {
    if (player.isHidden) return false;
    const dx = player.x - lastX;
    const dy = player.y - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VISION_RANGE) return false;

    // Check angle
    const toPlayer = Math.atan2(dy, dx);
    let diff = toPlayer - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > GUARD_VISION_ANGLE / 2) return false;

    // Check line of sight (walls block vision)
    if (!level.hasLineOfSight(lastX, lastY, player.x, player.y)) return false;

    // Check if player is in cover/shadow
    if (level.isInCover(player.x, player.y)) return false;
    if (level.isInShadow(player.x, player.y, lastX, lastY)) return false;

    // Sneaking reduces detection range
    if (player.sneaking && dist > GUARD_VISION_RANGE * 0.4) return false;

    return true;
  }

  function getVisionCone() {
    return {
      x: lastX,
      y: lastY,
      angle,
      range: GUARD_VISION_RANGE,
      fov: GUARD_VISION_ANGLE,
      alert,
    };
  }

  function getPosition() {
    return { x: lastX, y: lastY };
  }

  function getAlertLevel() {
    return alert;
  }

  function makeNoise(x, y, radius) {
    const dx = x - lastX;
    const dy = y - lastY;
    if (dx * dx + dy * dy < radius * radius) {
      suspicious = 1;
      suspiciousPos = { x, y };
      alert = Math.max(alert, 0.3);
    }
  }

  return {
    update,
    getVisionCone,
    getPosition,
    getAlertLevel,
    makeNoise,
    index,
  };
}

function circleRectOverlap(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}