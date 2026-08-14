// Serialização do progresso de jogo para os slots de save (via IPC, ver
// preload.js/main.js). farmPlots/crops não vivem em gameState.js — por isso
// precisam ser passados explicitamente para montar/restaurar o snapshot.
export function serializeGame(state, farmPlots, runtime) {
  return {
    state: {
      ...state,
      npcFlags: state.npcFlags
    },
    plots: farmPlots.map(plot => {
      const d = plot.userData;
      if (!d.hasCrop) return { hasCrop: false, hasWeed: d.hasWeed };
      const cropData = d.cropRef.userData;
      return {
        hasCrop: true,
        hasWeed: d.hasWeed,
        seedType: cropData.seedType,
        growthDuration: cropData.growthDuration,
        growthProgress: cropData.growthProgress,
        watered: cropData.watered,
        fertilized: !!cropData.fertilized,
        status: cropData.status
      };
    }),
    animals: state.animals.map(a => ({
      type: a.type,
      isOutside: a.isOutside,
      productTimer: a.productTimer,
      productReady: !!a.productReady
    })),
    runtime
  };
}

export function getRuntimeSnapshot(vars) {
  const {
    worldTime, timeScale, wasDay, wolfRiskTimer, weedSpawnTimer,
    goalCheckTimer, lastGoalId, winterStreakBroken, playerX, playerZ, cameraYaw, cameraPitch,
    area
  } = vars;
  return {
    worldTime, timeScale, wasDay, wolfRiskTimer, weedSpawnTimer,
    goalCheckTimer, lastGoalId, winterStreakBroken,
    playerX, playerZ, cameraYaw, cameraPitch,
    area: area || 'farm'
  };
}
