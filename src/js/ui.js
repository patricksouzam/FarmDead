import { LOW_ENERGY_THRESHOLD, seedCostFor, effectiveSaleBonus, DAYS_PER_SEASON } from './gameState.js';
import { SEASONS, dayOfSeasonFor } from './seasons.js';
import { FEED_RECIPE, SNACK_RECIPE, YARN_GIFT_RECIPE } from './crafting.js';
import { ensureSurvival } from './survival.js';
import { getWeaponDef } from './weapons.js';
import { PAST_STORY_ENABLED } from './featureFlags.js';

const FLOW_MODAL_IDS = new Set(['title-screen', 'pause-menu', 'settings-modal', 'confirm-modal', 'join-modal']);
const modalStack = [];

function modalEl(id) {
  return document.getElementById(id);
}

export function isModalOpen(id) {
  const el = modalEl(id);
  return !!el && !el.classList.contains('hidden');
}

export function openModal(id) {
  const el = modalEl(id);
  if (!el) return false;
  el.classList.remove('hidden');
  if (!modalStack.includes(id)) modalStack.push(id);
  return true;
}

export function closeModal(id) {
  const el = modalEl(id);
  if (!el) return false;
  el.classList.add('hidden');
  const i = modalStack.lastIndexOf(id);
  if (i >= 0) modalStack.splice(i, 1);
  return true;
}

export function toggleModal(id) {
  if (isModalOpen(id)) {
    closeModal(id);
    return false;
  }
  openModal(id);
  return true;
}

export function closeTopModal() {
  for (let i = modalStack.length - 1; i >= 0; i--) {
    const id = modalStack[i];
    if (FLOW_MODAL_IDS.has(id)) continue;
    closeModal(id);
    return id;
  }
  const open = document.querySelector(
    '.modal:not(.hidden):not(#title-screen):not(#pause-menu):not(#confirm-modal):not(#settings-modal):not(#join-modal)'
  );
  if (open) {
    closeModal(open.id);
    return open.id;
  }
  return null;
}

export function isAnyGameModalOpen() {
  if (modalStack.some(id => !FLOW_MODAL_IDS.has(id) && isModalOpen(id))) return true;
  return !!document.querySelector(
    '.modal:not(.hidden):not(#title-screen):not(#pause-menu):not(#confirm-modal):not(#settings-modal):not(#join-modal)'
  );
}

export function closeAllModalsExcept(keepId) {
  document.querySelectorAll('.modal').forEach(el => {
    if (el.id !== keepId) el.classList.add('hidden');
  });
  modalStack.length = 0;
  if (keepId) modalStack.push(keepId);
}

export function bindModalCloses() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
}

export function bindUiClicks(map) {
  for (const [id, handler] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }
}

export function renderInvRow({ title, meta, actions = [] } = {}) {
  const row = document.createElement('div');
  row.className = 'inv-row';
  const info = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = title ?? '';
  info.appendChild(strong);
  if (meta) {
    info.appendChild(document.createElement('br'));
    const span = document.createElement('span');
    span.className = 'inv-row-meta';
    span.textContent = meta;
    info.appendChild(span);
  }
  row.appendChild(info);
  if (!actions.length) return row;

  const host = actions.length > 1 ? document.createElement('div') : row;
  if (actions.length > 1) {
    host.className = 'inv-row-actions';
    row.appendChild(host);
  }
  for (const action of actions) {
    const btn = document.createElement('button');
    if (action.className) btn.className = action.className;
    btn.textContent = action.label;
    if (action.disabled) btn.disabled = true;
    if (action.onClick) btn.addEventListener('click', action.onClick);
    host.appendChild(btn);
  }
  return row;
}

export function updateNetHud({ visible = false, text = '' } = {}) {
  const el = document.getElementById('net-hud');
  if (!el) return;
  el.classList.toggle('hidden', !visible);
  if (text) el.textContent = text;
}

export function updateHUD(state) {
  document.getElementById('money-display').textContent = `R$ ${state.money}`;
  document.getElementById('water-display').textContent = `${state.water} / ${state.maxWater}`;
  const seasonEl = document.getElementById('season-display');
  if (seasonEl) seasonEl.textContent = state.season;

  const seasonDaysEl = document.getElementById('season-days-display');
  if (seasonDaysEl) {
    const dayIn = dayOfSeasonFor(state.totalDays);
    const left = Math.max(1, DAYS_PER_SEASON - dayIn);
    const idx = SEASONS.indexOf(state.season);
    const next = SEASONS[(idx + 1) % SEASONS.length];
    seasonDaysEl.textContent = `${left} dia${left > 1 ? 's' : ''} · depois ${next}`;
  }

  const energyEl = document.getElementById('energy-display');
  if (energyEl) {
    energyEl.textContent = `${state.energy} / ${state.maxEnergy}`;
    const pill = energyEl.closest('.pill');
    if (pill) pill.classList.toggle('pill-warning', state.energy <= LOW_ENERGY_THRESHOLD);
    const energyBar = document.getElementById('energy-bar');
    if (energyBar) energyBar.style.width = `${Math.max(0, Math.min(100, (state.energy / state.maxEnergy) * 100))}%`;
  }

  const healthEl = document.getElementById('health-display');
  if (healthEl) {
    healthEl.textContent = `${Math.round(state.playerHealth)} / ${state.playerMaxHealth}`;
    const pill = healthEl.closest('.pill');
    if (pill) pill.classList.toggle('pill-warning', state.playerHealth <= state.playerMaxHealth * 0.25);
    const healthBar = document.getElementById('health-bar');
    if (healthBar) healthBar.style.width = `${Math.max(0, Math.min(100, (state.playerHealth / state.playerMaxHealth) * 100))}%`;
  }

  ensureSurvival(state);
  const hungerEl = document.getElementById('hunger-display');
  if (hungerEl) {
    hungerEl.textContent = `${Math.round(state.hunger)} / ${state.maxHunger}`;
    const hungerBar = document.getElementById('hunger-bar');
    if (hungerBar) hungerBar.style.width = `${Math.max(0, Math.min(100, (state.hunger / state.maxHunger) * 100))}%`;
    hungerEl.closest('.pill')?.classList.toggle('pill-warning', state.hunger <= 20);
  }
  const thirstEl = document.getElementById('thirst-display');
  if (thirstEl) {
    thirstEl.textContent = `${Math.round(state.thirst)} / ${state.maxThirst}`;
    const thirstBar = document.getElementById('thirst-bar');
    if (thirstBar) thirstBar.style.width = `${Math.max(0, Math.min(100, (state.thirst / state.maxThirst) * 100))}%`;
    thirstEl.closest('.pill')?.classList.toggle('pill-warning', state.thirst <= 20);
  }

  const flags = document.getElementById('status-flags');
  if (flags) {
    const chips = [];
    if (state.bleeding) chips.push('<span class="status-chip">Sangrando</span>');
    if (state.infected) chips.push('<span class="status-chip infect">Infectado</span>');
    flags.innerHTML = chips.join('');
    flags.classList.toggle('hidden', chips.length === 0);
  }

  updateWeaponHUD(state);
  updateCraftLabels(state);
}

function updateCraftLabels(state) {
  const feedText = document.getElementById('feed-count-text');
  if (feedText) feedText.textContent = `Ração: ${state.feed || 0} · ${FEED_RECIPE.wheatCost}× Trigo`;

  const snackText = document.getElementById('snack-count-text');
  if (snackText) snackText.textContent = `Lanche (+${SNACK_RECIPE.energyGain} energia) · Leite + Trigo`;

  const yarnText = document.getElementById('yarn-gift-count-text');
  if (yarnText) {
    const count = state.products[YARN_GIFT_RECIPE.productKey] || 0;
    yarnText.textContent = `Presente de lã: ${count} · ${YARN_GIFT_RECIPE.woolCost}× Lã`;
  }
}

export function updateInventoryUI(state, onSell, onSellProduct, onSelectSeed) {
  document.querySelectorAll('.seed-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.seed === state.activeSeedType);
    const type = btn.dataset.seed;
    if (type && state.seedConfigs[type]) {
      const priceSpan = btn.querySelector('span:last-child');
      if (priceSpan) priceSpan.textContent = `R$ ${seedCostFor(state, type)}`;
    }
  });

  const container = document.getElementById('inventory-list');
  if (!container) return;
  container.innerHTML = '';
  const bonus = effectiveSaleBonus(state);

  for (const type in state.harvested) {
    const count = state.harvested[type];
    const seedCount = state.seeds[type];
    const sellPrice = Math.round(state.seedConfigs[type].sell * (1 + bonus));
    const isActive = type === state.activeSeedType;
    container.appendChild(renderInvRow({
      title: type,
      meta: `Colhidos: ${count} | Sementes: ${seedCount}`,
      actions: [
        {
          className: 'use-btn',
          label: isActive ? 'Semente ativa' : 'Usar',
          disabled: isActive || seedCount === 0,
          onClick: onSelectSeed ? () => onSelectSeed(type) : null
        },
        {
          className: 'sell-btn',
          label: `Vender (R$ ${sellPrice})`,
          disabled: count === 0,
          onClick: () => onSell(type)
        }
      ]
    }));
  }

  container.appendChild(renderInvRow({
    title: 'Ração',
    meta: `Em estoque: ${state.feed || 0} — botão Ração + E no animal`
  }));

  if (!onSellProduct) {
    updateCraftLabels(state);
    return;
  }
  for (const type in state.products) {
    const count = state.products[type];
    const animalType = Object.keys(state.animalConfigs).find(a => state.animalConfigs[a].product === type);
    const basePrice = animalType
      ? Math.round(state.animalConfigs[animalType].sell * (1 + bonus))
      : (type === YARN_GIFT_RECIPE.productKey ? 40 : 10);

    container.appendChild(renderInvRow({
      title: type,
      meta: `Em estoque: ${count}`,
      actions: [{
        label: `Vender (R$ ${basePrice})`,
        disabled: count === 0,
        onClick: () => onSellProduct(type)
      }]
    }));
  }

  if (state.materials) {
    for (const type of Object.keys(state.materials)) {
      const count = state.materials[type] || 0;
      const base = type === 'Minerio' ? 12 : type === 'Carvao' ? 8 : 4;
      const price = Math.round(base * (1 + bonus));
      container.appendChild(renderInvRow({
        title: type,
        meta: `Material: ${count}`,
        actions: [{
          label: `Vender (R$ ${price})`,
          disabled: count === 0,
          onClick: () => onSellProduct(type)
        }]
      }));
    }
  }

  if (Array.isArray(state.weaponsOwned) && state.weaponsOwned.length) {
    state.weaponsOwned.forEach(id => {
      const equipped = state.equippedWeapon === id;
      container.appendChild(renderInvRow({
        title: getWeaponDef(id).name,
        meta: equipped ? 'Equipada' : 'Coletada — role o mouse para trocar'
      }));
    });
  }

  updateCraftLabels(state);
}

/** Minimapa 2D — planta da área ativa com marcadores. */
export function updateMinimap(playerPos, markers, bounds, areaLabel) {
  const canvas = document.getElementById('minimap');
  if (!canvas || !playerPos || !bounds) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const pad = 6;
  const mapW = Math.max(0.001, bounds.maxX - bounds.minX);
  const mapH = Math.max(0.001, bounds.maxZ - bounds.minZ);

  const toXY = (x, z) => ({
    x: pad + ((x - bounds.minX) / mapW) * (w - pad * 2),
    y: pad + ((z - bounds.minZ) / mapH) * (h - pad * 2)
  });

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(28, 48, 28, 0.82)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(180, 220, 150, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  if (areaLabel) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(areaLabel, 8, 14);
  }

  const drawMark = (pos, color, label) => {
    if (!pos) return;
    const p = toXY(pos.x, pos.z);
    ctx.fillStyle = color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '9px sans-serif';
      ctx.fillText(label, p.x + 5, p.y + 3);
    }
  };

  drawMark(markers.house, '#e8c070', 'Casa');
  drawMark(markers.village, '#c09060', markers.villageGate ? 'Vila' : 'Praça');
  drawMark(markers.cave, '#888', 'Caverna');
  drawMark(markers.lake, '#4ab0e0', 'Lago');
  drawMark(markers.exit, '#7ec8ff', 'Saída');

  const pp = toXY(playerPos.x, playerPos.z);
  ctx.fillStyle = '#ff6b4a';
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function updateAreaBadge(label) {
  const el = document.getElementById('area-badge');
  if (el) el.textContent = label || 'Fazenda';
}

export function updateUpgradesUI(state) {
  const plotCounts = { 1: 12, 2: 20, 3: 30 };
  document.getElementById('farm-level-text').textContent =
    `Nível ${state.farmLevel} (${plotCounts[state.farmLevel]} blocos)`;
  const farmBtn = document.getElementById('btn-upgrade-farm');
  if (state.farmLevel >= 3) {
    farmBtn.textContent = 'Máximo';
    farmBtn.disabled = true;
  }

  document.getElementById('house-level-text').textContent =
    `Nível ${state.houseLevel} (${state.houseLevel === 1 ? 'Cabana' : 'Casa Grande'}) — curral: ${state.animals.length}/${state.maxAnimals}`;
  const houseBtn = document.getElementById('btn-upgrade-house');
  if (state.houseLevel >= 2) {
    houseBtn.textContent = 'Máximo';
    houseBtn.disabled = true;
  }

  const carStatus = document.getElementById('car-status-text');
  const carBtn = document.getElementById('btn-buy-car');
  if (state.hasCar) {
    carStatus.textContent = 'Adquirido (+10% vendas)';
    carBtn.textContent = 'Adquirido';
    carBtn.disabled = true;
  }

  const wellStatus = document.getElementById('well-status-text');
  const wellBtn = document.getElementById('btn-buy-well');
  if (wellStatus && wellBtn) {
    if (state.hasWell) {
      wellStatus.textContent = `Adquirido (água máx: ${state.maxWater})`;
      wellBtn.textContent = 'Adquirido';
      wellBtn.disabled = true;
    } else {
      wellStatus.textContent = `Água máx: ${state.maxWater}`;
    }
  }

  const artesianStatus = document.getElementById('artesian-well-status-text');
  const artesianBtn = document.getElementById('btn-buy-artesian-well');
  if (artesianStatus && artesianBtn) {
    if (state.hasArtesianWell) {
      artesianStatus.textContent = `Adquirido (água máx: ${state.maxWater})`;
      artesianBtn.textContent = 'Adquirido';
      artesianBtn.disabled = true;
    } else if (state.govAuthorization) {
      artesianStatus.textContent = `Autorizado — água máx: ${state.maxWater}`;
      artesianBtn.textContent = 'Construir (R$ 500)';
      artesianBtn.disabled = false;
    } else {
      artesianStatus.textContent = 'Requer autorização do Fiscal Aurélio';
      artesianBtn.textContent = 'Autorização pendente';
      artesianBtn.disabled = true;
    }
  }

  const fertilizerText = document.getElementById('fertilizer-count-text');
  if (fertilizerText) fertilizerText.textContent = `Em estoque: ${state.fertilizer}`;

  const flowerBedText = document.getElementById('flowerbed-count-text');
  if (flowerBedText) flowerBedText.textContent = state.decorations.flowerBeds;
  const barrelText = document.getElementById('barrel-count-text');
  if (barrelText) barrelText.textContent = state.decorations.barrels;

  const scarecrowBtn = document.querySelector('[data-decor="scarecrow"]');
  if (scarecrowBtn && state.decorations.scarecrow) {
    scarecrowBtn.textContent = 'Adquirido';
    scarecrowBtn.disabled = true;
  }
  const fancyFenceBtn = document.querySelector('[data-decor="fancyFence"]');
  if (fancyFenceBtn && state.decorations.fancyFence) {
    fancyFenceBtn.textContent = 'Adquirido';
    fancyFenceBtn.disabled = true;
  }
  const flowerBedBtn = document.querySelector('[data-decor="flowerBeds"]');
  if (flowerBedBtn && state.decorations.flowerBeds >= 3) {
    flowerBedBtn.textContent = 'Máximo';
    flowerBedBtn.disabled = true;
  }
  const barrelBtn = document.querySelector('[data-decor="barrels"]');
  if (barrelBtn && state.decorations.barrels >= 3) {
    barrelBtn.textContent = 'Máximo';
    barrelBtn.disabled = true;
  }
}

export function updateWeaponHUD(state) {
  const nameEl = document.getElementById('weapon-name');
  if (!nameEl) return;
  const id = state.equippedWeapon || 'fists';
  nameEl.textContent = getWeaponDef(id).name;
  const ammoEl = document.getElementById('weapon-ammo');
  const def = getWeaponDef(id);
  if (ammoEl) {
    if (def.kind === 'ranged') {
      ammoEl.textContent = `${state.mag?.[id] ?? 0} / ${state.ammo?.[id] ?? 0}`;
      ammoEl.classList.remove('hidden');
    } else {
      ammoEl.classList.add('hidden');
    }
  }
  const hintEl = document.getElementById('weapon-hint');
  if (hintEl) {
    if (def.kind === 'ranged') {
      hintEl.textContent = 'Clique atira · Direito mira · R recarrega · Scroll troca';
    } else {
      hintEl.textContent = 'Clique esquerdo ataca · Scroll troca arma · E coleta';
    }
  }
}

let notifTimeout = null;
export function showNotification(text) {
  const notif = document.getElementById('notification');
  document.getElementById('notif-text').textContent = text;
  notif.style.opacity = '1';
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => { notif.style.opacity = '0'; }, 2600);
}

export function setActiveTool(tool) {
  ['plant', 'water', 'harvest', 'weed'].forEach(t => {
    document.getElementById(`btn-${t}`).classList.toggle('active', t === tool);
  });
}

export function updateGoalsUI(state, goal) {
  const card = document.getElementById('goal-card');
  const title = document.getElementById('goal-title');
  const desc = document.getElementById('goal-description');
  const progress = document.getElementById('goal-progress');
  const hint = document.getElementById('goal-hint');

  if (!card) return;
  if (!PAST_STORY_ENABLED || !goal) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  if (title) title.textContent = `Capítulo ${goal.chapter}: ${goal.title}`;
  desc.textContent = goal.description;
  progress.textContent = goal.progressText(state);
  hint.textContent = goal.hint;
}

export function setDuskWarning(visible) {
  document.getElementById('dusk-warning').classList.toggle('hidden', !visible);
}

export function showDialogue(speaker, text, { actionLabel = null, onAction = null, giftLabel = null, onGift = null, friendshipInfo = null } = {}) {
  const panel = document.getElementById('dialogue-panel');
  document.getElementById('dialogue-speaker').textContent = speaker;
  document.getElementById('dialogue-text').textContent = text;

  const actionBtn = document.getElementById('dialogue-action');
  if (actionLabel && onAction) {
    actionBtn.textContent = actionLabel;
    actionBtn.classList.remove('hidden');
    actionBtn.onclick = () => { onAction(); };
  } else {
    actionBtn.classList.add('hidden');
    actionBtn.onclick = null;
  }

  const giftBtn = document.getElementById('dialogue-gift');
  if (giftLabel && onGift) {
    giftBtn.textContent = giftLabel;
    giftBtn.classList.remove('hidden');
    giftBtn.onclick = () => { onGift(); };
  } else {
    giftBtn.classList.add('hidden');
    giftBtn.onclick = null;
  }

  const friendshipEl = document.getElementById('dialogue-friendship');
  if (friendshipInfo) {
    friendshipEl.textContent = friendshipInfo.nextMilestone
      ? `Amizade: ${friendshipInfo.points} (próximo marco: ${friendshipInfo.nextMilestone})`
      : `Amizade: ${friendshipInfo.points} (máxima)`;
    friendshipEl.classList.remove('hidden');
  } else {
    friendshipEl.classList.add('hidden');
  }

  panel.classList.remove('hidden');
}

export function hideDialogue() {
  document.getElementById('dialogue-panel').classList.add('hidden');
}

export function showChapterIntro(goal) {
  if (!PAST_STORY_ENABLED || !goal) return;
  showDialogue(`Capítulo ${goal.chapter}: ${goal.title}`, goal.intro);
}

export function showConfirmDialog({ title = 'Confirmar', message = 'Tem certeza?', confirmLabel = 'Confirmar', danger = true } = {}) {
  return new Promise((resolve) => {
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmLabel;
    okBtn.classList.toggle('title-btn-danger', danger);
    okBtn.classList.toggle('title-btn-primary', !danger);

    const cleanup = (result) => {
      closeModal('confirm-modal');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      resolve(result);
    };

    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    openModal('confirm-modal');
  });
}
