// Carrega o mapa data-driven (JSON + TXT da caverna). Fonte da verdade:
// src/maps/world.json. O overworld.txt é só visual para edição humana.

let worldMap = null;
let caveTxt = null;

const DEFAULT_BOUNDS = { minX: -28, maxX: 28, minZ: -24, maxZ: 52 };

export async function loadWorldMap() {
  if (worldMap) return worldMap;

  const worldUrl = new URL('../maps/world.json', import.meta.url);
  const caveUrl = new URL('../maps/cave.txt', import.meta.url);

  try {
    const worldRes = await fetch(worldUrl);
    if (!worldRes.ok) throw new Error(`world.json HTTP ${worldRes.status}`);
    worldMap = await worldRes.json();
  } catch (err) {
    console.warn('[mapLoader] fetch world.json falhou, tentando import JSON:', err);
    const mod = await import('../maps/world.json', { with: { type: 'json' } });
    worldMap = mod.default;
  }

  try {
    const caveRes = await fetch(caveUrl);
    if (caveRes.ok) caveTxt = await caveRes.text();
  } catch (err) {
    console.warn('[mapLoader] falha ao carregar cave.txt, minigame usa RNG:', err);
    caveTxt = null;
  }

  return worldMap;
}

export function getMap() {
  return worldMap;
}

export function getLandmark(name) {
  return worldMap?.landmarks?.[name] || null;
}

export function getBounds(areaId = 'farm') {
  if (!worldMap?.bounds) return { ...DEFAULT_BOUNDS };
  if (areaId === 'farm' || areaId === 'village') {
    return worldMap.bounds.overworld || DEFAULT_BOUNDS;
  }
  return worldMap.bounds[areaId] || worldMap.bounds.overworld || DEFAULT_BOUNDS;
}

export function getPlayerSpawn() {
  return worldMap?.playerSpawn || { x: 0, z: -6 };
}

export function getCaveTxt() {
  return caveTxt;
}

export function pointInBounds(x, z, bounds) {
  if (!bounds) return true;
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

export function clampToBounds(x, z, bounds) {
  if (!bounds) return { x, z };
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, z))
  };
}

export function parseColor(value, fallback = 0xcccccc) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const hex = value.trim().replace(/^#/, '');
    const n = parseInt(hex, 16);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
