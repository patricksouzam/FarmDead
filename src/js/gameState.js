export function createGameState() {
  return {
    money: 3000000,
    water: 100,
    maxWater: 100,
    farmLevel: 1,
    houseLevel: 1,
    hasCar: false,
    hasWell: false,
    hasArtesianWell: false,
    govAuthorization: false,
    fertilizer: 0,
    seeds: { Cenoura: 5, Milho: 3, Abóbora: 2, Trigo: 0, Beterraba: 0 },
    harvested: { Cenoura: 0, Milho: 0, Abóbora: 0, Trigo: 0, Beterraba: 0 },
    activeSeedType: 'Cenoura',
    seedConfigs: {
      Cenoura: { cost: 10, sell: 25, growthTime: 11000, seasons: ['Primavera', 'Verão', 'Outono', 'Inverno'] },
      Milho: { cost: 20, sell: 50, growthTime: 20000, seasons: ['Primavera', 'Verão'] },
      Abóbora: { cost: 35, sell: 90, growthTime: 32000, seasons: ['Outono'] },
      Trigo: { cost: 8, sell: 18, growthTime: 8000, seasons: ['Primavera', 'Verão', 'Outono'] },
      Beterraba: { cost: 50, sell: 130, growthTime: 40000, seasons: ['Outono', 'Inverno'] }
    },

    animals: [],
    maxAnimals: 4,
    products: { Ovo: 0, Leite: 0, Lã: 0 },
    animalConfigs: {
      Galinha: { cost: 60, product: 'Ovo', productTime: 14000, sell: 8 },
      Vaca: { cost: 180, product: 'Leite', productTime: 26000, sell: 15 },
      Ovelha: { cost: 130, product: 'Lã', productTime: 22000, sell: 20 }
    },

    goalsProgress: {
      totalHarvested: 0, safeNights: 0, animalsLostTotal: 0,
      specialOrdersDelivered: 0, seasonsSurvived: 0
    },
    completedGoals: [],
    saleBonus: 0,

    season: 'Primavera',
    dayOfSeason: 0,
    totalDays: 0,

    specialOrder: null,
    npcFlags: {}
  };
}

export const FARM_UPGRADE_COSTS = { 1: 200, 2: 450 };
export const HOUSE_UPGRADE_COST = 350;
export const CAR_COST = 600;
export const WELL_COST = 250;
export const GOV_AUTHORIZATION_COST = 100;
export const ARTESIAN_WELL_COST = 500;
export const ARTESIAN_WELL_WATER_BONUS = 120;
export const WATER_REFILL_COST = 10;
export const WATER_PER_USE = 15;
export const FERTILIZER_COST = 25;
export const FERTILIZER_GROWTH_MULTIPLIER = 1.8;
export const HOLD_DURATION_MS = 150;
export const BATCH_HOLD_DURATION_MS = 500;
export const WOLF_RISK_CHECK_INTERVAL_MS = 8000;
export const WOLF_RISK_CHANCE = 0.18;
export const WOLF_RISK_CHANCE_WINTER = 0.3;
export const DAYS_PER_SEASON = 7;
