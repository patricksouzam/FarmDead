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
  'Se cuidar bem da terra, ela cuida de você. Foi o que minha mãe me ensinou.'
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

export function generateSpecialOrder() {
  const spec = ORDER_POOL[Math.floor(Math.random() * ORDER_POOL.length)];
  return { ...spec };
}

export function canFulfillOrder(state, order) {
  if (!order) return false;
  const store = order.kind === 'harvested' ? state.harvested : state.products;
  return (store[order.item] || 0) >= order.amount;
}

// Aplica a entrega (debita o item, credita a recompensa) e retorna true se
// o pedido foi de fato entregue. Não gera novo pedido — quem chama decide.
export function fulfillOrder(state, order) {
  if (!canFulfillOrder(state, order)) return false;
  const store = order.kind === 'harvested' ? state.harvested : state.products;
  store[order.item] -= order.amount;
  state.money += order.reward;
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
