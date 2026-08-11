// Metas simples e progressivas que dão propósito às melhorias existentes: cada
// meta recomenda um upgrade específico e, ao ser concluída, aplica um pequeno
// bônus mecânico real (não só uma mensagem de parabéns).
export const GOALS = [
  {
    id: 'harvest10',
    description: 'Colha 10 plantações',
    hint: 'Dica: expanda a fazenda para plantar mais ao mesmo tempo.',
    isComplete: state => state.goalsProgress.totalHarvested >= 10,
    progressText: state => `${Math.min(state.goalsProgress.totalHarvested, 10)} / 10`,
    onComplete: state => {
      state.maxAnimals += 1;
    },
    completeMessage: 'Meta concluída: 10 colheitas! +1 vaga no curral.'
  },
  {
    id: 'safeNights3',
    description: 'Mantenha os animais seguros por 3 noites seguidas',
    hint: 'Dica: melhore a casa para abrir mais espaço no curral.',
    isComplete: state => state.goalsProgress.safeNights >= 3,
    progressText: state => `${Math.min(state.goalsProgress.safeNights, 3)} / 3 noites`,
    onComplete: state => {
      state.maxAnimals += 2;
    },
    completeMessage: 'Meta concluída: 3 noites sem perdas! +2 vagas no curral.'
  },
  {
    id: 'money500',
    description: 'Acumule R$ 500',
    hint: 'Dica: uma picape dá +10% ao vender em lote.',
    isComplete: state => state.money >= 500,
    progressText: state => `R$ ${Math.min(state.money, 500)} / R$ 500`,
    onComplete: state => {
      state.saleBonus = Math.max(state.saleBonus, 0.1);
    },
    completeMessage: 'Meta concluída: R$ 500 guardados! Picape agora dá +10% nas vendas em lote.'
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
