import { DAYS_PER_SEASON, WOLF_RISK_CHANCE, WOLF_RISK_CHANCE_WINTER } from './gameState.js';

export const SEASONS = ['Primavera', 'Verão', 'Outono', 'Inverno'];

const GROWTH_MULTIPLIER = { Primavera: 1.1, Verão: 1.0, Outono: 0.85, Inverno: 0.4 };

const SEASON_SKY = {
  Primavera: { top: 0x2f8fe8, bottom: 0xbfeaff, grass: 0x5cb03e },
  Verão: { top: 0x1f7fe0, bottom: 0xa9e2ff, grass: 0x5cb03e },
  Outono: { top: 0x4a7fb0, bottom: 0xd8c496, grass: 0xb08a3a },
  Inverno: { top: 0x7d94ad, bottom: 0xe8eef2, grass: 0xd8e2e6 }
};

// Determina a estação a partir do total de dias completos de jogo (não do
// worldTime do dia atual), avançando um índice fixo de estações a cada
// DAYS_PER_SEASON dias — ciclo simples e previsível para o jogador planejar.
export function seasonForDay(totalDays) {
  const index = Math.floor(totalDays / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[index];
}

export function dayOfSeasonFor(totalDays) {
  return totalDays % DAYS_PER_SEASON;
}

export function growthMultiplierForSeason(season) {
  return GROWTH_MULTIPLIER[season] ?? 1.0;
}

export function skyPaletteForSeason(season) {
  return SEASON_SKY[season] || SEASON_SKY.Verão;
}

export function wolfRiskChanceForSeason(season) {
  return season === 'Inverno' ? WOLF_RISK_CHANCE_WINTER : WOLF_RISK_CHANCE;
}

export function isPlantableInSeason(seedConfig, season) {
  return !seedConfig.seasons || seedConfig.seasons.includes(season);
}
