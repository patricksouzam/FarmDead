export function updateHUD(state) {
  document.getElementById('money-display').textContent = `R$ ${state.money}`;
  document.getElementById('water-display').textContent = `${state.water} / ${state.maxWater}`;
  const seasonEl = document.getElementById('season-display');
  if (seasonEl) seasonEl.textContent = state.season;
}

export function updateInventoryUI(state, onSell, onSellProduct, onSelectSeed) {
  document.querySelectorAll('.seed-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.seed === state.activeSeedType);
  });

  const container = document.getElementById('inventory-list');
  container.innerHTML = '';

  for (const type in state.harvested) {
    const count = state.harvested[type];
    const seedCount = state.seeds[type];
    const sellPrice = state.seedConfigs[type].sell;
    const isActive = type === state.activeSeedType;

    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `
      <div>
        <strong>${type}</strong><br>
        <span class="inv-row-meta">Colhidos: ${count} | Sementes: ${seedCount}</span>
      </div>
      <div class="inv-row-actions">
        <button class="use-btn" ${isActive || seedCount === 0 ? 'disabled' : ''}>${isActive ? 'Semente ativa' : 'Usar'}</button>
        <button class="sell-btn" ${count === 0 ? 'disabled' : ''}>Vender (R$ ${sellPrice})</button>
      </div>
    `;
    row.querySelector('.sell-btn').addEventListener('click', () => onSell(type));
    if (onSelectSeed) row.querySelector('.use-btn').addEventListener('click', () => onSelectSeed(type));
    container.appendChild(row);
  }

  if (!onSellProduct) return;
  for (const type in state.products) {
    const count = state.products[type];
    const animalType = Object.keys(state.animalConfigs).find(a => state.animalConfigs[a].product === type);
    const basePrice = state.animalConfigs[animalType].sell;

    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `
      <div>
        <strong>${type}</strong><br>
        <span style="font-size:11px;color:#5a7a52;">Em estoque: ${count}</span>
      </div>
      <button ${count === 0 ? 'disabled' : ''}>Vender (R$ ${basePrice})</button>
    `;
    row.querySelector('button').addEventListener('click', () => onSellProduct(type));
    container.appendChild(row);
  }
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
    carStatus.textContent = 'Adquirido';
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

  if (!goal) {
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

// Painel de diálogo genérico usado pelo fazendeiro (falas de evento) e pelos
// NPCs fixos (Mercador/Fornecedora). `onAction` é opcional: quando presente,
// mostra um botão extra (ex: "Entregar pedido") que o main.js decide o que faz.
export function showDialogue(speaker, text, { actionLabel = null, onAction = null } = {}) {
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

  panel.classList.remove('hidden');
}

export function hideDialogue() {
  document.getElementById('dialogue-panel').classList.add('hidden');
}

export function showChapterIntro(goal) {
  showDialogue(`Capítulo ${goal.chapter}: ${goal.title}`, goal.intro);
}
