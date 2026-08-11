export function createGameState() {
  return {
    money: 30000,
    water: 100,
    maxWater: 100,
    farmLevel: 1,
    houseLevel: 1,
    hasCar: false,
    seeds: { Cenoura: 5, Milho: 3, Abóbora: 2 },
    harvested: { Cenoura: 0, Milho: 0, Abóbora: 0 },
    activeSeedType: 'Cenoura',
    seedConfigs: {
      Cenoura: { cost: 10, sell: 25, growthTime: 11000 },
      Milho: { cost: 20, sell: 50, growthTime: 20000 },
      Abóbora: { cost: 35, sell: 90, growthTime: 32000 }
    },

    animals: [],
    maxAnimals: 4,
    products: { Ovo: 0, Leite: 0 },
    animalConfigs: {
      Galinha: { cost: 60, product: 'Ovo', productTime: 14000, sell: 8 },
      Vaca: { cost: 180, product: 'Leite', productTime: 26000, sell: 15 }
    },

    goalsProgress: { totalHarvested: 0, safeNights: 0, animalsLostTotal: 0 },
    completedGoals: [],
    saleBonus: 0
  };
}

export const FARM_UPGRADE_COSTS = { 1: 200, 2: 450 };
export const HOUSE_UPGRADE_COST = 350;
export const CAR_COST = 600;
export const WATER_REFILL_COST = 10;
export const WATER_PER_USE = 15;
export const HOLD_DURATION_MS = 150;
export const BATCH_HOLD_DURATION_MS = 500;
export const WOLF_RISK_CHECK_INTERVAL_MS = 8000;
export const WOLF_RISK_CHANCE = 0.18;
