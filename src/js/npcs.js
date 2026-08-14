// Falas e pedidos especiais dos NPCs da fazenda. Puramente dados + funções
// puras de seleção — main.js decide quando chamar cada uma e como aplicar o
// resultado (dinheiro, notificação, painel de diálogo).

export const MERCHANT_NAME = 'Seu Tobias';
export const SUPPLIER_NAME = 'Dona Rosa';
export const GOV_OFFICIAL_NAME = 'Fiscal Aurélio';

const MERCHANT_IDLE_LINES = [
  'Bah, esses tomates da vizinha nem se comparam ao que você cultiva aqui.',
  'O mercado da cidade tá pagando bem por Beterraba esse mês, ouvi dizer.',
  'Sua avó sempre trazia as melhores Abóboras pra mim, sabia?',
  'Com essa fazenda de pé de novo, até que a vila tá mais animada.'
];

const SUPPLIER_IDLE_LINES = [
  'Trouxe sementes novas da vila vizinha — só vendo pra quem prova ser bom fazendeiro.',
  'O inverno tá chegando... bom seria ter Beterraba plantada antes do frio.',
  'Dizem que o lobo anda mais ousado nas noites de inverno. Cuidado.',
  'Se cuidar bem da terra, ela cuida de você. Foi o que minha mãe me ensinou.',
  'Com trigo de sobra você faz ração no celeiro — os bichos agradecem.'
];

const ORDER_POOL = [
  { item: 'Milho', kind: 'harvested', amount: 3, reward: 40, text: 'Preciso de 3x Milho pra feira de sábado.' },
  { item: 'Abóbora', kind: 'harvested', amount: 2, reward: 60, text: 'Minha esposa quer 2 Abóboras pra fazer doce.' },
  { item: 'Ovo', kind: 'products', amount: 4, reward: 35, text: 'A padaria da vila tá pedindo 4 Ovos frescos.' },
  { item: 'Leite', kind: 'products', amount: 2, reward: 45, text: 'Preciso de 2x Leite pro café da manhã da estalagem.' },
  { item: 'Trigo', kind: 'harvested', amount: 5, reward: 50, text: 'O moinho tá parado, preciso de 5x Trigo urgente.' },
  { item: 'Lã', kind: 'products', amount: 2, reward: 55, text: 'Uma tecelã da vila quer 2x Lã pra um cobertor.' },
  { item: 'Beterraba', kind: 'harvested', amount: 2, reward: 80, text: 'Beterraba fresca pra um caldo de inverno — 2 unidades.' }
];

const SUPPLIER_ORDER_POOL = [
  { item: 'Cenoura', kind: 'harvested', amount: 4, reward: 45, text: 'Me traz 4 Cenouras pra eu testar na salada da feira?' },
  { item: 'Trigo', kind: 'harvested', amount: 6, reward: 55, text: 'Preciso de 6x Trigo pra trocar por sementes novas.' },
  { item: 'Ovo', kind: 'products', amount: 3, reward: 30, text: 'Trouxe mudas — em troca quero 3 Ovos frescos.' },
  { item: 'Milho', kind: 'harvested', amount: 3, reward: 48, text: 'Meu sobrinho quer 3x Milho pra farofa da festa.' },
  { item: 'Lã', kind: 'products', amount: 1, reward: 35, text: 'Uma meia de Lã me aquece o inverno — só 1 unidade.' }
];

const PREMIUM_ORDER_POOL = [
  { item: 'Beterraba', kind: 'harvested', amount: 3, reward: 140, text: 'Cliente VIP: 3 Beterrabas premium, paga bem!' },
  { item: 'Leite', kind: 'products', amount: 4, reward: 90, text: 'Pedido especial da estalagem: 4x Leite.' },
  { item: 'Abóbora', kind: 'harvested', amount: 3, reward: 120, text: 'Doceria da cidade quer 3 Abóboras grandes.' }
];

export function randomMerchantLine() {
  return MERCHANT_IDLE_LINES[Math.floor(Math.random() * MERCHANT_IDLE_LINES.length)];
}

export function randomSupplierLine() {
  return SUPPLIER_IDLE_LINES[Math.floor(Math.random() * SUPPLIER_IDLE_LINES.length)];
}

const GOV_AUTHORIZED_LINES = [
  'Sua documentação para o poço artesiano está em ordem. Pode perfurar quando quiser.',
  'Vistoria concluída — a outorga de uso de água profunda é sua.',
  'Fiscalizei bastante propriedade por aqui. A sua está com os papéis certos.'
];

export function govAuthorizationOffer(cost) {
  return `Para autorizar a perfuração de um poço artesiano, preciso registrar uma outorga de uso de água — taxa de R$ ${cost}.`;
}

export function randomGovAuthorizedLine() {
  return GOV_AUTHORIZED_LINES[Math.floor(Math.random() * GOV_AUTHORIZED_LINES.length)];
}

export function generateSpecialOrder(friendship = 0) {
  const pool = friendship >= 50
    ? ORDER_POOL.concat(PREMIUM_ORDER_POOL)
    : ORDER_POOL;
  const spec = pool[Math.floor(Math.random() * pool.length)];
  return { ...spec };
}

export function generateSupplierOrder() {
  const spec = SUPPLIER_ORDER_POOL[Math.floor(Math.random() * SUPPLIER_ORDER_POOL.length)];
  return { ...spec };
}

export function canFulfillOrder(state, order) {
  if (!order) return false;
  const store = order.kind === 'harvested' ? state.harvested : state.products;
  return (store[order.item] || 0) >= order.amount;
}

// Aplica a entrega (debita o item, credita a recompensa) e retorna true se
// o pedido foi de fato entregue. Não gera novo pedido — quem chama decide.
export function fulfillOrder(state, order, rewardOverride = null) {
  if (!canFulfillOrder(state, order)) return false;
  const store = order.kind === 'harvested' ? state.harvested : state.products;
  store[order.item] -= order.amount;
  state.money += rewardOverride != null ? rewardOverride : order.reward;
  state.goalsProgress.specialOrdersDelivered++;
  return true;
}

// Falas contextuais do fazendeiro (NPC da varanda), disparadas por evento —
// não por timer. Cada chave corresponde a um gatilho específico no main.js.
const FARMER_LINES = {
  duskAnimalsOut: count => count === 1
    ? 'Ainda tem um bichinho lá fora... espero que o lobo não apareça esta noite.'
    : `${count} animais ainda soltos com a noite chegando... isso me preocupa.`,
  wolfAttack: animalType => `Droga! Ouvi um grito no curral — o lobo levou ${animalType}. Precisamos de uma cerca melhor.`,
  safeNight: streak => streak >= 3
    ? 'Estamos conseguindo, viu? Minha avó ficaria orgulhosa dessa fazenda.'
    : 'Mais uma noite tranquila. Aos poucos a fazenda volta a ser o que era.',
  winterStart: 'O primeiro inverno desde que cheguei... vai ser difícil, mas vamos aguentar.',
  seasonChange: season => `A estação virou: ${season}. O tempo por aqui muda rápido.`,
  moneyMilestone: amount => `R$ ${amount} guardados! Já consigo pensar em investir na fazenda de verdade.`
};

export function farmerLine(key, arg) {
  const entry = FARMER_LINES[key];
  return typeof entry === 'function' ? entry(arg) : entry;
}

// Retorna o marco de amizade recém-cruzado (before < marco <= after) ou null.
// Usado após incrementar pontos de amizade (pedido entregue/presente dado)
// para disparar uma notificação só na transição, não a cada incremento.
export function checkFriendshipMilestones(before, after, milestones) {
  return milestones.find(m => before < m && after >= m) || null;
}

export function friendshipRewardHint(npcId, milestone) {
  if (npcId === 'merchant') {
    if (milestone >= 100) return 'Tobias agora oferece pedidos premium e recompensas maiores!';
    if (milestone >= 50) return 'Tobias liberou pedidos melhores no mercado!';
    return 'Tobias paga um pouco mais pelos pedidos.';
  }
  if (npcId === 'supplier') {
    if (milestone >= 100) return 'Rosa dá 30% de desconto nas sementes!';
    if (milestone >= 50) return 'Rosa dá 20% de desconto nas sementes!';
    return 'Rosa dá 10% de desconto nas sementes!';
  }
  if (npcId === 'gov') {
    if (milestone >= 100) return 'Aurélio reduz a taxa da outorga em 35%!';
    if (milestone >= 50) return 'Aurélio reduz a taxa da outorga em 20%!';
    return 'Aurélio reduz a taxa da outorga em 10%!';
  }
  return '';
}
