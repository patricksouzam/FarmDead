export function createGameState() {
  return {
    money: 300,
    water: 100,
    maxWater: 100,
    farmLevel: 1,
    houseLevel: 1,
    hasCar: false,
    hasWell: false,
    hasArtesianWell: false,
    govAuthorization: false,
    fertilizer: 0,
    feed: 0,
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
    products: { Ovo: 0, Leite: 0, Lã: 0, 'Peixe Comum': 0, 'Peixe Raro': 0 },
    materials: { Pedra: 0, Minerio: 0, Carvao: 0 },
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
    carSaleBonus: 0,

    season: 'Primavera',
    dayOfSeason: 0,
    totalDays: 0,

    specialOrder: null,
    supplierOrder: null,
    npcFlags: {
      merchant: { friendship: 0 },
      supplier: { friendship: 0 },
      gov: { friendship: 0 }
    },

    energy: 100,
    maxEnergy: 100,
    restedToday: false,
    lastMoneyMilestone: 0,

    decorations: { flowerBeds: 0, barrels: 0, scarecrow: false, fancyFence: false }
  };
}

export const FARM_UPGRADE_COSTS = { 1: 200, 2: 450 };
export const HOUSE_UPGRADE_COST = 350;
export const CAR_COST = 600;
export const CAR_SALE_BONUS = 0.1;
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
export const FANCY_FENCE_WOLF_MULT = 0.55;
export const SCARECROW_WEED_CHANCE = 0.12;
export const BASE_WEED_CHANCE = 0.35;
export const DAYS_PER_SEASON = 7;

export const ENERGY_COST = { plant: 2, water: 1, harvest: 1, weed: 2, mine: 3, fish: 2 };
export const LOW_ENERGY_THRESHOLD = 15;
export const REST_ENERGY_GAIN = 40;
export const HOUSE_REST_RANGE = 3.2;

export const FRIENDSHIP_PER_ORDER = 10;
export const FRIENDSHIP_PER_GIFT = 5;
export const FRIENDSHIP_MILESTONES = [20, 50, 100];
export const SUPPLIER_SEED_DISCOUNT = { 20: 0.1, 50: 0.2, 100: 0.3 };
export const MERCHANT_ORDER_BONUS = { 20: 1.1, 50: 1.25, 100: 1.4 };
export const GOV_AUTH_DISCOUNT = { 20: 0.1, 50: 0.2, 100: 0.35 };

export const MONEY_MILESTONES = [500, 1000, 2500, 5000];

export const DECORATION_COSTS = {
  flowerBeds: 40,
  barrels: 30,
  scarecrow: 80,
  fancyFence: 150
};
export const MAX_FLOWER_BEDS = 3;
export const MAX_BARRELS = 3;

export function friendshipTierBonus(friendship, table) {
  let best = 0;
  for (const [threshold, value] of Object.entries(table)) {
    if (friendship >= Number(threshold) && value > best) best = value;
  }
  return best;
}

export function effectiveSaleBonus(state) {
  return (state.saleBonus || 0) + (state.carSaleBonus || 0);
}

export function seedCostFor(state, type) {
  const base = state.seedConfigs[type].cost;
  const disc = friendshipTierBonus(state.npcFlags.supplier.friendship, SUPPLIER_SEED_DISCOUNT);
  return Math.max(1, Math.round(base * (1 - disc)));
}

export function govAuthCostFor(state) {
  const disc = friendshipTierBonus(state.npcFlags.gov.friendship, GOV_AUTH_DISCOUNT);
  return Math.max(1, Math.round(GOV_AUTHORIZATION_COST * (1 - disc)));
}

export function orderRewardFor(state, order) {
  const mult = friendshipTierBonus(state.npcFlags.merchant.friendship, MERCHANT_ORDER_BONUS) || 1;
  return Math.round(order.reward * mult);
}
