// Metas progressivas que também carregam a história da fazenda: o jogador
// herdou a terra abandonada da avó e precisa reerguê-la antes do primeiro
// inverno. Cada capítulo tem uma "intro" (mostrada ao se tornar a meta ativa)
// e, ao ser concluído, aplica um bônus mecânico real e uma mensagem de
// desfecho — texto e mecânica sempre juntos, nunca só um parabéns vazio.
export const GOALS = [
  {
    id: 'chapter1_harvest10',
    chapter: 1,
    title: 'Terra Esquecida',
    intro: 'Herdei esta fazenda da minha avó. O mato tomou tudo, mas a terra ainda é boa. Vamos replantar.',
    description: 'Colha 10 plantações',
    hint: 'Dica: expanda a fazenda para plantar mais ao mesmo tempo.',
    isComplete: state => state.goalsProgress.totalHarvested >= 10,
    progressText: state => `${Math.min(state.goalsProgress.totalHarvested, 10)} / 10`,
    onComplete: state => {
      state.maxAnimals += 1;
    },
    completeMessage: 'Capítulo concluído: a terra está viva de novo! +1 vaga no curral.'
  },
  {
    id: 'chapter2_safeNights3',
    chapter: 2,
    title: 'Primeiro Curral',
    intro: 'Comprei meus primeiros animais. À noite, ouço algo rondando lá fora... preciso mantê-los seguros.',
    description: 'Mantenha os animais seguros por 3 noites seguidas',
    hint: 'Dica: melhore a casa para abrir mais espaço no curral.',
    isComplete: state => state.goalsProgress.safeNights >= 3,
    progressText: state => `${Math.min(state.goalsProgress.safeNights, 3)} / 3 noites`,
    onComplete: state => {
      state.maxAnimals += 2;
    },
    completeMessage: 'Capítulo concluído: 3 noites sem perdas! +2 vagas no curral.'
  },
  {
    id: 'chapter3_money500',
    chapter: 3,
    title: 'Primeiras Economias',
    intro: 'Seu Tobias diz que o mercado da vila paga bem pelas minhas colheitas. Talvez eu consiga guardar algum dinheiro.',
    description: 'Acumule R$ 500',
    hint: 'Dica: uma picape dá +10% ao vender em lote.',
    isComplete: state => state.money >= 500,
    progressText: state => `R$ ${Math.min(state.money, 500)} / R$ 500`,
    onComplete: state => {
      state.saleBonus = Math.max(state.saleBonus, 0.1);
    },
    completeMessage: 'Capítulo concluído: R$ 500 guardados! Picape agora dá +10% nas vendas em lote.'
  },
  {
    id: 'chapter4_firstOrder',
    chapter: 4,
    title: 'Rostos da Vila',
    intro: 'Seu Tobias e Dona Rosa começaram a aparecer com pedidos. Se eu ajudá-los, talvez a vila confie mais em mim.',
    description: 'Entregue 1 pedido especial a Seu Tobias ou Dona Rosa',
    hint: 'Dica: clique no Mercador ou na Fornecedora para ver o pedido do dia.',
    isComplete: state => state.goalsProgress.specialOrdersDelivered >= 1,
    progressText: state => `${Math.min(state.goalsProgress.specialOrdersDelivered, 1)} / 1 pedido`,
    onComplete: state => {
      state.saleBonus = Math.max(state.saleBonus, 0.15);
    },
    completeMessage: 'Capítulo concluído: a vila confia em você! +15% nas vendas em lote.'
  },
  {
    id: 'chapter5_farmLevel2',
    chapter: 5,
    title: 'Raízes Mais Fundas',
    intro: 'Dona Rosa trouxe sementes de Beterraba — só cresce bem no fim do ano. Preciso de mais espaço pra experimentar.',
    description: 'Expanda a fazenda para o nível 2',
    hint: 'Dica: abra Melhorias e expanda a fazenda.',
    isComplete: state => state.farmLevel >= 2,
    progressText: state => `Nível ${state.farmLevel} / 2`,
    onComplete: state => {
      state.maxWater += 20;
    },
    completeMessage: 'Capítulo concluído: mais terra, mais água! +20 de capacidade máxima de água.'
  },
  {
    id: 'chapter6_fiveOrders',
    chapter: 6,
    title: 'Confiança da Vila',
    intro: 'Os pedidos não param de chegar. Se continuar assim, vou virar o fornecedor principal da região.',
    description: 'Entregue 5 pedidos especiais no total',
    hint: 'Dica: guarde colheitas e produtos extras para os pedidos do dia.',
    isComplete: state => state.goalsProgress.specialOrdersDelivered >= 5,
    progressText: state => `${Math.min(state.goalsProgress.specialOrdersDelivered, 5)} / 5 pedidos`,
    onComplete: state => {
      state.saleBonus = Math.max(state.saleBonus, 0.25);
    },
    completeMessage: 'Capítulo concluído: reconhecido na vila! +25% nas vendas em lote.'
  },
  {
    id: 'chapter7_firstWinter',
    chapter: 7,
    title: 'O Primeiro Inverno',
    intro: 'O primeiro inverno desde que cheguei está chegando. Dizem que o lobo fica mais ousado no frio. Vamos aguentar.',
    description: 'Sobreviva a 1 estação de Inverno completa sem perder animais',
    hint: 'Dica: recolha os animais ao curral todas as noites de inverno.',
    isComplete: state => state.goalsProgress.seasonsSurvived >= 1,
    progressText: state => `${Math.min(state.goalsProgress.seasonsSurvived, 1)} / 1 inverno`,
    onComplete: state => {
      state.maxAnimals += 2;
    },
    completeMessage: 'Capítulo concluído: sobrevivemos ao inverno! +2 vagas no curral.'
  },
  {
    id: 'chapter8_legacy',
    chapter: 8,
    title: 'Legado Restaurado',
    intro: 'A fazenda da minha avó voltou a florescer. Ainda há muito a fazer, mas o pior já passou.',
    description: 'Acumule R$ 2000',
    hint: 'Dica: diversifique plantações e animais para renda constante.',
    isComplete: state => state.money >= 2000,
    progressText: state => `R$ ${Math.min(state.money, 2000)} / R$ 2000`,
    onComplete: state => {
      state.saleBonus = Math.max(state.saleBonus, 0.35);
    },
    completeMessage: 'Capítulo concluído: o legado da família está restaurado! +35% nas vendas em lote.'
  }
];

export function getActiveGoal(state) {
  return GOALS.find(g => !state.completedGoals.includes(g.id)) || null;
}

// Verifica a meta ativa e aplica recompensa/registro na primeira vez que ela é
// concluída. Retorna a meta recém-concluída (para notificação) ou null.
export function checkGoals(state) {
  const goal = getActiveGoal(state);
  if (!goal) return null;
  if (!goal.isComplete(state)) return null;

  state.completedGoals.push(goal.id);
  goal.onComplete(state);
  return goal;
}
