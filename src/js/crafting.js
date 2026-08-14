export const FEED_RECIPE = {
  wheatCost: 3,
  feedGain: 1,
  label: '3× Trigo → 1 Ração'
};

export const SNACK_RECIPE = {
  milkCost: 1,
  wheatCost: 1,
  energyGain: 25,
  label: '1× Leite + 1× Trigo → Lanche (+25 energia)'
};

export const YARN_GIFT_RECIPE = {
  woolCost: 2,
  giftGain: 1,
  productKey: 'Presente de Lã',
  label: '2× Lã → 1 Presente de Lã'
};

export const FEED_BOOST = 0.4; // reduz 40% do tempo restante do produto

export function canCraftFeed(state) {
  return (state.harvested.Trigo || 0) >= FEED_RECIPE.wheatCost;
}

export function craftFeed(state) {
  if (!canCraftFeed(state)) return false;
  state.harvested.Trigo -= FEED_RECIPE.wheatCost;
  state.feed = (state.feed || 0) + FEED_RECIPE.feedGain;
  return true;
}

export function canCraftSnack(state) {
  return (state.products.Leite || 0) >= SNACK_RECIPE.milkCost
    && (state.harvested.Trigo || 0) >= SNACK_RECIPE.wheatCost;
}

export function craftSnack(state) {
  if (!canCraftSnack(state)) return false;
  state.products.Leite -= SNACK_RECIPE.milkCost;
  state.harvested.Trigo -= SNACK_RECIPE.wheatCost;
  state.energy = Math.min(state.maxEnergy, state.energy + SNACK_RECIPE.energyGain);
  return true;
}

export function canCraftYarnGift(state) {
  return (state.products.Lã || 0) >= YARN_GIFT_RECIPE.woolCost;
}

export function craftYarnGift(state) {
  if (!canCraftYarnGift(state)) return false;
  state.products.Lã -= YARN_GIFT_RECIPE.woolCost;
  const key = YARN_GIFT_RECIPE.productKey;
  state.products[key] = (state.products[key] || 0) + YARN_GIFT_RECIPE.giftGain;
  return true;
}

/** Acelera o timer de produto; se completar, deixa pronto para coletar. */
export function feedAnimal(state, animal) {
  if ((state.feed || 0) <= 0) return { ok: false, reason: 'Sem ração!' };
  if (!animal) return { ok: false, reason: 'Nenhum animal.' };

  state.feed--;
  const remaining = Math.max(0, animal.productTime - animal.productTimer);
  animal.productTimer += remaining * FEED_BOOST;
  let produced = false;
  if (animal.productTimer >= animal.productTime) {
    animal.productTimer = 0;
    animal.productReady = true;
    produced = true;
  }
  return { ok: true, produced };
}

export function collectReadyProduct(state, animal) {
  if (!animal || !animal.productReady) return false;
  animal.productReady = false;
  animal.productTimer = 0;
  state.products[animal.product] = (state.products[animal.product] || 0) + 1;
  return true;
}
