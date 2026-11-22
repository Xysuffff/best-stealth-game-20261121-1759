// Renderer: draws the game world to canvas. Pure drawing, no game logic.
// Agent-authored: completely rewritten for Midnight Heist stealth game.

import { WORLD_W, WORLD_H, COLORS, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WON, SCREEN_LOST,
  GUARD_VISION_RANGE, GUARD_VISION_ANGLE, PLAYER_RADIUS, GUARD_RADIUS, ARTIFACT_RADIUS, EXIT_RADIUS } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewScale = 1;
  let viewX = 0;
  let viewY = 0;
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    viewScale = Math.min(width / WORLD_W, height / WORLD_H);
    viewX = (width - WORLD_W * viewScale) / 2;
    viewY = (height - WORLD_H * viewScale) / 2;
  }

  function setTransform() {
    ctx.setTransform(viewScale, 0, 0, viewScale, viewX, viewY);
  }

  function resetTransform() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function text(value, x, y, size, color, align = 'left', baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px 'JetBrains Mono', monospace`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(value, x, y);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 100) % 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  // Agent-authored: formatTime helper for MM:SS.ms display used in HUD and screens.

  function drawBackground(state) {
    // Agent-authored: draws floor, walls, covers with shadows and highlights.

    // Floor
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Checkerboard floor pattern
    const tileSize = 32;
    ctx.fillStyle = COLORS.floorAlt;
    for (let x = 0; x < WORLD_W; x += tileSize * 2) {
      for (let y = 0; y < WORLD_H; y += tileSize * 2) {
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.fillRect(x + tileSize, y + tileSize, tileSize, tileSize);
      }
    }

    // Shadows under walls
    ctx.fillStyle = COLORS.shadow;
    for (const wall of state.level.walls) {
      ctx.fillRect(wall.x + 2, wall.y + 2, wall.w, wall.h);
    }

    // Walls
    for (const wall of state.level.walls) {
      const grad = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
      grad.addColorStop(0, COLORS.wallTop);
      grad.addColorStop(1, COLORS.wall);
      ctx.fillStyle = grad;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

      // Wall highlight
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(wall.x, wall.y, wall.w, 2);
      ctx.fillRect(wall.x, wall.y, 2, wall.h);
    }

    // Cover objects
    for (const cover of state.level.covers) {
      // Shadow
      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.ellipse(cover.x + 2, cover.y + 2, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cover base
      const grad = ctx.createRadialGradient(cover.x, cover.y, 0, cover.x, cover.y, 16);
      grad.addColorStop(0, COLORS.coverEdge);
      grad.addColorStop(1, COLORS.cover);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cover.x, cover.y, 14, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cover detail
      ctx.strokeStyle = COLORS.coverEdge;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cover.x, cover.y, 10, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawGuardVision(guard) {
    // Agent-authored: renders guard vision cone with alert-based intensity.

    const { x, y, angle, range, fov, alert } = guard.vision;
    if (alert <= 0) return;

    ctx.save();
    ctx.translate(x, y);

    // Vision cone
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
    gradient.addColorStop(0, `rgba(220,100,100,${0.15 * alert})`);
    gradient.addColorStop(1, `rgba(220,100,100,0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, angle - fov / 2, angle + fov / 2);
    ctx.closePath();
    ctx.fill();

    // Vision edge
    ctx.strokeStyle = `rgba(220,100,100,${0.4 * alert})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, angle - fov / 2, angle + fov / 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawGuard(guard) {
    // Agent-authored: draws guard body, facing direction, and alert indicator.

    const { x, y } = guard.pos;
    const alert = guard.alert;

    // Body
    const bodyGrad = ctx.createRadialGradient(x, y, 0, x, y, GUARD_RADIUS);
    if (alert > 0.5) {
      bodyGrad.addColorStop(0, COLORS.guardAlert);
      bodyGrad.addColorStop(1, COLORS.guard);
    } else {
      bodyGrad.addColorStop(0, COLORS.guard);
      bodyGrad.addColorStop(1, '#802020');
    }
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Facing direction indicator
    const vision = guard.vision;
    ctx.strokeStyle = alert > 0.5 ? '#ffaaaa' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(vision.angle) * (GUARD_RADIUS + 4), y + Math.sin(vision.angle) * (GUARD_RADIUS + 4));
    ctx.stroke();

    // Alert indicator
    if (alert > 0.3) {
      ctx.fillStyle = `rgba(255,100,100,${alert})`;
      ctx.beginPath();
      ctx.arc(x, y - GUARD_RADIUS - 8, 4 + alert * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(player) {
    // Agent-authored: draws player with shadow, body, sneaking/cover indicators.

    const { x, y, sneaking, inCover } = player;

    // Shadow
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 3, PLAYER_RADIUS * 0.8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyGrad = ctx.createRadialGradient(x, y, 0, x, y, PLAYER_RADIUS);
    if (sneaking) {
      bodyGrad.addColorStop(0, COLORS.playerSneak);
      bodyGrad.addColorStop(1, '#6080a0');
    } else {
      bodyGrad.addColorStop(0, COLORS.player);
      bodyGrad.addColorStop(1, '#a08020');
    }
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Sneaking indicator
    if (sneaking) {
      ctx.strokeStyle = 'rgba(168,200,232,0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Cover indicator
    if (inCover) {
      ctx.strokeStyle = COLORS.uiGood;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_RADIUS + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawArtifact(artifact) {
    // Agent-authored: draws artifact with pulse glow, diamond body, and sparkles.

    if (artifact.collected) return;
    const { x, y, pulse } = artifact;

    // Glow
    const glowSize = ARTIFACT_RADIUS + 8 + Math.sin(pulse * 2) * 4;
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    glowGrad.addColorStop(0, COLORS.artifactGlow);
    glowGrad.addColorStop(1, 'rgba(240,224,80,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Artifact body (diamond shape)
    ctx.fillStyle = COLORS.artifact;
    ctx.beginPath();
    ctx.moveTo(x, y - ARTIFACT_RADIUS);
    ctx.lineTo(x + ARTIFACT_RADIUS * 0.7, y);
    ctx.lineTo(x, y + ARTIFACT_RADIUS);
    ctx.lineTo(x - ARTIFACT_RADIUS * 0.7, y);
    ctx.closePath();
    ctx.fill();

    // Sparkle
    ctx.fillStyle = '#fff8c0';
    for (let i = 0; i < 4; i++) {
      const a = pulse * 3 + i * Math.PI / 2;
      const r = ARTIFACT_RADIUS * 0.5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawExit(exit) {
    // Agent-authored: draws exit arch, door, lock/unlock state, and label.

    const { x, y, unlocked, pulse } = exit;

    const color = unlocked ? COLORS.exit : COLORS.exitLocked;
    const glowColor = unlocked ? COLORS.exitGlow : 'rgba(85,85,112,0.3)';

    // Glow
    const glowSize = EXIT_RADIUS + 6 + Math.sin(pulse * 2) * 3;
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    glowGrad.addColorStop(0, glowColor);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Exit arch
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, EXIT_RADIUS, Math.PI, 0);
    ctx.moveTo(x - EXIT_RADIUS, y);
    ctx.lineTo(x - EXIT_RADIUS, y + 20);
    ctx.moveTo(x + EXIT_RADIUS, y);
    ctx.lineTo(x + EXIT_RADIUS, y + 20);
    ctx.stroke();

    // Door
    if (unlocked) {
      ctx.fillStyle = 'rgba(96,216,128,0.3)';
      ctx.fillRect(x - EXIT_RADIUS + 4, y, EXIT_RADIUS * 2 - 8, 20);
    } else {
      ctx.fillStyle = '#2a2a40';
      ctx.fillRect(x - EXIT_RADIUS + 4, y, EXIT_RADIUS * 2 - 8, 20);
      // Lock icon
      ctx.fillStyle = COLORS.exitLocked;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F512}', x, y + 10);
    }

    // EXIT text
    ctx.fillStyle = color;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(unlocked ? 'ESCAPE' : 'LOCKED', x, y - EXIT_RADIUS - 8);
  }

  function drawHUD(state) {
    // Agent-authored: draws alert bar, timer, best time, artifact/exit status, controls hint.

    resetTransform();

    // Alert bar at top center
    const barWidth = 300;
    const barHeight = 8;
    const barX = (canvas.width - barWidth) / 2;
    const barY = 16;

    // Background
    ctx.fillStyle = 'rgba(10,10,15,0.8)';
    ctx.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

    // Alert fill
    const alertRatio = state.alertLevel / 100;
    const fillWidth = barWidth * alertRatio;
    if (alertRatio > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
      if (alertRatio < 0.4) {
        grad.addColorStop(0, COLORS.uiGood);
        grad.addColorStop(1, COLORS.uiGood);
      } else if (alertRatio < 0.7) {
        grad.addColorStop(0, COLORS.uiWarn);
        grad.addColorStop(1, COLORS.uiWarn);
      } else {
        grad.addColorStop(0, COLORS.uiAlert);
        grad.addColorStop(1, COLORS.uiAlert);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, fillWidth, barHeight);
    }

    // Alert label
    ctx.fillStyle = COLORS.uiDim;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALERT LEVEL', canvas.width / 2, barY - 6);

    // Timer top right
    ctx.fillStyle = COLORS.uiText;
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(state.gameTime), canvas.width - 16, 36);

    // Best time
    if (state.bestTime > 0) {
      ctx.fillStyle = COLORS.uiDim;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`BEST ${formatTime(state.bestTime)}`, canvas.width - 16, 52);
    }

    // Artifact status bottom left
    ctx.fillStyle = state.artifact.collected ? COLORS.uiGood : COLORS.uiDim;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(state.artifact.collected ? 'ARTIFACT: SECURED' : 'ARTIFACT: FIND IT', 16, canvas.height - 40);

    // Exit status bottom right
    ctx.fillStyle = state.exit.unlocked ? COLORS.uiGood : COLORS.uiDim;
    ctx.textAlign = 'right';
    ctx.fillText(state.exit.unlocked ? 'EXIT: OPEN' : 'EXIT: LOCKED', canvas.width - 16, canvas.height - 40);

    // Controls hint
    ctx.fillStyle = 'rgba(136,138,160,0.5)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WASD/Arrows: Move  |  Shift: Sneak  |  Space: Interact  |  Esc: Pause', canvas.width / 2, canvas.height - 16);
  }

  function drawScreen(state) {
    // Agent-authored: draws title/paused/won/lost overlay screens with dynamic content.

    resetTransform();
    ctx.fillStyle = 'rgba(10,10,15,0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (state.screen === SCREEN_TITLE) {
      // Title screen
      ctx.fillStyle = COLORS.uiText;
      ctx.font = 'bold 48px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MIDNIGHT HEIST', centerX, centerY - 100);

      ctx.fillStyle = COLORS.uiDim;
      ctx.font = '18px "JetBrains Mono", monospace';
      ctx.fillText('Infiltrate. Evade. Escape.', centerX, centerY - 60);

      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText('Steal the artifact and escape unseen', centerX, centerY - 30);

      ctx.fillStyle = 'rgba(136,138,160,0.5)';
      ctx.font = '12px "JetBrains Mono", monospace';
      const controls = [
        'WASD / Arrow Keys  - Move',
        'Shift              - Sneak (silent, slow)',
        'Space / Enter      - Interact',
        'Esc                - Pause',
      ];
      controls.forEach((c, i) => ctx.fillText(c, centerX, centerY + 10 + i * 22));

      // Start prompt
      ctx.fillStyle = COLORS.uiText;
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText('Press SPACE or CLICK to begin', centerX, centerY + 130);

      if (state.bestTime > 0) {
        ctx.fillStyle = COLORS.uiDim;
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`Best time: ${formatTime(state.bestTime)}`, centerX, centerY + 170);
      }
    } else if (state.screen === SCREEN_PAUSED) {
      ctx.fillStyle = COLORS.uiText;
      ctx.font = 'bold 48px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', centerX, centerY - 40);

      ctx.fillStyle = COLORS.uiDim;
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(`Time: ${formatTime(state.gameTime)}`, centerX, centerY + 20);
      ctx.fillText('Press ESC to resume', centerX, centerY + 60);
    } else if (state.screen === SCREEN_WON) {
      ctx.fillStyle = COLORS.uiGood;
      ctx.font = 'bold 48px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HEIST COMPLETE', centerX, centerY - 80);

      ctx.fillStyle = COLORS.uiText;
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.fillText(`Time: ${formatTime(state.gameTime)}`, centerX, centerY - 20);

      if (state.gameTime < state.bestTime || state.bestTime === 0) {
        ctx.fillStyle = '#f0e050';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText('NEW BEST TIME!', centerX, centerY + 20);
      } else {
        ctx.fillStyle = COLORS.uiDim;
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText(`Best: ${formatTime(state.bestTime)}`, centerX, centerY + 20);
      }

      ctx.fillStyle = COLORS.uiDim;
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText('Press SPACE to play again', centerX, centerY + 80);
    } else if (state.screen === SCREEN_LOST) {
      ctx.fillStyle = COLORS.uiAlert;
      ctx.font = 'bold 48px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CAUGHT', centerX, centerY - 40);

      ctx.fillStyle = COLORS.uiDim;
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(`Survived: ${formatTime(state.gameTime)}`, centerX, centerY + 20);
      ctx.fillText('Press SPACE to try again', centerX, centerY + 60);
    }
  }

  function draw(state) {
    // Agent-authored: main render pipeline - clear, world, visions, guards, artifact, exit, player, HUD, screens.

    // Clear
    resetTransform();
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Game world
    setTransform();
    drawBackground(state);

    // Guard visions (behind guards)
    for (const guard of state.guards) {
      drawGuardVision(guard);
    }

    // Guards
    for (const guard of state.guards) {
      drawGuard(guard);
    }

    // Artifact
    drawArtifact(state.artifact);

    // Exit
    drawExit(state.exit);

    // Player (on top)
    drawPlayer(state.player);

    // HUD
    drawHUD(state);

    // Screen overlay
    if (state.screen !== SCREEN_PLAY) {
      drawScreen(state);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}