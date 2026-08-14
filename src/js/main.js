import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  createScene, createSky, createLights, createGround, createFences,
  createTrees, createWindmill, createHouse, buildHouse, createCar, buildCar,
  createBarn, createSilo, createPaths, createClouds, createCorral,
  createSun, createMoon, createWindSystem, updateWind, applyWindEffects,
  createMerchantNpc, createSupplierNpc, createWell, createGovOfficialNpc, createArtesianWell,
  createDecoration, createVillage, createVillageGate, createCaveEntrance,
  BARN_POSITION, HOUSE_POSITION,
  VILLAGE_PLAZA, VILLAGE_GATE, avoidObstacles, beginObstacleRegistration
} from './world.js';
import { createCave, nearestMineNode, tryMineNode, updateCaveNodes, MATERIAL_SELL } from './cave.js';
import { createLake, isNearDock, startFishing, updateFishing, isFishing, fishSellPrice } from './fishing.js';
import { updateMinimap, updateAreaBadge } from './ui.js';
import {
  rebuildFarmPlots, createCropMesh, updateCropVisualState, setPlotWetVisual,
  maybeSpawnWeed, removeWeed, setPlotNeedsWaterHint
} from './crops.js';
import { spawnAnimal, updateAnimalAI, animateAnimal, removeAnimal, createWolfMesh, updateWolfPatrol } from './animals.js';
import { checkGoals, getActiveGoal } from './goals.js';
import {
  createGameState, FARM_UPGRADE_COSTS, HOUSE_UPGRADE_COST, CAR_COST, CAR_SALE_BONUS, WELL_COST, WATER_REFILL_COST,
  WATER_PER_USE, FERTILIZER_COST, FERTILIZER_GROWTH_MULTIPLIER, HOLD_DURATION_MS, BATCH_HOLD_DURATION_MS,
  WOLF_RISK_CHECK_INTERVAL_MS, ARTESIAN_WELL_COST, ARTESIAN_WELL_WATER_BONUS,
  ENERGY_COST, FRIENDSHIP_PER_ORDER, FRIENDSHIP_PER_GIFT, FRIENDSHIP_MILESTONES,
  DECORATION_COSTS, MAX_FLOWER_BEDS, MAX_BARRELS, REST_ENERGY_GAIN, HOUSE_REST_RANGE,
  SCARECROW_WEED_CHANCE, BASE_WEED_CHANCE, MONEY_MILESTONES,
  seedCostFor, govAuthCostFor, orderRewardFor, effectiveSaleBonus
} from './gameState.js';
import {
  updateHUD, updateInventoryUI, updateUpgradesUI, showNotification, setActiveTool, updateGoalsUI,
  setDuskWarning, showDialogue, hideDialogue, showChapterIntro, showConfirmDialog
} from './ui.js';
import {
  seasonForDay, dayOfSeasonFor, growthMultiplierForSeason, skyPaletteForSeason,
  wolfRiskChanceForSeason, isPlantableInSeason
} from './seasons.js';
import {
  MERCHANT_NAME, SUPPLIER_NAME, GOV_OFFICIAL_NAME, randomMerchantLine, randomSupplierLine,
  generateSpecialOrder, generateSupplierOrder, fulfillOrder, farmerLine, govAuthorizationOffer,
  randomGovAuthorizedLine, checkFriendshipMilestones, friendshipRewardHint
} from './npcs.js';
import { svgIcon } from '../icons/icons.js';
import { APP_STATE } from './appFlow.js';
import { loadSettings, saveSettings, applyQualityPreset } from './settings.js';
import { initAudio, applyAudioSettings, playSfx } from './audio.js';
import { serializeGame, getRuntimeSnapshot } from './saveGame.js';
import {
  createPlayer, bindPlayerInput, updatePlayerMovement, updateFollowCamera,
  isInRange, nearestInRange, setPlayerPosition, PLAYER_INTERACT_RANGE
} from './player.js';
import {
  craftFeed, canCraftFeed, feedAnimal, collectReadyProduct, FEED_RECIPE,
  craftSnack, canCraftSnack, SNACK_RECIPE, craftYarnGift, canCraftYarnGift, YARN_GIFT_RECIPE
} from './crafting.js';
import { animateIdleHumanoid, animateWalkHumanoid } from './characters.js';
import {
  AREA, getCurrentArea, getActiveBounds, getAreaLabel, setAreaRoots,
  nearestPortal, transitionToArea, forceArea, getMinimapMarkers, isTransitioning
} from './areas.js';

const canvas = document.getElementById('game-canvas');
const state = createGameState();

let scene, camera, renderer, composer, controls, bloomPass;
let raycaster, mouse;
let appState = APP_STATE.TITLE;
let previousAppState = null;
let appSettings = loadSettings();
let giftTargetNpc = null;
let sunLight, ambientLight, hemiLight, moonLight, fillLight, skyUniforms;
let houseGroup, carGroup, windmill, clouds, treesGroup, groundMesh, barnGroup;
let sunMesh, moonMesh, windSystem;
let farmRoot, caveRoot, villageRoot;
let corral, wolf, merchantNpc, supplierNpc, govNpc, wellGroup, artesianWellGroup, alarmBell;
let alarmRinging = false;
let alarmBellSwingTime = 0;
let farmPlots = [];
let crops = [];
let decorationMeshes = [];
let player = null;
let feedMode = false;

let currentTool = 'plant';
let targetPlot = null;
let isHolding = false;
let isBatchHolding = false;
let holdStartTime = 0;

let worldTime = 400; // 06:40
let lastFrameTime = performance.now();
let timeScale = 1;
let wasDay = true;
let duskWarningShown = false;
let wolfRiskTimer = 0;
let weedSpawnTimer = 0;
let goalCheckTimer = 0;
let lastGoalId = null;
let winterStreakBroken = false;

init();

function init() {
  scene = createScene();
  skyUniforms = createSky(scene);
  clouds = createClouds(scene);
  sunMesh = createSun(scene);
  moonMesh = createMoon(scene);
  windSystem = createWindSystem(scene);
  ({ ambientLight, hemiLight, sunLight, moonLight, fillLight } = createLights(scene));

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 15, 22);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, -2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 55;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;
  controls.enabled = false;
  controls.update();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.5, 0.82);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  applyGraphicsSettings(appSettings.graphics);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  farmRoot = new THREE.Group();
  farmRoot.name = 'farmRoot';
  caveRoot = new THREE.Group();
  caveRoot.name = 'caveRoot';
  villageRoot = new THREE.Group();
  villageRoot.name = 'villageRoot';
  scene.add(farmRoot);
  scene.add(caveRoot);
  scene.add(villageRoot);

  beginObstacleRegistration('farm');
  groundMesh = createGround(scene);
  createFences(farmRoot, [-14, 16], [-13, 10], { gateSide: 'north', gateWidth: 2.4 });
  treesGroup = createTrees(farmRoot);
  windmill = createWindmill(farmRoot);
  barnGroup = createBarn(farmRoot);
  createSilo(farmRoot);
  wolf = createWolfMesh(farmRoot);

  beginObstacleRegistration('village');
  merchantNpc = createMerchantNpc(villageRoot);
  supplierNpc = createSupplierNpc(villageRoot);
  govNpc = createGovOfficialNpc(villageRoot);
  const village = createVillage(villageRoot);
  alarmBell = village.alarmBell;
  beginObstacleRegistration('farm');

  houseGroup = createHouse(farmRoot, state.houseLevel);
  carGroup = createCar(farmRoot);
  buildCar(carGroup, state.hasCar);
  player = createPlayer(scene, { x: 0, z: -4 });

  createCave(caveRoot);
  createCaveEntrance(farmRoot);
  createVillageGate(farmRoot);
  createLake(farmRoot);

  // Trilhas do hub: casa → portão da vila; casa → caverna; casa → lago; celeiro
  createPaths(farmRoot, [
    { width: 1.8, points: [[0, -8.0], [0, -5.0], [0, -1.0], [0, 4.0], [0, 11.5]] },
    { width: 1.4, points: [[0, -8.0], [5, -8.0], [10, -8.0]] },
    { width: 1.2, points: [[10, -8.0], [14, -4.0]] },
    { width: 1.2, points: [[10, -8.0], [13, -13.0]] },
    { width: 1.3, points: [[0, -8.0], [-4, -7.5], [-8, -7.0]] },
    { width: 1.5, points: [[0, 4.0], [-8, 4.0], [-16, 4.0], [-19, 4.0]] },
    { width: 1.5, points: [[0, 4.0], [8, 6.0], [14, 8.0]] }
  ]);
  // Trilhas internas da vila
  beginObstacleRegistration('village');
  createPaths(villageRoot, [
    { width: 1.5, points: [[0, 20.0], [0, 26.0]] },
    { width: 1.3, points: [[0, 24.0], [6.5, 24.5]] },
    { width: 1.3, points: [[0, 24.0], [-6.5, 24.5]] }
  ]);
  beginObstacleRegistration('farm');

  rebuildFarmPlots(farmRoot, farmPlots, state.farmLevel);
  corral = createCorral(farmRoot, -8, -7, 5, 4.5, 'east');

  setAreaRoots({
    farm: farmRoot,
    cave: caveRoot,
    village: villageRoot,
    ground: groundMesh.userData.overworldDecor
  });
  forceArea(AREA.FARM);
  updateAreaBadge(getAreaLabel());

  bindInput();
  bindUI();
  bindPauseKey();

  state.season = seasonForDay(state.totalDays);
  applySeasonalWorldTint();

  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateUpgradesUI(state);
  updateGoalsUI(state, null);

  window.addEventListener('resize', onResize);

  showTitleScreen();
  refreshContinueButton();

  requestAnimationFrame(animate);
}

function bindInput() {
  renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
  bindPlayerInput(player, renderer.domElement);

  const TOOL_LONG_PRESS_MS = 400;
  document.querySelectorAll('.tool-btn').forEach(btn => {
    const tool = btn.dataset.tool;
    let pressTimer = null;
    let batchStarted = false;

    const clearPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    btn.addEventListener('pointerdown', (e) => {
      batchStarted = false;
      currentTool = tool;
      setActiveTool(tool);
      if (e.shiftKey) {
        batchStarted = true;
        startAction(tool);
        return;
      }
      pressTimer = setTimeout(() => {
        batchStarted = true;
        startAction(tool);
      }, TOOL_LONG_PRESS_MS);
    });
    btn.addEventListener('pointerup', () => {
      clearPress();
      if (batchStarted) stopAction();
    });
    btn.addEventListener('pointerleave', () => {
      clearPress();
      if (batchStarted) stopAction();
    });
    btn.addEventListener('pointercancel', () => {
      clearPress();
      if (batchStarted) stopAction();
    });
  });

  window.addEventListener('keydown', (e) => {
    if (appState !== APP_STATE.PLAYING) return;
    const openModal = document.querySelector('.modal:not(.hidden)');
    if (openModal) return;

    const toolHotkeys = { '1': 'plant', '2': 'water', '3': 'harvest', '4': 'weed' };
    if (toolHotkeys[e.key]) {
      currentTool = toolHotkeys[e.key];
      setActiveTool(currentTool);
      return;
    }

    if (e.key.toLowerCase() === 'e') {
      e.preventDefault();
      tryInteractNearby();
    }
    if (e.key.toLowerCase() === 'f') {
      feedMode = !feedMode;
      const feedToggle = document.getElementById('btn-feed');
      if (feedToggle) feedToggle.classList.toggle('active', feedMode);
      showNotification(feedMode ? 'Modo ração: E ou clique no animal para alimentar.' : 'Modo ração desligado.');
    }
    if (e.key.toLowerCase() === 'r') {
      tryRestAtHouse();
    }
    if (e.key.toLowerCase() === 'c') {
      tryCraftAtBarn();
    }
  });
}

function bindUI() {
  document.getElementById('btn-shop').addEventListener('click', () => toggleModal('shop-modal'));
  document.getElementById('btn-inventory').addEventListener('click', () => toggleModal('inventory-modal'));
  document.getElementById('btn-upgrades').addEventListener('click', () => toggleModal('upgrades-modal'));
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
  });
  document.querySelectorAll('.seed-btn').forEach(btn => {
    btn.addEventListener('click', () => buySeed(btn.dataset.seed));
  });
  document.querySelectorAll('.animal-btn').forEach(btn => {
    btn.addEventListener('click', () => buyAnimal(btn.dataset.animal));
  });
  document.getElementById('btn-refill-water').addEventListener('click', refillWater);
  document.getElementById('btn-upgrade-farm').addEventListener('click', upgradeFarm);
  document.getElementById('btn-upgrade-house').addEventListener('click', upgradeHouse);
  document.getElementById('btn-buy-car').addEventListener('click', buyCar);
  document.getElementById('btn-buy-well').addEventListener('click', buyWell);
  document.getElementById('btn-buy-artesian-well').addEventListener('click', buyArtesianWell);
  document.getElementById('btn-buy-fertilizer').addEventListener('click', buyFertilizer);
  document.getElementById('dialogue-close').addEventListener('click', hideDialogue);
  document.getElementById('btn-sleep').addEventListener('click', sleepUntilDawn);
  document.querySelectorAll('.decor-btn').forEach(btn => {
    btn.addEventListener('click', () => buyDecoration(btn.dataset.decor));
  });
  const craftBtn = document.getElementById('btn-craft-feed');
  if (craftBtn) craftBtn.addEventListener('click', () => {
    if (!craftFeed(state)) return showNotification(`Precisa de ${FEED_RECIPE.wheatCost}× Trigo.`);
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    showNotification(`Craftou ${FEED_RECIPE.feedGain}× Ração!`);
    playSfx('sell');
    maybeCheckMoneyMilestone();
  });
  const snackBtn = document.getElementById('btn-craft-snack');
  if (snackBtn) snackBtn.addEventListener('click', () => {
    if (!craftSnack(state)) return showNotification(`Precisa de Leite + Trigo (${SNACK_RECIPE.label}).`);
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    showNotification(`Lanche pronto! +${SNACK_RECIPE.energyGain} energia.`);
    playSfx('sell');
  });
  const yarnBtn = document.getElementById('btn-craft-yarn-gift');
  if (yarnBtn) yarnBtn.addEventListener('click', () => {
    if (!craftYarnGift(state)) return showNotification(`Precisa de ${YARN_GIFT_RECIPE.woolCost}× Lã.`);
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    showNotification(`Craftou ${YARN_GIFT_RECIPE.productKey}!`);
    playSfx('sell');
  });
  const restBtn = document.getElementById('btn-rest');
  if (restBtn) restBtn.addEventListener('click', tryRestAtHouse);
  const feedToggle = document.getElementById('btn-feed');
  if (feedToggle) feedToggle.addEventListener('click', () => {
    feedMode = !feedMode;
    feedToggle.classList.toggle('active', feedMode);
    showNotification(feedMode ? 'Modo ração ativo.' : 'Modo ração desligado.');
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeScale(Number(btn.dataset.speed)));
  });

  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-continue').addEventListener('click', () => continueGame(1));
  document.getElementById('btn-title-settings').addEventListener('click', () => openSettings(APP_STATE.TITLE));

  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-pause-settings').addEventListener('click', () => openSettings(APP_STATE.PAUSED));
  document.getElementById('btn-pause-save').addEventListener('click', () => toggleModal('save-modal'));
  document.getElementById('btn-quit-to-title').addEventListener('click', quitToTitle);

  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  bindSettingsInputs();

  document.querySelectorAll('#save-modal [data-slot]').forEach(row => {
    const slot = Number(row.dataset.slot);
    row.querySelector('.save-btn').addEventListener('click', () => saveCurrentGame(slot));
    row.querySelector('.load-btn').addEventListener('click', () => continueGame(slot));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteSaveSlot(slot));
    row.querySelector('.export-btn').addEventListener('click', () => window.farmSave.exportSave(slot));
    row.querySelector('.import-btn').addEventListener('click', () => importSaveSlot(slot));
  });
}

function bindSettingsInputs() {
  const musicSlider = document.getElementById('setting-music-volume');
  const sfxSlider = document.getElementById('setting-sfx-volume');
  const muteBtn = document.getElementById('setting-mute');
  musicSlider.addEventListener('input', () => {
    appSettings.audio.musicVolume = Number(musicSlider.value) / 100;
    applyAudioSettings(appSettings.audio);
    saveSettings(appSettings);
  });
  sfxSlider.addEventListener('input', () => {
    appSettings.audio.sfxVolume = Number(sfxSlider.value) / 100;
    applyAudioSettings(appSettings.audio);
    saveSettings(appSettings);
    playSfx('click');
  });
  muteBtn.addEventListener('click', () => {
    appSettings.audio.muted = !appSettings.audio.muted;
    applyAudioSettings(appSettings.audio);
    saveSettings(appSettings);
    updateSettingsUI();
  });

  document.querySelectorAll('[data-quality]').forEach(btn => {
    btn.addEventListener('click', () => {
      appSettings.graphics = applyQualityPreset(appSettings.graphics, btn.dataset.quality);
      applyGraphicsSettings(appSettings.graphics);
      saveSettings(appSettings);
      updateSettingsUI();
    });
  });

  document.getElementById('setting-shadows').addEventListener('change', (e) => {
    appSettings.graphics.shadows = e.target.checked;
    applyGraphicsSettings(appSettings.graphics);
    saveSettings(appSettings);
  });
  document.getElementById('setting-bloom').addEventListener('change', (e) => {
    appSettings.graphics.bloom = e.target.checked;
    applyGraphicsSettings(appSettings.graphics);
    saveSettings(appSettings);
  });
}

function bindPauseKey() {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
      document.getElementById('confirm-cancel')?.click();
      return;
    }

    if (appState === APP_STATE.SETTINGS) { closeSettings(); return; }

    const openModal = document.querySelector('.modal:not(.hidden):not(#title-screen):not(#pause-menu):not(#confirm-modal)');
    if (appState === APP_STATE.PLAYING && openModal) {
      openModal.classList.add('hidden');
      return;
    }
    if (appState === APP_STATE.PLAYING || appState === APP_STATE.PAUSED) togglePause();
  });
}

// --- Fluxo de tela (título / jogo / pausa / configurações) ---------------

function showTitleScreen() {
  appState = APP_STATE.TITLE;
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('controls').classList.add('hidden');
  document.getElementById('speed-controls').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => {
    if (m.id !== 'title-screen') m.classList.add('hidden');
  });
  hideDialogue();
}

function enterPlayingState() {
  appState = APP_STATE.PLAYING;
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('controls').classList.remove('hidden');
  document.getElementById('speed-controls').classList.remove('hidden');
  initAudio();
}

async function startNewGame() {
  initAudio();
  const proceed = () => {
    forceArea(AREA.FARM, () => {
      if (player) setPlayerPosition(player, 0, -4);
      updateAreaBadge(getAreaLabel());
    });
    enterPlayingState();
    showInitialGoal();
  };
  try {
    const slots = await window.farmSave.list();
    const hasAny = Object.values(slots).some(s => s.exists);
    if (hasAny) {
      const ok = await showConfirmDialog({
        title: 'Novo Jogo',
        message: 'Já existe progresso salvo. Começar um Novo Jogo não apaga os saves, mas o progresso atual não salvo será perdido.',
        confirmLabel: 'Começar',
        danger: false
      });
      if (!ok) return;
    }
    proceed();
  } catch {
    proceed();
  }
}

function showInitialGoal() {
  const startingGoal = getActiveGoal(state);
  if (startingGoal && startingGoal.id !== lastGoalId) {
    lastGoalId = startingGoal.id;
    showChapterIntro(startingGoal);
  }
}

async function continueGame(slot) {
  initAudio();
  const saved = await window.farmSave.load(slot);
  if (!saved) { showNotification('Nenhum save encontrado nesse slot.'); return; }

  restoreGame(saved);
  enterPlayingState();
  showNotification(`Save carregado (slot ${slot}).`);
}

function restoreGame(saved) {
  Object.assign(state, saved.state);
  state.seeds = saved.state.seeds;
  state.harvested = saved.state.harvested;
  state.products = { ...createGameState().products, ...(saved.state.products || {}) };
  state.materials = { ...createGameState().materials, ...(saved.state.materials || {}) };
  state.npcFlags = saved.state.npcFlags;
  state.goalsProgress = saved.state.goalsProgress;
  state.completedGoals = saved.state.completedGoals;
  state.decorations = saved.state.decorations || createGameState().decorations;
  state.feed = saved.state.feed ?? 0;
  state.supplierOrder = saved.state.supplierOrder ?? null;
  state.carSaleBonus = saved.state.carSaleBonus ?? (saved.state.hasCar ? CAR_SALE_BONUS : 0);
  state.restedToday = !!saved.state.restedToday;
  state.lastMoneyMilestone = saved.state.lastMoneyMilestone ?? 0;

  state.animals.slice().forEach(a => removeAnimal(scene, state.animals, a));
  state.animals = [];
  (saved.animals || []).forEach(a => {
    const cfg = state.animalConfigs[a.type];
    const animal = spawnAnimal(farmRoot, a.type, cfg, corral.bounds);
    animal.isOutside = a.isOutside;
    animal.productTimer = a.productTimer;
    animal.productReady = !!a.productReady;
    state.animals.push(animal);
  });

  crops.forEach(c => { if (c.parent) c.parent.remove(c); });
  crops = [];
  rebuildFarmPlots(farmRoot, farmPlots, state.farmLevel);
  (saved.plots || []).forEach((plotData, i) => {
    const plot = farmPlots[i];
    if (!plot) return;
    if (plotData.hasWeed) maybeSpawnWeed(plot);
    if (plotData.hasCrop) {
      const cropObj = createCropMesh(plotData.seedType, plotData.growthDuration);
      cropObj.userData.growthProgress = plotData.growthProgress;
      cropObj.userData.watered = plotData.watered;
      cropObj.userData.fertilized = plotData.fertilized;
      cropObj.userData.status = plotData.status;
      plot.add(cropObj);
      updateCropVisualState(cropObj);
      plot.userData.hasCrop = true;
      plot.userData.cropRef = cropObj;
      crops.push(cropObj);
      setPlotWetVisual(plot, plotData.watered);
      if (plotData.hasCrop && plotData.status === 'growing' && !plotData.watered) {
        setPlotNeedsWaterHint(plot, true);
      }
    }
  });

  restoreWorldVisuals();
  applySeasonalWorldTint();

  if (saved.runtime) {
    worldTime = saved.runtime.worldTime ?? worldTime;
    timeScale = saved.runtime.timeScale ?? timeScale;
    wasDay = saved.runtime.wasDay ?? wasDay;
    wolfRiskTimer = saved.runtime.wolfRiskTimer ?? 0;
    weedSpawnTimer = saved.runtime.weedSpawnTimer ?? 0;
    goalCheckTimer = saved.runtime.goalCheckTimer ?? 0;
    lastGoalId = saved.runtime.lastGoalId ?? null;
    winterStreakBroken = !!saved.runtime.winterStreakBroken;
    if (player && saved.runtime.playerX != null) {
      const areaId = saved.runtime.area || AREA.FARM;
      forceArea(areaId, () => {
        setPlayerPosition(player, saved.runtime.playerX, saved.runtime.playerZ ?? -4);
        updateAreaBadge(getAreaLabel(areaId));
      });
      player.cameraYaw = saved.runtime.cameraYaw ?? 0;
      player.cameraPitch = saved.runtime.cameraPitch ?? 0.42;
    }
  }
  state.season = seasonForDay(state.totalDays);

  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateUpgradesUI(state);
  updateGoalsUI(state, getActiveGoal(state));
}

function clearDecorationMeshes() {
  decorationMeshes.forEach(m => {
    if (m.parent) m.parent.remove(m);
  });
  decorationMeshes = [];
}

function restoreWorldVisuals() {
  buildHouse(houseGroup, state.houseLevel);
  buildCar(carGroup, state.hasCar);

  if (wellGroup) { scene.remove(wellGroup); if (farmRoot) farmRoot.remove(wellGroup); wellGroup = null; }
  if (state.hasWell) wellGroup = createWell(farmRoot || scene);

  if (artesianWellGroup) { scene.remove(artesianWellGroup); if (farmRoot) farmRoot.remove(artesianWellGroup); artesianWellGroup = null; }
  if (state.hasArtesianWell) artesianWellGroup = createArtesianWell(farmRoot || scene);

  clearDecorationMeshes();
  const d = state.decorations;
  const decorParent = farmRoot || scene;
  for (let i = 0; i < (d.flowerBeds || 0); i++) {
    const m = createDecoration(decorParent, 'flowerBed', i);
    if (m) decorationMeshes.push(m);
  }
  for (let i = 0; i < (d.barrels || 0); i++) {
    const m = createDecoration(decorParent, 'barrel', i);
    if (m) decorationMeshes.push(m);
  }
  if (d.scarecrow) {
    const m = createDecoration(decorParent, 'scarecrow', 0);
    if (m) decorationMeshes.push(m);
  }
  if (d.fancyFence) {
    const m = createDecoration(decorParent, 'fancyFence', 0);
    if (m) decorationMeshes.push(m);
  }
}

function togglePause() {
  if (appState === APP_STATE.PLAYING) {
    appState = APP_STATE.PAUSED;
    document.getElementById('pause-menu').classList.remove('hidden');
  } else if (appState === APP_STATE.PAUSED) {
    appState = APP_STATE.PLAYING;
    document.getElementById('pause-menu').classList.add('hidden');
  }
}

async function quitToTitle() {
  const ok = await showConfirmDialog({
    title: 'Menu Principal',
    message: 'Voltar ao Menu Principal? Progresso não salvo será perdido.',
    confirmLabel: 'Voltar',
    danger: true
  });
  if (!ok) return;
  document.getElementById('pause-menu').classList.add('hidden');
  showTitleScreen();
  refreshContinueButton();
}

function openSettings(fromState) {
  previousAppState = fromState;
  appState = APP_STATE.SETTINGS;
  document.getElementById('settings-modal').classList.remove('hidden');
  updateSettingsUI();
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
  appState = previousAppState || APP_STATE.TITLE;
}

function updateSettingsUI() {
  document.getElementById('setting-music-volume').value = Math.round(appSettings.audio.musicVolume * 100);
  document.getElementById('setting-sfx-volume').value = Math.round(appSettings.audio.sfxVolume * 100);
  document.getElementById('setting-mute').textContent = appSettings.audio.muted ? 'Reativar Som' : 'Silenciar';
  document.getElementById('setting-shadows').checked = appSettings.graphics.shadows;
  document.getElementById('setting-bloom').checked = appSettings.graphics.bloom;
  document.querySelectorAll('[data-quality]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.quality === appSettings.graphics.quality);
  });
}

function applyGraphicsSettings(graphics) {
  if (!renderer) return;
  renderer.shadowMap.enabled = graphics.shadows;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, graphics.pixelRatioCap));
  if (bloomPass) bloomPass.enabled = graphics.bloom;
  applyRenderScale(graphics.renderScale);
}

function applyRenderScale(scale) {
  const w = window.innerWidth * scale;
  const h = window.innerHeight * scale;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
}

// --- Save / Load ----------------------------------------------------------

async function refreshContinueButton() {
  const slots = await window.farmSave.list();
  const hasAny = Object.values(slots).some(s => s.exists);
  document.getElementById('btn-continue').disabled = !hasAny;
  refreshSaveModalUI(slots);
}

async function refreshSaveModalUI(slots) {
  const data = slots || await window.farmSave.list();
  Object.entries(data).forEach(([slot, info]) => {
    const row = document.querySelector(`#save-modal [data-slot="${slot}"]`);
    if (!row) return;
    const label = row.querySelector('.save-slot-info');
    if (info.exists) {
      const date = new Date(info.savedAt).toLocaleString('pt-BR');
      label.textContent = `R$ ${info.money} — Dia ${info.totalDays} — ${date}`;
    } else {
      label.textContent = 'Vazio';
    }
  });
}

function saveCurrentGame(slot) {
  const runtime = getRuntimeSnapshot({
    worldTime, timeScale, wasDay, wolfRiskTimer, weedSpawnTimer, goalCheckTimer, lastGoalId, winterStreakBroken,
    playerX: player?.mesh.position.x ?? 0,
    playerZ: player?.mesh.position.z ?? -4,
    cameraYaw: player?.cameraYaw ?? 0,
    cameraPitch: player?.cameraPitch ?? 0.42,
    area: getCurrentArea()
  });
  const payload = serializeGame(state, farmPlots, runtime);
  window.farmSave.save(slot, payload).then(() => {
    showNotification(`Jogo salvo no slot ${slot}!`);
    refreshSaveModalUI();
    refreshContinueButton();
  });
}

async function deleteSaveSlot(slot) {
  const ok = await showConfirmDialog({
    title: 'Apagar save',
    message: `Apagar o save do slot ${slot}? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Apagar',
    danger: true
  });
  if (!ok) return;
  window.farmSave.deleteSave(slot).then(() => {
    showNotification(`Save do slot ${slot} apagado.`);
    refreshSaveModalUI();
    refreshContinueButton();
  });
}

function importSaveSlot(slot) {
  window.farmSave.importSave(slot).then(ok => {
    if (ok) { showNotification(`Save importado para o slot ${slot}.`); refreshSaveModalUI(); refreshContinueButton(); }
  });
}

function sleepUntilDawn() {
  const hours = Math.floor(worldTime / 60);
  if (hours >= 6 && hours < 19) { showNotification('Só é possível dormir à noite.'); return; }
  worldTime = 6 * 60;
  state.energy = state.maxEnergy;
  state.restedToday = false;
  updateHUD(state);
  showNotification('Você dormiu até o amanhecer. Energia restaurada.');
  playSfx('notification');
}

function dryGrowingCropsAtDawn() {
  let dried = 0;
  farmPlots.forEach(plot => {
    if (!plot.userData.hasCrop || !plot.userData.cropRef) return;
    const crop = plot.userData.cropRef;
    if (crop.userData.status !== 'growing') {
      setPlotNeedsWaterHint(plot, false);
      return;
    }
    crop.userData.watered = false;
    setPlotWetVisual(plot, false);
    setPlotNeedsWaterHint(plot, true);
    dried++;
  });
  if (dried > 0) showNotification(`Amanheceu seco: ${dried} plantação(ões) precisam de água.`);
}

function applySeasonalWorldTint() {
  const palette = skyPaletteForSeason(state.season);
  if (groundMesh) {
    const tint = new THREE.Color(palette.grass).lerp(new THREE.Color(0xffffff), 0.45);
    groundMesh.material.color.copy(tint);
    if (groundMesh.userData.collarMat) groundMesh.userData.collarMat.color.setHex(palette.grass);
  }
  if (treesGroup) {
    treesGroup.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      if (obj.userData?.isFoliage && obj.material.color) {
        obj.material.color.setHex(palette.foliage ?? obj.userData.baseFoliage ?? palette.grass);
      }
      if (obj.userData?.isSnowCap) {
        obj.visible = state.season === 'Inverno';
      }
    });
  }
  if (groundMesh?.userData?.mountainGroup) {
    groundMesh.userData.mountainGroup.traverse(obj => {
      if (obj.userData?.isSnowCap) obj.visible = state.season === 'Inverno';
    });
  }
}

function setTimeScale(scale) {
  timeScale = scale;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.speed) === scale);
  });
}

function toggleModal(id) {
  const modal = document.getElementById(id);
  modal.classList.toggle('hidden');
  if (id === 'shop-modal' || id === 'inventory-modal') {
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  }
}

function requireNear(targetPos, label) {
  if (!player || isInRange(player.mesh.position, targetPos, PLAYER_INTERACT_RANGE)) return true;
  showNotification(`Chegue mais perto ${label ? `de ${label}` : ''}.`);
  playSfx('error');
  return false;
}

async function tryUsePortal() {
  if (!player || isTransitioning()) return false;
  const portal = nearestPortal(player.mesh.position);
  if (!portal) return false;
  const ok = await transitionToArea(portal.to, () => {
    setPlayerPosition(player, portal.spawn.x, portal.spawn.z);
    updateAreaBadge(getAreaLabel(portal.to));
    // Na caverna: névoa mais fechada e luz mais baixa (sensação de interior)
    if (portal.to === AREA.CAVE) {
      scene.fog.density = 0.045;
      if (ambientLight) ambientLight.intensity = Math.min(ambientLight.intensity, 0.22);
    }
  });
  if (ok) {
    showNotification(getAreaLabel(portal.to));
    playSfx('notification');
  }
  return ok;
}

function tryInteractNearby() {
  const pos = player.mesh.position;
  const area = getCurrentArea();

  if (nearestPortal(pos)) {
    tryUsePortal();
    return;
  }

  if (area === AREA.CAVE) {
    const mineNode = nearestMineNode(pos);
    if (mineNode) {
      tryMineNearby(mineNode);
      return;
    }
    showNotification('Nada próximo para minerar (E).');
    return;
  }

  if (area === AREA.VILLAGE) {
    const npc = nearestInRange(pos, [merchantNpc, supplierNpc, govNpc]);
    if (npc) {
      talkToNpc(npc.userData.npcId);
      return;
    }
    showNotification('Nada próximo para interagir (E).');
    return;
  }

  // Fazenda (hub)
  if (isInRange(pos, BARN_POSITION, 4.0)) {
    tryCraftAtBarn();
    return;
  }

  if (isInRange(pos, HOUSE_POSITION, HOUSE_REST_RANGE)) {
    tryRestAtHouse();
    return;
  }

  if (isNearDock(pos)) {
    tryFishAtDock();
    return;
  }

  const animalMesh = nearestInRange(pos, state.animals.map(a => a.mesh));
  if (animalMesh?.userData.animalRef) {
    handleAnimalInteract(animalMesh.userData.animalRef);
    return;
  }

  let nearestPlot = null;
  let nearestDist = PLAYER_INTERACT_RANGE;
  farmPlots.forEach(plot => {
    const wp = new THREE.Vector3();
    plot.getWorldPosition(wp);
    const d = Math.hypot(pos.x - wp.x, pos.z - wp.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearestPlot = plot;
    }
  });
  if (nearestPlot) {
    smartActionOnPlot(nearestPlot);
    return;
  }

  showNotification('Nada próximo para interagir (E).');
}

function tryMineNearby(node) {
  const result = tryMineNode(state, node);
  if (!result.ok) {
    if (result.reason === 'energy') return showNotification('Energia insuficiente para minerar.');
    if (result.reason === 'cooldown') return showNotification('Esse veio ainda está se regenerando.');
    return showNotification('Não foi possível minerar.');
  }
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateHUD(state);
  showNotification(`Minerou 1× ${result.type}!`);
  playSfx('harvest');
}

function tryFishAtDock() {
  if (isFishing()) return showNotification('Aguarde... pescando.');
  const result = startFishing(state);
  if (!result.ok) {
    if (result.reason === 'energy') return showNotification('Energia insuficiente para pescar.');
    return showNotification('Não foi possível pescar agora.');
  }
  updateHUD(state);
  showNotification('Jogou a linha... aguarde.');
  playSfx('water');
}

function smartActionOnPlot(plot) {
  const data = plot.userData;
  if (data.hasWeed) {
    currentTool = 'weed';
    setActiveTool('weed');
    return executeActionOnPlot(plot);
  }
  if (data.hasCrop && data.cropRef?.userData.status === 'ready') {
    currentTool = 'harvest';
    setActiveTool('harvest');
    return executeActionOnPlot(plot);
  }
  if (data.hasCrop && data.cropRef && !data.cropRef.userData.watered) {
    currentTool = 'water';
    setActiveTool('water');
    return executeActionOnPlot(plot);
  }
  if (!data.hasCrop) {
    currentTool = 'plant';
    setActiveTool('plant');
    return executeActionOnPlot(plot);
  }
  if (data.hasCrop && data.cropRef?.userData.watered && data.cropRef.userData.status === 'growing') {
    currentTool = 'water';
    setActiveTool('water');
    return executeActionOnPlot(plot);
  }
  showNotification('Nada a fazer neste canteiro agora.');
  return false;
}

function tryCraftAtBarn() {
  if (!isInRange(player.mesh.position, BARN_POSITION, 4.0)) {
    return showNotification('Vá até o celeiro para craftar ração (C / E).');
  }
  if (!canCraftFeed(state)) return showNotification(`Precisa de ${FEED_RECIPE.wheatCost}× Trigo colhido.`);
  craftFeed(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateHUD(state);
  showNotification(`Craftou ração no celeiro! (${FEED_RECIPE.label})`);
  playSfx('sell');
}

function tryRestAtHouse() {
  if (!isInRange(player.mesh.position, HOUSE_POSITION, HOUSE_REST_RANGE)) {
    return showNotification('Chegue perto da casa para descansar (R).');
  }
  if (state.restedToday) return showNotification('Você já descansou hoje.');
  if (state.energy >= state.maxEnergy) return showNotification('Energia já está cheia.');
  state.energy = Math.min(state.maxEnergy, state.energy + REST_ENERGY_GAIN);
  state.restedToday = true;
  updateHUD(state);
  showNotification(`Descansou na casa. +${REST_ENERGY_GAIN} energia.`);
  playSfx('notification');
}

function handleAnimalInteract(animal) {
  if (feedMode) {
    const result = feedAnimal(state, animal);
    if (!result.ok) return showNotification(result.reason);
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    showNotification(result.produced
      ? `${animal.type} alimentada(o)! Produto pronto — colete com E.`
      : `${animal.type} alimentada(o)! Produção acelerada.`);
    playSfx(result.produced ? 'harvest' : 'plant');
    return;
  }
  if (animal.productReady) {
    if (collectReadyProduct(state, animal)) {
      updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
      showNotification(`Coletou 1× ${animal.product}!`);
      playSfx('harvest');
    }
    return;
  }
  toggleAnimalOutside(animal);
}

function onCanvasPointerDown(event) {
  if (event.button === 1 || event.button === 2) return;
  if (isTransitioning()) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const area = getCurrentArea();

  if (area === AREA.FARM) {
    const animalMeshes = state.animals.map(a => a.mesh);
    const animalHits = raycaster.intersectObjects(animalMeshes, true);
    if (animalHits.length > 0) {
      let obj = animalHits[0].object;
      while (obj && !obj.userData.animalRef) obj = obj.parent;
      if (obj && obj.userData.animalRef) {
        if (!requireNear(obj.position, 'do animal')) return;
        handleAnimalInteract(obj.userData.animalRef);
        return;
      }
    }

    const intersects = raycaster.intersectObjects(farmPlots, true);
    if (intersects.length === 0) return;

    let obj = intersects[0].object;
    while (obj && !obj.userData.isPlot) obj = obj.parent;
    if (!obj || !obj.userData.isPlot) return;

    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    if (!requireNear(wp, 'do canteiro')) return;

    targetPlot = obj;
    isBatchHolding = false;
    isHolding = true;
    holdStartTime = performance.now();
    document.getElementById('action-progress-container').classList.remove('hidden');
    const names = { plant: 'Plantando', water: 'Regando', harvest: 'Colhendo', weed: 'Arrancando' };
    document.getElementById('action-text').textContent = `${names[currentTool]}...`;
    return;
  }

  if (area === AREA.VILLAGE) {
    const npcHits = raycaster.intersectObjects([merchantNpc, supplierNpc, govNpc], true);
    if (npcHits.length > 0) {
      let obj = npcHits[0].object;
      while (obj && !obj.userData.npcId) obj = obj.parent;
      if (obj && obj.userData.npcId && obj.visible) {
        if (!requireNear(obj.position, 'do personagem')) return;
        talkToNpc(obj.userData.npcId);
      }
    }
  }
}

function ringAlarm(opts = {}) {
  if (alarmRinging) return;
  alarmRinging = true;
  alarmBellSwingTime = 0;
  playSfx('bell');

  const inVillage = getCurrentArea() === AREA.VILLAGE;
  [merchantNpc, supplierNpc, govNpc].forEach(npc => {
    if (npc.userData.tookShelter) return;
    if (inVillage) {
      npc.userData.fleeing = true;
      npc.userData.fleeTarget = npc.userData.homeShelter || { x: VILLAGE_PLAZA.x, z: VILLAGE_PLAZA.z };
    } else {
      // Fora da vila: abriga instantaneamente (sem animar em instância oculta)
      const home = npc.userData.homeShelter;
      if (home) npc.position.set(home.x, 0, home.z);
      npc.userData.fleeing = false;
      npc.userData.tookShelter = true;
      npc.visible = false;
    }
  });

  if (!opts.quiet) {
    showNotification('O sino da vila tocou! Os moradores correm para abrigo.');
  }
}

function toggleAnimalOutside(animal) {
  animal.isOutside = !animal.isOutside;
  animal.wanderTarget = null;
  showNotification(animal.isOutside ? `${animal.type} solta(o) do curral.` : `${animal.type} recolhida(o) ao curral.`);
}

function startAction(tool) {
  currentTool = tool;
  setActiveTool(tool);

  isBatchHolding = true;
  isHolding = true;
  holdStartTime = performance.now();
  document.getElementById('action-progress-container').classList.remove('hidden');
  const names = { plant: 'Plantando tudo', water: 'Regando tudo', harvest: 'Colhendo tudo', weed: 'Arrancando tudo' };
  document.getElementById('action-text').textContent = `${names[tool]}...`;
}

function stopAction() {
  if (!isHolding) return;
  isHolding = false;
  isBatchHolding = false;
  document.getElementById('action-progress-container').classList.add('hidden');
  document.getElementById('action-bar').style.width = '0%';
}

function executeActionOnPlot(plot, { silent = false } = {}) {
  const data = plot.userData;
  const fail = (msg) => { if (!silent) { showNotification(msg); playSfx('error'); } return false; };

  if (state.energy < ENERGY_COST[currentTool]) {
    return fail('Sem energia suficiente! Descanse até o próximo dia.');
  }

  if (currentTool === 'plant') {
    if (data.hasCrop) return fail('Este bloco já tem uma plantação!');
    if (state.seeds[state.activeSeedType] <= 0) {
      return fail(`Sem sementes de ${state.activeSeedType}! Compre na loja.`);
    }
    if (!isPlantableInSeason(state.seedConfigs[state.activeSeedType], state.season)) {
      return fail(`${state.activeSeedType} não pode ser plantada no(a) ${state.season}!`);
    }

    state.seeds[state.activeSeedType]--;
    state.energy -= ENERGY_COST.plant;
    const cropObj = createCropMesh(state.activeSeedType, state.seedConfigs[state.activeSeedType].growthTime);
    plot.add(cropObj);
    updateCropVisualState(cropObj);
    data.hasCrop = true;
    data.cropRef = cropObj;
    crops.push(cropObj);

    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    if (!silent) { showNotification(`Plantou ${state.activeSeedType}!`); playSfx('plant'); }
    return true;

  } else if (currentTool === 'water') {
    if (!data.hasCrop) return fail('Não há planta neste bloco.');
    const cropData = data.cropRef.userData;

    if (cropData.watered) {
      if (cropData.status !== 'growing') return fail('Esta planta já está irrigada!');
      if (cropData.fertilized) return fail('Esta planta já está irrigada e fertilizada!');
      if (state.fertilizer <= 0) return fail('Esta planta já está irrigada! (sem fertilizante em estoque)');
      state.fertilizer--;
      cropData.fertilized = true;
      updateUpgradesUI(state);
      if (!silent) showNotification('Fertilizante aplicado! Crescimento acelerado.');
      return true;
    }

    if (state.water < WATER_PER_USE) return fail('Água esgotada! Recarregue na loja.');

    state.water -= WATER_PER_USE;
    state.energy -= ENERGY_COST.water;
    cropData.watered = true;
    setPlotWetVisual(plot, true);
    setPlotNeedsWaterHint(plot, false);
    updateHUD(state);
    if (!silent) { showNotification('Planta regada!'); playSfx('water'); }
    return true;

  } else if (currentTool === 'harvest') {
    if (!data.hasCrop) return fail('Não há planta neste bloco.');
    const cropData = data.cropRef.userData;
    if (cropData.status !== 'ready') return fail('A plantação ainda não está madura!');

    const sType = cropData.seedType;
    state.harvested[sType]++;
    state.goalsProgress.totalHarvested++;
    state.energy -= ENERGY_COST.harvest;

    plot.remove(data.cropRef);
    crops = crops.filter(c => c !== data.cropRef);
    data.hasCrop = false;
    data.cropRef = null;
    setPlotWetVisual(plot, false);
    setPlotNeedsWaterHint(plot, false);

    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    if (!silent) { showNotification(`Colheu 1x ${sType}!`); playSfx('harvest'); }
    return true;

  } else if (currentTool === 'weed') {
    if (!data.hasWeed) return fail('Não há erva daninha neste bloco.');
    state.energy -= ENERGY_COST.weed;
    updateHUD(state);
    removeWeed(plot);
    if (!silent) { showNotification('Erva daninha arrancada!'); playSfx('weed'); }
    return true;
  }
  return false;
}

function executeActionOnAllPlots() {
  let count = 0;
  farmPlots.forEach(plot => {
    if (executeActionOnPlot(plot, { silent: true })) count++;
  });

  const names = { plant: 'Plantou', water: 'Regou', harvest: 'Colheu', weed: 'Arrancou erva daninha' };
  if (count > 0) {
    showNotification(`${names[currentTool]} em ${count} bloco${count > 1 ? 's' : ''}!`);
  } else {
    const emptyReasons = {
      plant: 'Nenhum bloco livre ou sem sementes.',
      water: 'Nenhuma planta precisando de água.',
      harvest: 'Nenhuma plantação madura para colher.',
      weed: 'Nenhuma erva daninha para arrancar.'
    };
    showNotification(emptyReasons[currentTool]);
  }
}

function buySeed(type) {
  const cost = seedCostFor(state, type);
  if (state.money < cost) return showNotification('Dinheiro insuficiente!');
  state.money -= cost;
  state.seeds[type]++;
  state.activeSeedType = type;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Comprou semente de ${type}! (R$ ${cost})`);
  maybeCheckMoneyMilestone();
}

function selectActiveSeed(type) {
  state.activeSeedType = type;
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Semente ativa: ${type}`);
}

function sellCrop(type) {
  if (state.harvested[type] <= 0) return;
  const price = Math.round(state.seedConfigs[type].sell * (1 + effectiveSaleBonus(state)));
  state.harvested[type]--;
  state.money += price;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Vendeu 1x ${type} por R$ ${price}!`);
  maybeCheckMoneyMilestone();
}

function sellProduct(type) {
  const bonus = effectiveSaleBonus(state);

  if (['Pedra', 'Minerio', 'Carvao'].includes(type)) {
    if ((state.materials?.[type] || 0) <= 0) return;
    const price = Math.round((MATERIAL_SELL[type] || 4) * (1 + bonus));
    state.materials[type]--;
    state.money += price;
    updateHUD(state);
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    showNotification(`Vendeu 1x ${type} por R$ ${price}!`);
    maybeCheckMoneyMilestone();
    return;
  }

  if ((state.products[type] || 0) <= 0) return;
  const animalType = Object.keys(state.animalConfigs).find(a => state.animalConfigs[a].product === type);
  let price;
  if (animalType) {
    price = Math.round(state.animalConfigs[animalType].sell * (1 + bonus));
  } else if (type === YARN_GIFT_RECIPE.productKey) {
    price = Math.round(40 * (1 + bonus));
  } else if (type.startsWith('Peixe')) {
    price = fishSellPrice(type, bonus);
  } else {
    price = 10;
  }
  state.products[type]--;
  state.money += price;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Vendeu 1x ${type} por R$ ${price}!`);
  maybeCheckMoneyMilestone();
}

function maybeCheckMoneyMilestone() {
  for (const amount of MONEY_MILESTONES) {
    if (state.money >= amount && state.lastMoneyMilestone < amount) {
      state.lastMoneyMilestone = amount;
      showDialogue('Fazendeiro', farmerLine('moneyMilestone', amount));
      break;
    }
  }
}

function buyAnimal(type) {
  const cfg = state.animalConfigs[type];
  if (state.animals.length >= state.maxAnimals) return showNotification(`Curral cheio! Máximo de ${state.maxAnimals} animais.`);
  if (state.money < cfg.cost) return showNotification(`Necessário R$ ${cfg.cost}`);
  state.money -= cfg.cost;
  const animal = spawnAnimal(farmRoot, type, cfg, corral.bounds);
  state.animals.push(animal);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification(`Comprou 1x ${type}!`);
}

function refillWater() {
  if (state.money < WATER_REFILL_COST) return showNotification('Dinheiro insuficiente!');
  state.money -= WATER_REFILL_COST;
  state.water = state.maxWater;
  updateHUD(state);
  showNotification('Água recarregada!');
}

function upgradeFarm() {
  if (state.farmLevel >= 3) return showNotification('Fazenda já no nível máximo!');
  const cost = FARM_UPGRADE_COSTS[state.farmLevel];
  if (state.money < cost) return showNotification(`Necessário R$ ${cost}`);
  state.money -= cost;
  state.farmLevel++;
  crops = crops.filter(c => farmPlots.some(p => p.userData.cropRef === c));
  rebuildFarmPlots(farmRoot, farmPlots, state.farmLevel);
  targetPlot = null;
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification(`Fazenda expandida para nível ${state.farmLevel}!`);
}

function upgradeHouse() {
  if (state.houseLevel >= 2) return showNotification('Casa já reformada ao máximo!');
  if (state.money < HOUSE_UPGRADE_COST) return showNotification(`Necessário R$ ${HOUSE_UPGRADE_COST}`);
  state.money -= HOUSE_UPGRADE_COST;
  state.houseLevel++;
  state.maxAnimals += 2;
  buildHouse(houseGroup, state.houseLevel);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification('Casa reformada com sucesso! +2 vagas no curral.');
}

function buyCar() {
  if (state.hasCar) return showNotification('Você já possui um veículo!');
  if (state.money < CAR_COST) return showNotification(`Necessário R$ ${CAR_COST}`);
  state.money -= CAR_COST;
  state.hasCar = true;
  state.carSaleBonus = CAR_SALE_BONUS;
  buildCar(carGroup, true);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification(`Picape adquirida! +${Math.round(CAR_SALE_BONUS * 100)}% nas vendas.`);
}

function buyWell() {
  if (state.hasWell) return showNotification('Você já possui um poço!');
  if (state.money < WELL_COST) return showNotification(`Necessário R$ ${WELL_COST}`);
  state.money -= WELL_COST;
  state.hasWell = true;
  state.maxWater += 60;
  wellGroup = createWell(farmRoot);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification('Poço construído! +60 de capacidade máxima de água.');
}

function buyFertilizer() {
  if (state.money < FERTILIZER_COST) return showNotification('Dinheiro insuficiente!');
  state.money -= FERTILIZER_COST;
  state.fertilizer++;
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification('Comprou 1x Fertilizante! Use a ferramenta Plantar/Regar num bloco crescendo para aplicar.');
}

function advanceSeasonIfNeeded() {
  const newSeason = seasonForDay(state.totalDays);
  state.dayOfSeason = dayOfSeasonFor(state.totalDays);

  if (newSeason !== state.season) {
    const wasWinter = state.season === 'Inverno';
    state.season = newSeason;
    updateHUD(state);
    showNotification(`A estação virou: ${state.season}!`);
    showDialogue('Fazendeiro', farmerLine('seasonChange', state.season));

    if (state.season === 'Inverno') {
      winterStreakBroken = false;
      showDialogue('Fazendeiro', farmerLine('winterStart'));
    }
    if (wasWinter) {
      if (!winterStreakBroken) state.goalsProgress.seasonsSurvived++;
    }

    const palette = skyPaletteForSeason(state.season);
    if (groundMesh) {
      const tint = new THREE.Color(palette.grass).lerp(new THREE.Color(0xffffff), 0.45);
      groundMesh.material.color.copy(tint);
      if (groundMesh.userData.collarMat) groundMesh.userData.collarMat.color.setHex(palette.grass);
    }
    applySeasonalWorldTint();
  }
}

function talkToNpc(npcId) {
  giftTargetNpc = npcId;
  const giftOpts = { giftLabel: 'Dar presente', onGift: () => openGiftModal(npcId), friendshipInfo: friendshipInfoFor(npcId) };

  if (npcId === 'merchant') {
    const order = state.specialOrder;
    if (order) {
      const reward = orderRewardFor(state, order);
      showDialogue(MERCHANT_NAME, order.text, {
        actionLabel: `Entregar (+R$ ${reward})`,
        onAction: () => deliverSpecialOrder(),
        ...giftOpts
      });
    } else {
      showDialogue(MERCHANT_NAME, randomMerchantLine(), giftOpts);
    }
  } else if (npcId === 'supplier') {
    const order = state.supplierOrder;
    if (order) {
      showDialogue(SUPPLIER_NAME, order.text, {
        actionLabel: `Entregar (+R$ ${order.reward})`,
        onAction: () => deliverSupplierOrder(),
        ...giftOpts
      });
    } else {
      showDialogue(SUPPLIER_NAME, randomSupplierLine(), giftOpts);
    }
  } else if (npcId === 'gov') {
    if (state.govAuthorization) {
      showDialogue(GOV_OFFICIAL_NAME, randomGovAuthorizedLine(), giftOpts);
    } else {
      const cost = govAuthCostFor(state);
      showDialogue(GOV_OFFICIAL_NAME, govAuthorizationOffer(cost), {
        actionLabel: `Pagar taxa (R$ ${cost})`,
        onAction: () => payGovAuthorization(),
        ...giftOpts
      });
    }
  }
}

function friendshipInfoFor(npcId) {
  const points = state.npcFlags[npcId].friendship;
  const next = FRIENDSHIP_MILESTONES.find(m => m > points);
  return { points, nextMilestone: next || null };
}

function applyFriendshipGain(npcId, amount) {
  const flags = state.npcFlags[npcId];
  const before = flags.friendship;
  flags.friendship += amount;
  const milestone = checkFriendshipMilestones(before, flags.friendship, FRIENDSHIP_MILESTONES);
  if (milestone) {
    const npcName = npcId === 'merchant' ? MERCHANT_NAME : npcId === 'supplier' ? SUPPLIER_NAME : GOV_OFFICIAL_NAME;
    const hint = friendshipRewardHint(npcId, milestone);
    showNotification(`${npcName} — amizade ${milestone}! ${hint}`);
    updateUpgradesUI(state);
  }
}

function openGiftModal(npcId) {
  giftTargetNpc = npcId;
  const container = document.getElementById('gift-list');
  container.innerHTML = '';

  const addRow = (type, count, isProduct) => {
    if (count <= 0) return;
    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `<div><strong>${type}</strong><br><span class="inv-row-meta">Em estoque: ${count}</span></div>
      <button class="gift-btn">Dar de presente</button>`;
    row.querySelector('.gift-btn').addEventListener('click', () => giveGift(type, isProduct));
    container.appendChild(row);
  };
  Object.entries(state.harvested).forEach(([type, count]) => addRow(type, count, false));
  Object.entries(state.products).forEach(([type, count]) => addRow(type, count, true));

  if (!container.children.length) {
    container.innerHTML = '<p class="goal-hint">Você não tem itens para dar de presente.</p>';
  }

  document.getElementById('gift-modal').classList.remove('hidden');
}

function giveGift(itemType, isProduct) {
  const store = isProduct ? state.products : state.harvested;
  if (store[itemType] <= 0) return;
  store[itemType]--;
  applyFriendshipGain(giftTargetNpc, FRIENDSHIP_PER_GIFT);
  document.getElementById('gift-modal').classList.add('hidden');
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification('Presente entregue! Amizade aumentou.');
  playSfx('notification');
}

function buyDecoration(type) {
  const cost = DECORATION_COSTS[type];
  if (state.money < cost) return showNotification(`Necessário R$ ${cost}`);

  if (type === 'flowerBeds') {
    if (state.decorations.flowerBeds >= MAX_FLOWER_BEDS) return showNotification('Máximo de canteiros de flores atingido!');
    state.money -= cost;
    state.decorations.flowerBeds++;
    const m = createDecoration(farmRoot, 'flowerBed', state.decorations.flowerBeds - 1);
    if (m) decorationMeshes.push(m);
  } else if (type === 'barrels') {
    if (state.decorations.barrels >= MAX_BARRELS) return showNotification('Máximo de barris atingido!');
    state.money -= cost;
    state.decorations.barrels++;
    const m = createDecoration(farmRoot, 'barrel', state.decorations.barrels - 1);
    if (m) decorationMeshes.push(m);
  } else if (type === 'scarecrow') {
    if (state.decorations.scarecrow) return showNotification('Você já tem um espantalho!');
    state.money -= cost;
    state.decorations.scarecrow = true;
    const m = createDecoration(farmRoot, 'scarecrow', 0);
    if (m) decorationMeshes.push(m);
    showNotification('Espantalho: menos ervas daninhas!');
  } else if (type === 'fancyFence') {
    if (state.decorations.fancyFence) return showNotification('Você já tem a cerca decorada!');
    state.money -= cost;
    state.decorations.fancyFence = true;
    const m = createDecoration(farmRoot, 'fancyFence', 0);
    if (m) decorationMeshes.push(m);
    showNotification('Cerca reforçada: menos risco de lobo!');
  }

  updateHUD(state);
  updateUpgradesUI(state);
  if (type !== 'scarecrow' && type !== 'fancyFence') showNotification('Decoração adicionada à fazenda!');
  playSfx('sell');
}

function payGovAuthorization() {
  if (state.govAuthorization) return;
  const cost = govAuthCostFor(state);
  if (state.money < cost) return showNotification('Dinheiro insuficiente!');
  state.money -= cost;
  state.govAuthorization = true;
  hideDialogue();
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification('Outorga de água concedida! Agora você pode construir o poço artesiano.');
}

function buyArtesianWell() {
  if (state.hasArtesianWell) return showNotification('Você já possui um poço artesiano!');
  if (!state.govAuthorization) return showNotification('É necessária autorização do Fiscal Aurélio primeiro.');
  if (state.money < ARTESIAN_WELL_COST) return showNotification(`Necessário R$ ${ARTESIAN_WELL_COST}`);
  state.money -= ARTESIAN_WELL_COST;
  state.hasArtesianWell = true;
  state.maxWater += ARTESIAN_WELL_WATER_BONUS;
  artesianWellGroup = createArtesianWell(farmRoot);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification(`Poço artesiano construído! +${ARTESIAN_WELL_WATER_BONUS} de capacidade máxima de água.`);
}

function deliverSpecialOrder() {
  const order = state.specialOrder;
  const reward = orderRewardFor(state, order);
  if (!fulfillOrder(state, order, reward)) {
    return showNotification(`Ainda falta ${order.item} para completar o pedido.`);
  }
  showNotification(`Pedido entregue! +R$ ${reward}`);
  applyFriendshipGain('merchant', FRIENDSHIP_PER_ORDER);
  state.specialOrder = null;
  hideDialogue();
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  playSfx('sell');
  maybeCheckMoneyMilestone();
}

function deliverSupplierOrder() {
  const order = state.supplierOrder;
  if (!fulfillOrder(state, order)) {
    return showNotification(`Ainda falta ${order.item} para completar o pedido da Rosa.`);
  }
  showNotification(`Pedido da Rosa entregue! +R$ ${order.reward}`);
  applyFriendshipGain('supplier', FRIENDSHIP_PER_ORDER);
  state.supplierOrder = null;
  hideDialogue();
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  playSfx('sell');
  maybeCheckMoneyMilestone();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applyRenderScale(appSettings.graphics.renderScale);
}

let simTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (appState !== APP_STATE.PLAYING) {
    if (player) updateFollowCamera(camera, player, controls);
    else controls.update();
    composer.render();
    return;
  }

  if (!isTransitioning()) {
    updatePlayerMovement(player, delta, (cost) => {
      if (state.energy > 0) {
        state.energy = Math.max(0, state.energy - cost);
        updateHUD(state);
      }
    });
  }
  updateFollowCamera(camera, player, controls);

  if (getCurrentArea() === AREA.CAVE) updateCaveNodes(Date.now());
  const fishResult = updateFishing(state, Date.now());
  if (fishResult?.done) {
    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    updateHUD(state);
    showNotification(`Pescou 1× ${fishResult.fish}!`);
    playSfx('harvest');
  }

  if (player) {
    const areaId = getCurrentArea();
    const markers = getMinimapMarkers(areaId);
    if (areaId === AREA.FARM) {
      markers.village = VILLAGE_GATE;
      markers.villageGate = true;
    }
    updateMinimap(player.mesh.position, markers, getActiveBounds(), getAreaLabel(areaId));
  }

  const simDelta = delta * timeScale;
  simTime += simDelta;

  const onFarm = getCurrentArea() === AREA.FARM;
  updateWind(windSystem, simDelta);
  applyWindEffects({
    wind: windSystem,
    treesGroup: onFarm ? treesGroup : null,
    grassGroup: onFarm ? groundMesh?.userData?.grassGroup : null,
    windmill: onFarm ? windmill : null,
    clouds,
    delta: simDelta
  });

  worldTime = (worldTime + simDelta * 7) % 1440;
  const hours = Math.floor(worldTime / 60);
  const minutes = Math.floor(worldTime % 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const isDay = hours >= 6 && hours < 19;
  const isDawnDusk = (hours >= 5 && hours < 7) || (hours >= 17 && hours < 19);

  const npcChair = houseGroup.userData.npc;
  const sleepIndicator = houseGroup.userData.sleepIndicator;
  if (npcChair && sleepIndicator) {
    if (npcChair.visible !== isDay) {
      npcChair.visible = isDay;
      sleepIndicator.visible = !isDay;
    }
    if (isDay) {
      const npcPivot = npcChair.userData.pivot;
      const t = simTime;
      // Balanço da cadeira de embalar, com leve respiração sobreposta no torso
      npcChair.rotation.x = Math.sin(t * 1.5) * 0.06;
      npcPivot.scale.y = 1 + Math.sin(t * 1.8) * 0.012;

      // Cabeça observando a fazenda: olha de um lado a outro devagar, com
      // uma "checada" ocasional para cima (céu/clima).
      const headPivot = npcPivot.userData.headPivot;
      if (headPivot) {
        headPivot.rotation.y = Math.sin(t * 0.35) * 0.5;
        headPivot.rotation.x = Math.sin(t * 0.22 + 1.7) * 0.08;
      }

      // Braço de descanso no colo com balanço sutil de respiração
      const restArm = npcPivot.userData.restArm;
      if (restArm) restArm.rotation.x = -0.3 + Math.sin(t * 1.8 + 0.6) * 0.02;

      // Aceno periódico com o braço direito: gesto de "oi" com pequena
      // oscilação de pulso, depois volta a descansar no colo.
      const waveCycle = t % 8;
      if (waveCycle < 1.4) {
        npcPivot.userData.waveArm.rotation.x = -1.7 + Math.sin(waveCycle * 9) * 0.35;
        npcPivot.userData.waveArm.rotation.z = Math.sin(waveCycle * 9) * 0.15;
        if (headPivot) headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, 0, 0.3);
      } else {
        npcPivot.userData.waveArm.rotation.x = -0.3 + Math.sin(t * 1.8) * 0.02;
        npcPivot.userData.waveArm.rotation.z = 0;
      }
    } else {
      sleepIndicator.children.forEach((sprite, i) => {
        sprite.position.y = sprite.userData.baseY + Math.sin(simTime * 2 + i * 1.3) * 0.08;
      });
    }
  }

  document.getElementById('time-display').textContent = timeStr;
  document.getElementById('time-icon').innerHTML = svgIcon(isDay ? 'sun' : 'moon');

  const sunAngle = (worldTime / 1440) * Math.PI * 2 - Math.PI / 2;
  const sunHeight = Math.sin(sunAngle);
  const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.15) / 0.35, 0, 1);
  sunLight.position.set(Math.cos(sunAngle) * 45, Math.max(sunHeight, -0.15) * 45 + 5, 15);
  moonLight.position.set(-Math.cos(sunAngle) * 45, Math.max(-sunHeight, -0.15) * 45 + 5, -15);

  // Sol / lua visíveis no céu (escala grande, longe da fazenda)
  if (sunMesh) {
    const skyDist = 118;
    sunMesh.position.set(
      Math.cos(sunAngle) * skyDist,
      Math.max(sunHeight, 0.02) * skyDist * 0.72 + 18,
      28
    );
    sunMesh.visible = dayFactor > 0.05;
    sunMesh.rotation.y += simDelta * 0.15;
    const sunScale = THREE.MathUtils.lerp(0.7, 1.15, dayFactor);
    sunMesh.scale.setScalar(sunScale * (isDawnDusk ? 1.2 : 1));
  }
  if (moonMesh) {
    const skyDist = 110;
    moonMesh.position.set(
      -Math.cos(sunAngle) * skyDist,
      Math.max(-sunHeight, 0.02) * skyDist * 0.72 + 16,
      -22
    );
    moonMesh.visible = dayFactor < 0.85;
    moonMesh.scale.setScalar(THREE.MathUtils.lerp(1.1, 0.4, dayFactor));
  }

  sunLight.intensity = THREE.MathUtils.lerp(0.05, isDawnDusk ? 2.8 : 3.6, dayFactor);
  sunLight.color.setHex(isDawnDusk ? 0xffb06a : 0xfff0c8);
  moonLight.intensity = THREE.MathUtils.lerp(0.55, 0, dayFactor);
  ambientLight.intensity = THREE.MathUtils.lerp(0.16, 0.42, dayFactor);
  hemiLight.intensity = THREE.MathUtils.lerp(0.18, 0.55, dayFactor);
  fillLight.intensity = THREE.MathUtils.lerp(0.18, 0.35, dayFactor);

  const seasonSky = skyPaletteForSeason(state.season);
  const skyTop = new THREE.Color(isDawnDusk ? 0xe6853e : seasonSky.top).lerp(new THREE.Color(0x050818), 1 - dayFactor);
  const skyBottom = new THREE.Color(isDawnDusk ? 0xffd49a : seasonSky.bottom).lerp(new THREE.Color(0x161b30), 1 - dayFactor);
  skyUniforms.topColor.value.lerp(skyTop, 0.05);
  skyUniforms.bottomColor.value.lerp(skyBottom, 0.05);
  scene.fog.color.copy(skyUniforms.bottomColor.value);
  // Névoa: dia limpo, amanhecer/pôr do sol um pouco mais densa, noite mais fechada.
  const fogDay = 0.0028;
  const fogDusk = 0.006;
  const fogNight = 0.02;
  const fogTarget = isDawnDusk
    ? THREE.MathUtils.lerp(fogNight, fogDusk, dayFactor)
    : THREE.MathUtils.lerp(fogNight, fogDay, dayFactor);
  scene.fog.density = getCurrentArea() === AREA.CAVE ? 0.05 : fogTarget;
  if (getCurrentArea() === AREA.CAVE) {
    sunLight.intensity *= 0.15;
    ambientLight.intensity = Math.max(ambientLight.intensity, 0.2);
    hemiLight.intensity *= 0.35;
    if (sunMesh) sunMesh.visible = false;
    if (moonMesh) moonMesh.visible = false;
  }

  // Contraste de exposição no ciclo (amanhecer/pôr do sol mais quente)
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, isDawnDusk ? 1.35 : 1.28, dayFactor);

  // Olhos espreitando na mata e lampião da varanda só aparecem/acendem à noite
  if (treesGroup && treesGroup.userData.eyesGroup) {
    treesGroup.userData.eyesGroup.visible = dayFactor < 0.15;
  }
  const lantern = houseGroup.userData.lantern;
  if (lantern) {
    const nightGlow = 1 - dayFactor;
    lantern.light.intensity = THREE.MathUtils.lerp(0, 1.6, nightGlow);
    lantern.glassMat.emissiveIntensity = THREE.MathUtils.lerp(0, 1.2, nightGlow);
  }

  // Transição dia/noite controla soltar/prender: ao amanhecer os animais saem
  // do curral; ao anoitecer, os que ainda estiverem fora ficam em risco do lobo.
  const villagerNpcs = [merchantNpc, supplierNpc, govNpc];
  const villagerName = npc => npc.userData.npcId === 'merchant' ? MERCHANT_NAME
    : npc.userData.npcId === 'supplier' ? SUPPLIER_NAME : GOV_OFFICIAL_NAME;

  if (isDay && !wasDay) {
    state.animals.forEach(a => { a.isOutside = true; a.wanderTarget = null; });
    duskWarningShown = false;
    setDuskWarning(false);
    if (state.animals.length > 0) showNotification('Amanheceu! Os animais foram soltos do curral.');

    state.energy = state.maxEnergy;
    state.restedToday = false;
    dryGrowingCropsAtDawn();
    updateHUD(state);

    villagerNpcs.forEach(npc => {
      npc.userData.tookShelter = false;
      npc.userData.fleeing = false;
      const stand = npc.userData.standPosition;
      if (stand) {
        npc.position.x = stand.x;
        npc.position.z = stand.z;
      }
      npc.visible = true;
    });

    state.totalDays++;
    advanceSeasonIfNeeded();
    applySeasonalWorldTint();
  }
  if (!isDay && wasDay) {
    ringAlarm({ quiet: true });
    const outsideCount = state.animals.filter(a => a.isOutside).length;
    if (outsideCount > 0) {
      showNotification(`Sino da vila! ${outsideCount} animal(is) ainda fora do curral — cuidado com o lobo.`);
      showDialogue('Fazendeiro', farmerLine('duskAnimalsOut', outsideCount));
      winterStreakBroken = true;
    } else {
      showNotification('O sino da vila tocou! Os moradores correm para abrigo.');
      state.goalsProgress.safeNights++;
      if (state.goalsProgress.safeNights % 3 === 0) {
        showDialogue('Fazendeiro', farmerLine('safeNight', state.goalsProgress.safeNights));
      }
    }
  }
  wasDay = isDay;

  if (!isDay && hours === 18 && !duskWarningShown) {
    duskWarningShown = true;
    setDuskWarning(true);
  }
  if (isDay) setDuskWarning(false);

  const anyOutside = state.animals.some(a => a.isOutside);
  wolf.visible = !isDay && anyOutside;
  if (wolf.visible) updateWolfPatrol(wolf, simDelta, simTime);

  state.animals.forEach(animal => {
    const bounds = animal.isOutside
      ? { minX: corral.bounds.minX - 6, maxX: corral.bounds.maxX + 6, minZ: corral.bounds.minZ - 6, maxZ: corral.bounds.maxZ + 6 }
      : corral.bounds;
    updateAnimalAI(animal, simDelta, bounds);
    animateAnimal(animal, simDelta);

    if (!animal.isOutside || isDay) {
      animal.productTimer += simDelta * 1000;
      if (animal.productTimer >= animal.productTime && !animal.productReady) {
        animal.productTimer = animal.productTime;
        animal.productReady = true;
        showNotification(`${animal.type}: ${animal.product} pronto! Colete com E.`);
      }
    }
  });

  // Idle / fuga dos NPCs — só quando a vila está ativa
  const inVillage = getCurrentArea() === AREA.VILLAGE;
  if (inVillage) {
    [merchantNpc, supplierNpc, govNpc].forEach(npc => {
      if (npc.visible && !npc.userData.fleeing) animateIdleHumanoid(npc, simTime);
    });

    villagerNpcs.forEach(npc => {
      if (!npc.userData.fleeing) return;
      const target = npc.userData.fleeTarget;
      const dx = target.x - npc.position.x;
      const dz = target.z - npc.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.6) {
        npc.userData.fleeing = false;
        npc.userData.tookShelter = true;
        npc.visible = false;
        return;
      }

      const fleeSpeed = 3.4;
      const step = Math.min(dist, fleeSpeed * simDelta);
      const nextX = npc.position.x + (dx / dist) * step;
      const nextZ = npc.position.z + (dz / dist) * step;
      const cleared = avoidObstacles(nextX, nextZ, 0.28, 'village');
      npc.position.x = cleared.x;
      npc.position.z = cleared.z;
      npc.rotation.y = Math.atan2(dx, dz);
      animateWalkHumanoid(npc, simTime, fleeSpeed);
    });
  }

  if (!isDay) {
    wolfRiskTimer += simDelta * 1000;
    if (wolfRiskTimer >= WOLF_RISK_CHECK_INTERVAL_MS) {
      wolfRiskTimer = 0;
      const riskChance = wolfRiskChanceForSeason(state.season, state.decorations.fancyFence);
      const outside = state.animals.filter(a => a.isOutside);
      outside.forEach(animal => {
        if (Math.random() < riskChance) {
          removeAnimal(scene, state.animals, animal);
          state.goalsProgress.animalsLostTotal++;
          showNotification(`O lobo mau pegou sua ${animal.type.toLowerCase()}! 🐺`);
          showDialogue('Fazendeiro', farmerLine('wolfAttack', animal.type.toLowerCase()));
          updateUpgradesUI(state);
        }
      });

      villagerNpcs.filter(npc => npc.visible && !npc.userData.tookShelter).forEach(npc => {
        if (Math.random() < riskChance) {
          npc.visible = false;
          npc.userData.fleeing = false;
          showNotification(`${villagerName(npc)} não conseguiu se abrigar a tempo e fugiu do lobo na escuridão! Volta ao amanhecer. 🐺`);
        }
      });
    }
  } else {
    wolfRiskTimer = 0;
  }

  if (alarmRinging) {
    alarmBellSwingTime += simDelta;
    alarmBell.userData.bell.rotation.z = Math.sin(alarmBellSwingTime * 12) * 0.35 * Math.max(0, 1 - alarmBellSwingTime / 2.5);
    if (alarmBellSwingTime >= 2.5) {
      alarmRinging = false;
      alarmBell.userData.bell.rotation.z = 0;
    }
  }

  if (isHolding) {
    const duration = isBatchHolding ? BATCH_HOLD_DURATION_MS : HOLD_DURATION_MS;
    const heldTime = now - holdStartTime;
    const progress = Math.min(100, (heldTime / duration) * 100);
    document.getElementById('action-bar').style.width = `${progress}%`;
    if (heldTime >= duration) {
      if (isBatchHolding) {
        executeActionOnAllPlots();
        stopAction();
      } else if (targetPlot) {
        executeActionOnPlot(targetPlot);
        stopAction();
      }
    }
  }

  const seasonGrowthMultiplier = growthMultiplierForSeason(state.season);
  crops.forEach(crop => {
    const data = crop.userData;
    if (data.status === 'growing' && data.watered) {
      const speedMultiplier = (isDay ? 1.0 : 0.2) * seasonGrowthMultiplier;
      const weedPenalty = crop.parent && crop.parent.userData.hasWeed ? 0.5 : 1.0;
      const fertilizerBoost = data.fertilized ? FERTILIZER_GROWTH_MULTIPLIER : 1.0;
      data.growthProgress += simDelta * 1000 * speedMultiplier * weedPenalty * fertilizerBoost;

      if (data.growthProgress >= data.growthDuration) {
        data.status = 'ready';
      }
      updateCropVisualState(crop);
    }
  });

  weedSpawnTimer += simDelta * 1000;
  if (weedSpawnTimer >= 6000) {
    weedSpawnTimer = 0;
    const weedChance = state.decorations.scarecrow ? SCARECROW_WEED_CHANCE : BASE_WEED_CHANCE;
    if (farmPlots.length > 0 && Math.random() < weedChance) {
      const candidates = farmPlots.filter(p => !p.userData.hasWeed && !(p.userData.hasCrop && p.userData.cropRef.userData.status === 'ready'));
      if (candidates.length > 0) {
        maybeSpawnWeed(candidates[Math.floor(Math.random() * candidates.length)]);
      }
    }
  }

  goalCheckTimer += simDelta * 1000;
  if (goalCheckTimer >= 1000) {
    goalCheckTimer = 0;
    const completed = checkGoals(state);
    if (completed) {
      showNotification(completed.completeMessage);
      updateHUD(state);
      updateUpgradesUI(state);
    }
    const activeGoal = getActiveGoal(state);
    if (activeGoal && activeGoal.id !== lastGoalId) {
      lastGoalId = activeGoal.id;
      showChapterIntro(activeGoal);
    }
    updateGoalsUI(state, activeGoal);

    if (!state.specialOrder && Math.random() < 0.15) {
      state.specialOrder = generateSpecialOrder(state.npcFlags.merchant.friendship);
      showNotification('Novo pedido especial disponível! Fale com Seu Tobias.');
    }
    if (!state.supplierOrder && Math.random() < 0.1) {
      state.supplierOrder = generateSupplierOrder();
      showNotification('Dona Rosa tem um pedido! Fale com ela.');
    }
  }

  // Hint de interação próxima
  const hintEl = document.getElementById('crosshair-hint');
  if (hintEl && player) {
    const pos = player.mesh.position;
    const area = getCurrentArea();
    let hint = '';
    const portal = nearestPortal(pos);
    if (portal) hint = portal.hint;
    else if (area === AREA.CAVE && nearestMineNode(pos)) hint = 'E — Minerar';
    else if (area === AREA.VILLAGE && nearestInRange(pos, [merchantNpc, supplierNpc, govNpc])) hint = 'E — Conversar';
    else if (area === AREA.FARM) {
      if (isInRange(pos, BARN_POSITION, 4.0) && canCraftFeed(state)) hint = 'E / C — Craftar ração';
      else if (isInRange(pos, HOUSE_POSITION, HOUSE_REST_RANGE) && !state.restedToday) hint = 'E / R — Descansar';
      else if (isNearDock(pos)) hint = isFishing() ? 'Pescando...' : 'E — Pescar';
      else if (nearestInRange(pos, state.animals.map(a => a.mesh))) {
        const nearMesh = nearestInRange(pos, state.animals.map(a => a.mesh));
        const animal = nearMesh?.userData?.animalRef;
        if (feedMode) hint = 'E — Alimentar';
        else if (animal?.productReady) hint = `E — Coletar ${animal.product}`;
        else hint = 'E — Soltar / recolher';
      }
    }
    hintEl.textContent = hint;
    hintEl.classList.toggle('hidden', !hint);
  }

  composer.render();
}
