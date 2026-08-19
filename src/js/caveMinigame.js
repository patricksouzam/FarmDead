// Mini-game 2D top-down da caverna: Canvas 2D dedicado, totalmente
// independente do mundo 3D (Three.js). Layout gerado deterministicamente por
// dia (seed = state.totalDays) — sem persistir mapa/HP/posição no save,
// só o resultado final (materiais) creditado em state.materials ao sair.

import { getCaveTxt } from './mapLoader.js';

const GRID_W = 16;
const GRID_H = 12;
const CELL = 40; // px por célula (grid 16x12 -> 640x480, tela única sem scroll)

const CELL_TYPE = {
  FLOOR: 'floor',
  WALL: 'wall',
  ORE: 'ore',
  STONE: 'stone',
  COAL: 'coal',
  EXIT: 'exit'
};

const RESOURCE_TO_MATERIAL = { [CELL_TYPE.ORE]: 'Minerio', [CELL_TYPE.STONE]: 'Pedra', [CELL_TYPE.COAL]: 'Carvao' };
const CELL_COLOR = {
  [CELL_TYPE.FLOOR]: '#2a241c',
  [CELL_TYPE.WALL]: '#4a4540',
  [CELL_TYPE.ORE]: '#b87333',
  [CELL_TYPE.STONE]: '#8a8a8a',
  [CELL_TYPE.COAL]: '#2a2a2a',
  [CELL_TYPE.EXIT]: '#f4c04a'
};

const PLAYER_SPEED_PX = 130; // px/s
const PLAYER_RADIUS = 12;
const ENEMY_RADIUS = 12;
const ENEMY_SPEED_PX = 70;
const ENEMY_AGGRO_CELLS = 4;
const PLAYER_MAX_HP = 4;
const PLAYER_IFRAME_MS = 800;
const ACTION_RANGE_PX = CELL * 0.9;
const MINE_HITS_TO_BREAK = { [CELL_TYPE.WALL]: 1, [CELL_TYPE.ORE]: 2, [CELL_TYPE.STONE]: 2, [CELL_TYPE.COAL]: 2 };
const ENEMY_HP = 3;

let active = false;
let canvasEl = null;
let onExitCallback = null;
let abortCtrl = null;

let grid = [];
let hitProgress = new Map(); // "x,y" -> hits already landed
let player = null;
let enemies = [];
let sessionMaterials = { Pedra: 0, Minerio: 0, Carvao: 0 };
let fadeAlpha = 0;
let fadeDirection = 0; // 1 = fading to black (entering/exiting), -1 = fading in
let exitRequested = false;
let exitDone = false;
const input = { up: false, down: false, left: false, right: false, action: false };
let actionHeld = false;

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedForDay(totalDays) {
  return (0x9E3779B9 ^ Math.imul(totalDays + 1, 2654435761)) | 0;
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

function isWalkable(x, y) {
  if (!inBounds(x, y)) return false;
  const cell = grid[y][x];
  return cell === CELL_TYPE.FLOOR || cell === CELL_TYPE.EXIT;
}

function parseCaveTxt(text) {
  if (!text) return null;
  const rows = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^[#.EOSCMX]{16}$/.test(line));
  if (rows.length < GRID_H) return null;

  const g = [];
  const enemyList = [];
  let spawnCell = { x: 1, y: 1 };
  let exitCell = { x: GRID_W - 2, y: GRID_H - 2 };

  for (let y = 0; y < GRID_H; y++) {
    const line = rows[y].padEnd(GRID_W, '#').slice(0, GRID_W);
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      const ch = line[x];
      if (ch === 'E') {
        row.push(CELL_TYPE.FLOOR);
        spawnCell = { x, y };
      } else if (ch === 'X') {
        row.push(CELL_TYPE.EXIT);
        exitCell = { x, y };
      } else if (ch === 'O') {
        row.push(CELL_TYPE.ORE);
      } else if (ch === 'S') {
        row.push(CELL_TYPE.STONE);
      } else if (ch === 'C') {
        row.push(CELL_TYPE.COAL);
      } else if (ch === 'M') {
        row.push(CELL_TYPE.FLOOR);
        enemyList.push({
          x: x * CELL + CELL / 2,
          y: y * CELL + CELL / 2,
          homeX: x * CELL + CELL / 2,
          homeY: y * CELL + CELL / 2,
          hp: ENEMY_HP,
          alive: true,
          lastHitTime: 0
        });
      } else if (ch === '#') {
        row.push(CELL_TYPE.WALL);
      } else {
        row.push(CELL_TYPE.FLOOR);
      }
    }
    g.push(row);
  }

  return { grid: g, enemies: enemyList, exitCell, spawnCell };
}

function generateLayout(totalDays) {
  const fromFile = parseCaveTxt(getCaveTxt());
  if (fromFile) return fromFile;
  const rng = mulberry32(seedForDay(totalDays));
  const g = [];
  for (let y = 0; y < GRID_H; y++) {
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      const isBorder = x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
      row.push(isBorder ? CELL_TYPE.WALL : CELL_TYPE.FLOOR);
    }
    g.push(row);
  }

  // Paredes internas quebráveis (nunca bloqueiam permanentemente — só o
  // perímetro externo é indestrutível, garantindo que tudo é alcançável).
  const innerWallCount = 16 + Math.floor(rng() * 6);
  for (let i = 0; i < innerWallCount; i++) {
    const x = 1 + Math.floor(rng() * (GRID_W - 2));
    const y = 1 + Math.floor(rng() * (GRID_H - 2));
    if (x <= 2 && y <= 2) continue; // não bloqueia perto do spawn
    g[y][x] = CELL_TYPE.WALL;
  }

  function placeResource(type, count) {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 200) {
      attempts++;
      const x = 1 + Math.floor(rng() * (GRID_W - 2));
      const y = 1 + Math.floor(rng() * (GRID_H - 2));
      if (g[y][x] !== CELL_TYPE.FLOOR) continue;
      if (x <= 2 && y <= 2) continue;
      g[y][x] = type;
      placed++;
    }
  }
  placeResource(CELL_TYPE.STONE, 5);
  placeResource(CELL_TYPE.ORE, 3);
  placeResource(CELL_TYPE.COAL, 2);

  // Saída no canto oposto ao spawn (canto inferior direito).
  const exitX = GRID_W - 2;
  const exitY = GRID_H - 2;
  g[exitY][exitX] = CELL_TYPE.EXIT;

  const enemyList = [];
  const enemyCount = 2 + Math.floor(rng() * 3);
  let enemyPlaced = 0;
  let enemyAttempts = 0;
  while (enemyPlaced < enemyCount && enemyAttempts < 200) {
    enemyAttempts++;
    const x = 1 + Math.floor(rng() * (GRID_W - 2));
    const y = 1 + Math.floor(rng() * (GRID_H - 2));
    if (g[y][x] !== CELL_TYPE.FLOOR) continue;
    if (Math.hypot(x - 1, y - 1) < 4) continue; // longe do spawn
    enemyList.push({
      x: x * CELL + CELL / 2,
      y: y * CELL + CELL / 2,
      homeX: x * CELL + CELL / 2,
      homeY: y * CELL + CELL / 2,
      hp: ENEMY_HP,
      alive: true,
      lastHitTime: 0
    });
    enemyPlaced++;
  }

  return { grid: g, enemies: enemyList, exitCell: { x: exitX, y: exitY } };
}

function bindMinigameInput() {
  abortCtrl = new AbortController();
  const { signal } = abortCtrl;

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      requestExit();
      return;
    }
    if (k === 'w' || k === 'arrowup') input.up = true;
    if (k === 's' || k === 'arrowdown') input.down = true;
    if (k === 'a' || k === 'arrowleft') input.left = true;
    if (k === 'd' || k === 'arrowright') input.right = true;
    if (k === ' ' || k === 'e') { input.action = true; e.preventDefault(); }
  };
  const onKeyUp = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') input.up = false;
    if (k === 's' || k === 'arrowdown') input.down = false;
    if (k === 'a' || k === 'arrowleft') input.left = false;
    if (k === 'd' || k === 'arrowright') input.right = false;
    if (k === ' ' || k === 'e') input.action = false;
  };

  window.addEventListener('keydown', onKeyDown, { signal, capture: true });
  window.addEventListener('keyup', onKeyUp, { signal, capture: true });
}

function unbindMinigameInput() {
  abortCtrl?.abort();
  abortCtrl = null;
}

export function isCaveMinigameActive() {
  return active;
}

export function initCaveMinigame(canvas, state, onExit) {
  canvasEl = canvas;
  onExitCallback = onExit;

  const layout = generateLayout(state.totalDays || 0);
  grid = layout.grid;
  enemies = layout.enemies;
  hitProgress = new Map();
  sessionMaterials = { Pedra: 0, Minerio: 0, Carvao: 0 };
  exitRequested = false;
  exitDone = false;
  fadeAlpha = 1;
  fadeDirection = -1;

  const spawn = layout.spawnCell || { x: 1, y: 1 };
  player = {
    x: spawn.x * CELL + CELL / 2,
    y: spawn.y * CELL + CELL / 2,
    hp: PLAYER_MAX_HP,
    lastHitTime: 0,
    facing: { x: 0, y: 1 }
  };

  input.up = input.down = input.left = input.right = input.action = false;
  actionHeld = false;

  bindMinigameInput();
  active = true;
}

function tryMineOrAttack(now) {
  const targetX = player.x + player.facing.x * CELL * 0.7;
  const targetY = player.y + player.facing.y * CELL * 0.7;

  // Ataque em inimigo próximo primeiro.
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist <= ACTION_RANGE_PX) {
      enemy.hp -= 1;
      if (enemy.hp <= 0) enemy.alive = false;
      return;
    }
  }

  // Senão, minera bloco adjacente na direção que o jogador está olhando.
  const gx = Math.floor(targetX / CELL);
  const gy = Math.floor(targetY / CELL);
  if (!inBounds(gx, gy)) return;
  const cellType = grid[gy][gx];
  if (cellType === CELL_TYPE.FLOOR || cellType === CELL_TYPE.EXIT) return;

  const key = cellKey(gx, gy);
  const hitsNeeded = MINE_HITS_TO_BREAK[cellType] ?? 1;
  const hitsSoFar = (hitProgress.get(key) || 0) + 1;
  if (hitsSoFar >= hitsNeeded) {
    hitProgress.delete(key);
    const material = RESOURCE_TO_MATERIAL[cellType];
    if (material) sessionMaterials[material]++;
    grid[gy][gx] = CELL_TYPE.FLOOR;
  } else {
    hitProgress.set(key, hitsSoFar);
  }
}

function moveWithCollision(entity, dx, dy, radius) {
  const nextX = entity.x + dx;
  const nextY = entity.y + dy;

  const canMoveX = !collidesAt(nextX, entity.y, radius);
  const canMoveY = !collidesAt(entity.x, nextY, radius);
  if (canMoveX) entity.x = nextX;
  if (canMoveY) entity.y = nextY;
}

function collidesAt(px, py, radius) {
  const corners = [
    [px - radius, py - radius], [px + radius, py - radius],
    [px - radius, py + radius], [px + radius, py + radius]
  ];
  for (const [cx, cy] of corners) {
    const gx = Math.floor(cx / CELL);
    const gy = Math.floor(cy / CELL);
    if (!isWalkable(gx, gy)) return true;
  }
  return false;
}

export function requestExit() {
  if (exitRequested) return;
  exitRequested = true;
  fadeDirection = 1;
}

function finishExit() {
  unbindMinigameInput();
  active = false;
  const summary = { ...sessionMaterials };
  if (onExitCallback) onExitCallback(summary);
}

export function updateCaveMinigame(delta) {
  if (!active) return;

  // Fade em progresso — trava input durante a transição.
  if (fadeDirection !== 0) {
    fadeAlpha += fadeDirection * delta * 3;
    if (fadeDirection === 1 && fadeAlpha >= 1) {
      fadeAlpha = 1;
      if (!exitDone) {
        exitDone = true;
        finishExit();
      }
      return;
    }
    if (fadeDirection === -1 && fadeAlpha <= 0) {
      fadeAlpha = 0;
      fadeDirection = 0;
    }
    if (fadeDirection === 1) return; // não simula gameplay durante fade-out
  }

  const now = Date.now();

  let dx = 0, dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    player.facing = { x: dx, y: dy };
    moveWithCollision(player, dx * PLAYER_SPEED_PX * delta, dy * PLAYER_SPEED_PX * delta, PLAYER_RADIUS);
  }

  if (input.action && !actionHeld) {
    actionHeld = true;
    tryMineOrAttack(now);
  } else if (!input.action) {
    actionHeld = false;
  }

  // IA de inimigos: perseguição direta simples, sem pathfinding.
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const dEx = player.x - enemy.x;
    const dEy = player.y - enemy.y;
    const dist = Math.hypot(dEx, dEy);
    if (dist < ENEMY_AGGRO_CELLS * CELL && dist > 0.1) {
      const ex = dEx / dist;
      const ey = dEy / dist;
      moveWithCollision(enemy, ex * ENEMY_SPEED_PX * delta, ey * ENEMY_SPEED_PX * delta, ENEMY_RADIUS);
    }

    // Dano por contato, com i-frames.
    const touchDist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (touchDist < PLAYER_RADIUS + ENEMY_RADIUS && now - player.lastHitTime > PLAYER_IFRAME_MS) {
      player.lastHitTime = now;
      player.hp -= 1;
      if (player.hp <= 0) {
        // Nocauteado: perde metade dos materiais ainda não creditados.
        Object.keys(sessionMaterials).forEach(type => {
          sessionMaterials[type] = Math.floor(sessionMaterials[type] / 2);
        });
        requestExit();
      }
    }
  });

  // Saída ao pisar na célula de saída.
  const gx = Math.floor(player.x / CELL);
  const gy = Math.floor(player.y / CELL);
  if (inBounds(gx, gy) && grid[gy][gx] === CELL_TYPE.EXIT && !exitRequested) {
    requestExit();
  }
}

export function renderCaveMinigame(ctx, canvasWidth, canvasHeight) {
  if (!active) return;

  ctx.fillStyle = '#0c0a10';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const offsetX = (canvasWidth - GRID_W * CELL) / 2;
  const offsetY = (canvasHeight - GRID_H * CELL) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      ctx.fillStyle = CELL_COLOR[grid[y][x]];
      ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
    }
  }

  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    ctx.fillStyle = '#c9403a';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });

  const flashing = Date.now() - player.lastHitTime < PLAYER_IFRAME_MS && Math.floor(Date.now() / 100) % 2 === 0;
  ctx.fillStyle = flashing ? '#ffffff' : '#3d4a5c';
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // HUD simples: corações de HP + materiais coletados na sessão.
  ctx.fillStyle = '#f4e4c8';
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'top';
  let hearts = '';
  for (let i = 0; i < PLAYER_MAX_HP; i++) hearts += i < player.hp ? '♥ ' : '♡ ';
  ctx.fillText(hearts, 16, 16);
  ctx.fillText(
    `Pedra: ${sessionMaterials.Pedra}  Minério: ${sessionMaterials.Minerio}  Carvão: ${sessionMaterials.Carvao}`,
    16, 40
  );
  ctx.fillText('WASD/setas mover · E/Espaço minerar/atacar · ESC sair', 16, canvasHeight - 28);

  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
}
