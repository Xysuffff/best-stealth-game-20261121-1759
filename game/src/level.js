// Level design: walls, cover objects, guard patrol paths, artifact and exit positions.
// All deterministic from the seed.
// Agent-authored: original museum layout designed for this competition.

import { TILE, GRID_W, GRID_H, WORLD_W, WORLD_H } from './config.js';

export const TILE_TYPE = {
  FLOOR: 0,
  WALL: 1,
  COVER: 2,
};

export function createLevel(random) {
  // Agent-authored: creates museum layout with walls, covers, guard patrols, artifact, exit.

  const grid = new Array(GRID_W * GRID_H).fill(TILE_TYPE.FLOOR);
  const covers = [];
  const walls = [];

  // Helper to set tile
  const set = (x, y, type) => { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) grid[y * GRID_W + x] = type; };
  const get = (x, y) => (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) ? grid[y * GRID_W + x] : TILE_TYPE.WALL;

  // Outer walls
  for (let x = 0; x < GRID_W; x++) { set(x, 0, TILE_TYPE.WALL); set(x, GRID_H - 1, TILE_TYPE.WALL); }
  for (let y = 0; y < GRID_H; y++) { set(0, y, TILE_TYPE.WALL); set(GRID_W - 1, y, TILE_TYPE.WALL); }

  // Internal walls - museum layout
  // Main hall columns
  for (let y = 3; y < GRID_H - 3; y += 4) {
    set(8, y, TILE_TYPE.WALL);
    set(23, y, TILE_TYPE.WALL);
  }
  // Gallery walls
  for (let x = 12; x < 20; x++) { set(x, 5, TILE_TYPE.WALL); set(x, 14, TILE_TYPE.WALL); }
  set(12, 6, TILE_TYPE.WALL); set(12, 7, TILE_TYPE.WALL); set(12, 8, TILE_TYPE.WALL);
  set(19, 6, TILE_TYPE.WALL); set(19, 7, TILE_TYPE.WALL); set(19, 8, TILE_TYPE.WALL);
  set(12, 11, TILE_TYPE.WALL); set(12, 12, TILE_TYPE.WALL); set(12, 13, TILE_TYPE.WALL);
  set(19, 11, TILE_TYPE.WALL); set(19, 12, TILE_TYPE.WALL); set(19, 13, TILE_TYPE.WALL);

  // Side corridors
  for (let y = 2; y < 6; y++) { set(4, y, TILE_TYPE.WALL); set(27, y, TILE_TYPE.WALL); }
  for (let y = 14; y < 18; y++) { set(4, y, TILE_TYPE.WALL); set(27, y, TILE_TYPE.WALL); }

  // Cover objects (statues, display cases, pillars)
  const coverPositions = [
    // Main hall covers
    { x: 6, y: 4 }, { x: 6, y: 8 }, { x: 6, y: 12 }, { x: 6, y: 16 },
    { x: 25, y: 4 }, { x: 25, y: 8 }, { x: 25, y: 12 }, { x: 25, y: 16 },
    // Gallery covers
    { x: 14, y: 7 }, { x: 17, y: 7 }, { x: 14, y: 12 }, { x: 17, y: 12 },
    // Side corridor covers
    { x: 3, y: 3 }, { x: 3, y: 16 }, { x: 28, y: 3 }, { x: 28, y: 16 },
    // Central area
    { x: 15, y: 10 }, { x: 16, y: 10 },
  ];

  for (const pos of coverPositions) {
    if (get(pos.x, pos.y) === TILE_TYPE.FLOOR) {
      set(pos.x, pos.y, TILE_TYPE.COVER);
      covers.push({ x: pos.x * TILE + TILE / 2, y: pos.y * TILE + TILE / 2 });
    }
  }

  // Collect wall positions for rendering
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (get(x, y) === TILE_TYPE.WALL) {
        walls.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE });
      }
    }
  }

  // Merge adjacent walls for cleaner rendering
  const mergedWalls = mergeWalls(walls);

  // Guard patrol paths (waypoints in world coordinates)
  const patrolPaths = [
    // Guard 1: Main hall left patrol
    [{ x: 5 * TILE + TILE/2, y: 3 * TILE + TILE/2 }, { x: 5 * TILE + TILE/2, y: 16 * TILE + TILE/2 }],
    // Guard 2: Main hall right patrol
    [{ x: 26 * TILE + TILE/2, y: 16 * TILE + TILE/2 }, { x: 26 * TILE + TILE/2, y: 3 * TILE + TILE/2 }],
    // Guard 3: Gallery patrol
    [{ x: 13 * TILE + TILE/2, y: 6 * TILE + TILE/2 }, { x: 18 * TILE + TILE/2, y: 6 * TILE + TILE/2 },
     { x: 18 * TILE + TILE/2, y: 13 * TILE + TILE/2 }, { x: 13 * TILE + TILE/2, y: 13 * TILE + TILE/2 }],
    // Guard 4: Side corridor patrol
    [{ x: 3 * TILE + TILE/2, y: 3 * TILE + TILE/2 }, { x: 3 * TILE + TILE/2, y: 16 * TILE + TILE/2 }],
    // Guard 5: Side corridor patrol (right)
    [{ x: 28 * TILE + TILE/2, y: 16 * TILE + TILE/2 }, { x: 28 * TILE + TILE/2, y: 3 * TILE + TILE/2 }],
  ];

  // Artifact position (center of gallery)
  const artifact = { x: 16 * TILE + TILE/2, y: 10 * TILE + TILE/2 };

  // Exit position (bottom center - main entrance)
  const exit = { x: 16 * TILE + TILE/2, y: (GRID_H - 1) * TILE + TILE/2 };

  // Player start position (top center - roof entrance)
  const playerStart = { x: 16 * TILE + TILE/2, y: 1 * TILE + TILE/2 };

  // Check line of sight between two points (grid-based)
  // Agent-authored: Bresenham line algorithm for wall-blocking LOS checks.

  function hasLineOfSight(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;
    while (true) {
      const gx = Math.floor(x / TILE);
      const gy = Math.floor(y / TILE);
      if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
        if (get(gx, gy) === TILE_TYPE.WALL) return false;
      }
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return true;
  }

  // Check if point is in cover
  // Agent-authored: checks if world position overlaps a cover tile.

  function isInCover(x, y) {
    const gx = Math.floor(x / TILE);
    const gy = Math.floor(y / TILE);
    return get(gx, gy) === TILE_TYPE.COVER;
  }

  // Check if point is in shadow (behind cover from guard's perspective)
  // Agent-authored: geometric shadow test using cross/dot products for cover occlusion.

  function isInShadow(px, py, gx, gy) {
    // Check if any cover blocks line of sight
    for (const cover of covers) {
      // Simple check: if cover is between player and guard
      const dx1 = cover.x - gx;
      const dy1 = cover.y - gy;
      const dx2 = px - gx;
      const dy2 = py - gy;
      const cross = dx1 * dy2 - dy1 * dx2;
      const dot = dx1 * dx2 + dy1 * dy2;
      const coverDistSq = dx1 * dx1 + dy1 * dy1;
      const playerDistSq = dx2 * dx2 + dy2 * dy2;
      if (coverDistSq < playerDistSq && Math.abs(cross) < 400 && dot > 0) {
        return true;
      }
    }
    return false;
  }

  return {
    grid,
    walls: mergedWalls,
    covers,
    patrolPaths,
    artifact,
    exit,
    playerStart,
    hasLineOfSight,
    isInCover,
    isInShadow,
    getTile: get,
  };
}

function mergeWalls(walls) {
  // Agent-authored: merges adjacent wall segments for efficient rendering.

  // Simple horizontal merging for top-down rendering
  const byRow = new Map();
  for (const w of walls) {
    const row = w.y;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ x: w.x, w: w.w });
  }
  const merged = [];
  for (const [row, segments] of byRow) {
    segments.sort((a, b) => a.x - b.x);
    let cur = segments[0];
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].x === cur.x + cur.w) {
        cur.w += segments[i].w;
      } else {
        merged.push({ x: cur.x, y: row, w: cur.w, h: TILE });
        cur = segments[i];
      }
    }
    merged.push({ x: cur.x, y: row, w: cur.w, h: TILE });
  }
  // Also merge vertical walls
  const byCol = new Map();
  for (const w of walls) {
    const col = w.x;
    if (!byCol.has(col)) byCol.set(col, []);
    byCol.get(col).push({ y: w.y, h: w.h });
  }
  for (const [col, segments] of byCol) {
    segments.sort((a, b) => a.y - b.y);
    let cur = segments[0];
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].y === cur.y + cur.h) {
        cur.h += segments[i].h;
      } else {
        merged.push({ x: col, y: cur.y, w: TILE, h: cur.h });
        cur = segments[i];
      }
    }
    merged.push({ x: col, y: cur.y, w: TILE, h: cur.h });
  }
  return merged;
}