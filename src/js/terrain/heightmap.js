// Geração determinística de altura por coluna (x,z) -> altura em blocos.
// Sem Math.random(): tudo derivado de uma seed numérica, para permitir
// salvar/restaurar o mesmo terreno a partir de um único número.

export const FARM_BASE_HEIGHT = 4;
export const VILLAGE_BASE_HEIGHT = 4;

// Baseado nos bounds passados para createFences(farmRoot, [-14, 16], [-13, 10], ...)
// em main.js, com folga extra em Z: o grid de canteiros (rebuildFarmPlots,
// crops.js) no nível máximo de expansão (farmLevel 3: 6x7, spacing 2.3) chega
// a z≈11.45 no canto mais distante — ligeiramente além da linha da cerca
// (maxZ=10). A folga de +2 em Z garante que TODA a área de plantio, em
// qualquer farmLevel, fique estritamente plana (garantia dura do plano).
// X NÃO é expandido além de maxX=16: LAKE_POSITION.x=18 precisa continuar
// fora do plot para que a depressão de água seja gerada corretamente.
export const FARM_PLOT_BOUNDS = { minX: -16, maxX: 16, minZ: -20, maxZ: 14 };
const FARM_PLOT_MARGIN = 2.5; // zona de transição suave logo fora da cerca

export function setFarmPlotBounds(bounds) {
  if (!bounds) return;
  if (bounds.minX != null) FARM_PLOT_BOUNDS.minX = bounds.minX;
  if (bounds.maxX != null) FARM_PLOT_BOUNDS.maxX = bounds.maxX;
  if (bounds.minZ != null) FARM_PLOT_BOUNDS.minZ = bounds.minZ;
  if (bounds.maxZ != null) FARM_PLOT_BOUNDS.maxZ = bounds.maxZ;
}

export const LAKE_WATER_RADIUS = 5.5;
export const LAKE_BEACH_RADIUS = 7.5;
export const LAKE_DEPTH = 3;

function heightNoise(x, z, seed) {
  const p1 = seed * 0.017;
  const p2 = seed * 0.031 + 1.7;
  return Math.sin(x * 0.12 + p1) * Math.cos(z * 0.11 + p2) * 1.6
       + Math.sin(x * 0.05 - z * 0.04 + p1 * 0.5) * 0.8;
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function smoothstep(t) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function insideFarmPlot(x, z) {
  return x >= FARM_PLOT_BOUNDS.minX && x <= FARM_PLOT_BOUNDS.maxX
      && z >= FARM_PLOT_BOUNDS.minZ && z <= FARM_PLOT_BOUNDS.maxZ;
}

/** 0 dentro do plot, sobe suavemente até 1 a FARM_PLOT_MARGIN unidades fora da cerca. */
function smoothDistanceToFarmPlot(x, z) {
  const dx = Math.max(FARM_PLOT_BOUNDS.minX - x, 0, x - FARM_PLOT_BOUNDS.maxX);
  const dz = Math.max(FARM_PLOT_BOUNDS.minZ - z, 0, z - FARM_PLOT_BOUNDS.maxZ);
  const dist = Math.hypot(dx, dz);
  return smoothstep(dist / FARM_PLOT_MARGIN);
}

function dist2D(x, z, pos) {
  return Math.hypot(x - pos.x, z - pos.z);
}

/**
 * Perfil de altura de uma coluna (x,z) dentro de uma área.
 * Retorna { height, biome, water }.
 */
export function getColumnProfile(x, z, seed, areaId, lakePosition) {
  if (areaId === 'farm') {
    if (insideFarmPlot(x, z)) {
      return { height: FARM_BASE_HEIGHT, biome: 'farm', water: false };
    }

    if (lakePosition) {
      const dLake = dist2D(x, z, lakePosition);
      if (dLake < LAKE_WATER_RADIUS) {
        return { height: FARM_BASE_HEIGHT - LAKE_DEPTH, biome: 'lakeBed', water: true };
      }
      if (dLake < LAKE_BEACH_RADIUS) {
        return { height: FARM_BASE_HEIGHT, biome: 'beach', water: false };
      }
    }

    const t = smoothDistanceToFarmPlot(x, z);
    const height = FARM_BASE_HEIGHT + Math.round(heightNoise(x, z, seed) * t);
    return { height, biome: 'farmOutskirts', water: false };
  }

  if (areaId === 'lake') {
    if (lakePosition) {
      const dLake = dist2D(x, z, lakePosition);
      if (dLake < LAKE_WATER_RADIUS) {
        return { height: FARM_BASE_HEIGHT - LAKE_DEPTH, biome: 'lakeBed', water: true };
      }
      if (dLake < LAKE_BEACH_RADIUS) {
        return { height: FARM_BASE_HEIGHT, biome: 'beach', water: false };
      }
    }
    const height = FARM_BASE_HEIGHT + Math.round(heightNoise(x, z, seed + 250) * 0.6);
    return { height, biome: 'lakeShore', water: false };
  }

  if (areaId === 'village') {
    const height = VILLAGE_BASE_HEIGHT + Math.round(heightNoise(x, z, seed + 500));
    return { height, biome: 'village', water: false };
  }

  return { height: FARM_BASE_HEIGHT, biome: 'flat', water: false };
}

/**
 * Constrói um heightmap 2D cacheado (Float32Array-like via Map) para uma
 * área inteira, dado seus bounds inteiros. Usado para lookup O(1) em
 * getGroundHeightAt sem percorrer o chunkGrid a cada chamada.
 */
const HEIGHT_CACHE_KEY_OFFSET = 100000;

function heightCacheKey(x, z) {
  return (x + HEIGHT_CACHE_KEY_OFFSET) * 1000000 + (z + HEIGHT_CACHE_KEY_OFFSET);
}

export function buildHeightCache(bounds, seed, areaId, lakePosition) {
  const cache = new Map();
  const minX = Math.floor(bounds.minX);
  const maxX = Math.ceil(bounds.maxX);
  const minZ = Math.floor(bounds.minZ);
  const maxZ = Math.ceil(bounds.maxZ);
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const { height, water } = getColumnProfile(x, z, seed, areaId, lakePosition);
      cache.set(heightCacheKey(x, z), { height, water });
    }
  }
  return cache;
}

const heightCacheByArea = new Map();

export function registerHeightCache(areaId, cache) {
  heightCacheByArea.set(areaId, cache);
}

/**
 * Altura andável (topo do bloco + 1) em qualquer ponto do mundo, arredondado
 * para a coluna inteira mais próxima. Fallback = FARM_BASE_HEIGHT se a área
 * não tiver cache registrado (ex.: caverna, que fica fora do motor voxel).
 */
export function getGroundHeightAt(x, z, areaId = 'farm') {
  const cache = heightCacheByArea.get(areaId);
  if (!cache) return FARM_BASE_HEIGHT + 1;
  const key = heightCacheKey(Math.round(x), Math.round(z));
  const entry = cache.get(key);
  if (!entry) return FARM_BASE_HEIGHT + 1;
  return entry.height + 1;
}
