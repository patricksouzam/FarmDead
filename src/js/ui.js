export function updateHUD(state) {
  document.getElementById('money-display').textContent = `R$ ${state.money}`;
  document.getElementById('water-display').textContent = `${state.water} / ${state.maxWater}`;
}

export function updateInventoryUI(state, onSell, onSellProduct) {
  const container = document.getElementById('inventory-list');
  container.innerHTML = '';

  for (const type in state.harvested) {
    const count = state.harvested[type];
    const seedCount = state.seeds[type];
    const sellPrice = state.seedConfigs[type].sell;

    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `
      <div>
        <strong>${type}</strong><br>
        <span style="font-size:11px;color:#5a7a52;">Colhidos: ${count} | Sementes: ${seedCount}</span>
      </div>
      <button ${count === 0 ? 'disabled' : ''}>Vender (R$ ${sellPrice})</button>
    `;
    row.querySelector('button').addEventListener('click', () => onSell(type));
    container.appendChild(row);
  }

  if (!onSellProduct) return;
  for (const type in state.products) {
    const count = state.products[type];
    const basePrice = state.animalConfigs[type === 'Ovo' ? 'Galinha' : 'Vaca'].sell;

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
  const desc = document.getElementById('goal-description');
  const progress = document.getElementById('goal-progress');
  const hint = document.getElementById('goal-hint');

  if (!goal) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  desc.textContent = goal.description;
  progress.textContent = goal.progressText(state);
  hint.textContent = goal.hint;
}

export function setDuskWarning(visible) {
  document.getElementById('dusk-warning').classList.toggle('hidden', !visible);
}
