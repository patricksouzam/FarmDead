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
  createDecoration, createVillage, createVillageGate, createCaveEntrance, createLakeGate,
  createVillageCorpses, layNpcCorpse, createNightClutter,
  BARN_POSITION, HOUSE_POSITION, FARM_FROM_CAVE_SPAWN, PLAYER_SPAWN, VILLAGE_GATE,
  FENCES_LAYOUT, CORRAL_LAYOUT, applyWorldMap,
  VILLAGE_PLAZA, avoidObstacles, beginObstacleRegistration, getGroundHeightAt
} from './world.js';
import { loadWorldMap, getMap, getPlayerSpawn, pointInBounds, clampToBounds } from './mapLoader.js';
import { createPlaneWreck } from './planeWreck.js';
import { createBasement, nearestLoreNote, showLoreNote, hideLoreNote, isLoreNoteOpen } from './basement.js';
import {
  isCaveMinigameActive, initCaveMinigame, updateCaveMinigame, renderCaveMinigame
} from './caveMinigame.js';
import { createLake, isNearDock, startFishing, updateFishing, isFishing, fishSellPrice } from './fishing.js';
import { updateMinimap, updateAreaBadge } from './ui.js';
import {
  rebuildFarmPlots, createCropMesh, updateCropVisualState, setPlotWetVisual,
  maybeSpawnWeed, removeWeed, setPlotNeedsWaterHint
} from './crops.js';
import { spawnAnimal, updateAnimalAI, animateAnimal, removeAnimal, createWolfMesh, updateWolfPatrol } from './animals.js';
import { spawnEnemy, updateEnemyAI, animateEnemy, removeEnemy, poseEnemyCorpse } from './enemies.js';
import { beginMeleeSwing, fireWeaponProjectiles, updateArrows, equippedWeapon, updateMeleeSwing } from './combat.js';
import { checkGoals, getActiveGoal } from './goals.js';
import {
  createGameState, FARM_UPGRADE_COSTS, HOUSE_UPGRADE_COST, CAR_COST, CAR_SALE_BONUS, WELL_COST, WATER_REFILL_COST,
  WATER_PER_USE, FERTILIZER_COST, FERTILIZER_GROWTH_MULTIPLIER, HOLD_DURATION_MS, BATCH_HOLD_DURATION_MS,
  WOLF_RISK_CHECK_INTERVAL_MS, ARTESIAN_WELL_COST, ARTESIAN_WELL_WATER_BONUS,
  ENERGY_COST, FRIENDSHIP_PER_ORDER, FRIENDSHIP_PER_GIFT, FRIENDSHIP_MILESTONES,
  DECORATION_COSTS, MAX_FLOWER_BEDS, MAX_BARRELS, REST_ENERGY_GAIN, HOUSE_REST_RANGE,
  SCARECROW_WEED_CHANCE, BASE_WEED_CHANCE, MONEY_MILESTONES, MATERIAL_SELL,
  ENEMY_MAX_ACTIVE, ENEMY_SPAWN_CHECK_INTERVAL_MS, ENEMY_SAFE_ZONE_RADIUS,
  ENEMY_SPAWN_MIN_DIST_FROM_PLAYER, ENEMY_SPAWN_MAX_DIST_FROM_PLAYER,
  PLAYER_DAMAGE_INVULN_MS, PLAYER_RESPAWN_ENERGY_PENALTY, PLAYER_RESPAWN_MONEY_PENALTY_PCT,
  PLAYER_RESPAWN_MONEY_PENALTY_CAP,
  seedCostFor, govAuthCostFor, orderRewardFor, effectiveSaleBonus
} from './gameState.js';
import {
  updateHUD, updateInventoryUI, updateUpgradesUI, showNotification, setActiveTool, updateGoalsUI,
  setDuskWarning, showDialogue, hideDialogue, showChapterIntro, showConfirmDialog, updateWeaponHUD
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
import { FARMING_ENABLED, PAST_STORY_ENABLED } from './featureFlags.js';
import { spawnBlood, updateBlood, clearBlood } from './blood.js';
import {
  spawnDust, spawnSmokePuff, addSmokeEmitter, spawnMeleeDust,
  updateParticles, tickWeather, weatherFogMul
} from './particles.js';
import {
  ensureSurvival, tickSurvival, applyZombieWound, useBandage, useVaccine,
  eatFood, drinkWater, consumeMagShot, reloadWeapon, spawnSurvivalLoot,
  animateSurvivalLoot, nearestLoot, collectLoot, lootLabel
} from './survival.js';
import { serializeGame, getRuntimeSnapshot } from './saveGame.js';
import {
  createPlayer, bindPlayerInput, updatePlayerMovement, updateFollowCamera,
  isInRange, nearestInRange, setPlayerPosition, PLAYER_INTERACT_RANGE,
  attachFirstPerson, requestPlayerPointerLock, exitPlayerPointerLock, getLookDirection
} from './player.js';
import {
  spawnWeaponPickups, clearWeaponPickups, nearestWeaponPickup, animateWeaponPickups,
  createViewmodel, setViewmodelWeapon, kickViewmodel, updateViewmodel,
  getWeaponDef, ownedWeapons
} from './weapons.js';
import {
  craftFeed, canCraftFeed, feedAnimal, collectReadyProduct, FEED_RECIPE,
  craftSnack, canCraftSnack, SNACK_RECIPE, craftYarnGift, canCraftYarnGift, YARN_GIFT_RECIPE
} from './crafting.js';
import { animateIdleHumanoid, animateWalkHumanoid, animateAttackHumanoid } from './characters.js';
import {
  AREA, getCurrentArea, getActiveBounds, getAreaLabel, setAreaRoots,
  nearestPortal, transitionToArea, forceArea, getMinimapMarkers, isTransitioning,
  applyMapPortals
} from './areas.js';

const canvas = document.getElementById('game-canvas');
const minigameCanvas = document.getElementById('cave-minigame-canvas');
const minigameCtx = minigameCanvas.getContext('2d');
const state = createGameState();
const DEBUG_ENDPOINT = 'http://127.0.0.1:7299/ingest/8bc68156-38f8-493e-9aa8-401dffdaa1b4';
const DEBUG_SESSION_ID = '9196a3';

let scene, camera, renderer, composer, controls, bloomPass;
let raycaster, mouse;
let appState = APP_STATE.TITLE;
let previousAppState = null;
let appSettings = loadSettings();
let giftTargetNpc = null;
let sunLight, ambientLight, hemiLight, moonLight, fillLight, skyUniforms;
let houseGroup, carGroup, windmill, clouds, treesGroup, groundMesh, barnGroup;
let sunMesh, moonMesh, windSystem, planeWreckGroup, lakeGroup;
let farmRoot, caveRoot, villageRoot, lakeRoot, basementRoot;
let corral, wolf, merchantNpc, supplierNpc, govNpc, wellGroup, artesianWellGroup, alarmBell;
let deadVillagers = [];
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

let worldTime = 21 * 60 + 20; // 21:20 — noite permanente
let lastFrameTime = performance.now();
let timeScale = 1;
let wasDay = false;
let duskWarningShown = false;
let wolfRiskTimer = 0;
let weedSpawnTimer = 0;
let goalCheckTimer = 0;
let lastGoalId = null;
let winterStreakBroken = false;

let enemies = [];
let arrows = [];
let weaponPickups = [];
let survivalLoot = [];
let viewmodel = null;
let enemySpawnTimer = 0;
let attackAnimTime = null;
const ATTACK_ANIM_DURATION = 0.28;

init().catch(err => console.error('Falha ao iniciar o jogo:', err));

async function init() {
  // #region agent log
  debugLog('H2', 'init.start', {
    hasCanvas: !!canvas,
    hasMinigameCanvas: !!minigameCanvas,
    minigameCtxOk: !!minigameCtx,
    viewport: { w: window.innerWidth, h: window.innerHeight }
  });
  // #endregion

  await loadWorldMap();
  applyWorldMap();
  applyMapPortals();

  scene = createScene();
  skyUniforms = createSky(scene);
  clouds = createClouds(scene);
  sunMesh = createSun(scene);
  moonMesh = createMoon(scene);
  windSystem = createWindSystem(scene);
  ({ ambientLight, hemiLight, sunLight, moonLight, fillLight } = createLights(scene));

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.06, 500);
  camera.position.set(PLAYER_SPAWN.x, 1.6, PLAYER_SPAWN.z);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(PLAYER_SPAWN.x, 1, PLAYER_SPAWN.z + 2);
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
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.48, 0.78);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  // #region agent log
  debugLog('H2', 'init.renderer_ready', {
    rendererSize: renderer.getSize(new THREE.Vector2()).toArray(),
    pixelRatio: renderer.getPixelRatio(),
    cameraAspect: camera.aspect
  });
  // #endregion

  applyGraphicsSettings(appSettings.graphics);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  farmRoot = new THREE.Group();
  farmRoot.name = 'farmRoot';
  caveRoot = new THREE.Group();
  caveRoot.name = 'caveRoot';
  villageRoot = new THREE.Group();
  villageRoot.name = 'villageRoot';
  lakeRoot = new THREE.Group();
  lakeRoot.name = 'lakeRoot';
  basementRoot = new THREE.Group();
  basementRoot.name = 'basementRoot';
  scene.add(farmRoot);
  scene.add(caveRoot);
  scene.add(villageRoot);
  scene.add(lakeRoot);
  scene.add(basementRoot);

  // Seed fixa: o terreno não é editável nesta rodada (motor voxel gera o
  // mesmo mundo sempre), então não há necessidade de variar por save — só
  // persiste no save (state.worldSeed) para permitir customização futura
  // sem exigir migração de saves antigos.
  if (!state.worldSeed) state.worldSeed = 12345;

  beginObstacleRegistration('farm');
  groundMesh = createGround(scene, state.worldSeed);
  createFences(farmRoot, FENCES_LAYOUT.boundsX, FENCES_LAYOUT.boundsZ, {
    gateSide: FENCES_LAYOUT.gateSide,
    gateWidth: FENCES_LAYOUT.gateWidth
  });
  treesGroup = createTrees(farmRoot);
  windmill = createWindmill(farmRoot);
  barnGroup = createBarn(farmRoot);
  createSilo(farmRoot);
  wolf = createWolfMesh(farmRoot);

  merchantNpc = createMerchantNpc(farmRoot);
  supplierNpc = createSupplierNpc(farmRoot);
  govNpc = createGovOfficialNpc(farmRoot);
  const village = createVillage(farmRoot);
  alarmBell = village.alarmBell;
  layNpcCorpse(merchantNpc, { yaw: 0.8, hint: `${MERCHANT_NAME} não sobreviveu ao ataque.` });
  layNpcCorpse(supplierNpc, { yaw: -1.1, hint: `${SUPPLIER_NAME} caiu perto da barraca.` });
  layNpcCorpse(govNpc, { yaw: 2.2, hint: `${GOV_OFFICIAL_NAME} tentou correr. Não deu tempo.` });
  spawnBlood(farmRoot, merchantNpc.position.x, merchantNpc.position.y, merchantNpc.position.z, { death: true });
  spawnBlood(farmRoot, supplierNpc.position.x, supplierNpc.position.y, supplierNpc.position.z, { death: true });
  spawnBlood(farmRoot, govNpc.position.x, govNpc.position.y, govNpc.position.z, { death: true });
  deadVillagers = createVillageCorpses(farmRoot);
  deadVillagers.forEach(npc => {
    spawnBlood(farmRoot, npc.position.x, npc.position.y, npc.position.z, { death: true });
  });

  houseGroup = createHouse(farmRoot, state.houseLevel);
  carGroup = createCar(farmRoot);
  buildCar(carGroup, state.hasCar);
  planeWreckGroup = createPlaneWreck(farmRoot);
  createNightClutter(farmRoot);
  createBasement(basementRoot);
  player = createPlayer(scene, getPlayerSpawn());
  attachFirstPerson(scene, camera, player);
  viewmodel = createViewmodel(camera);
  setViewmodelWeapon(viewmodel, state.equippedWeapon || 'fists');
  player.viewmodel = viewmodel;

  createCaveEntrance(farmRoot);
  createVillageGate(farmRoot);
  createLakeGate(farmRoot);
  beginObstacleRegistration('lake');
  const lakeBuilt = createLake(lakeRoot, state.worldSeed);
  lakeGroup = lakeBuilt?.group || null;
  beginObstacleRegistration('farm');

  // Trilhas do hub: casa → portão da vila; casa → caverna; casa → lago; celeiro
  const mapPaths = getMap()?.paths;
  createPaths(farmRoot, mapPaths || [
    { width: 1.8, points: [[0, -12], [0, -6], [0, 0], [0, 12], [0, 28]] },
    { width: 1.4, points: [[0, -12], [7, -12], [14, -12]] },
    { width: 1.2, points: [[14, -12], [20, -8]] },
    { width: 1.2, points: [[14, -12], [18, -16]] },
    { width: 1.3, points: [[0, -12], [-6, -12], [-12, -12]] },
    { width: 1.5, points: [[0, 8], [-12, 8], [-24, 8]] },
    { width: 1.5, points: [[0, 8], [12, 8], [24, 8]] },
    { width: 1.6, points: [[0, 28], [0, 36], [0, 42]] },
    { width: 1.3, points: [[0, 41], [8.2, 39.5]] },
    { width: 1.3, points: [[0, 41], [-8.2, 39.5]] },
    { width: 1.2, points: [[0, 42], [0, 44.6]] }
  ]);

  if (FARMING_ENABLED) rebuildFarmPlots(farmRoot, farmPlots, state.farmLevel);
  corral = createCorral(farmRoot, CORRAL_LAYOUT.x, CORRAL_LAYOUT.z, CORRAL_LAYOUT.width, CORRAL_LAYOUT.depth, CORRAL_LAYOUT.gateSide);
  respawnWeaponPickups();
  ensureSurvival(state);
  survivalLoot = spawnSurvivalLoot(farmRoot);

  setAreaRoots({
    farm: farmRoot,
    cave: caveRoot,
    village: villageRoot,
    lake: lakeRoot,
    basement: basementRoot,
    ground: groundMesh.userData.overworldDecor
  });
  forceArea(AREA.FARM);
  updateAreaBadge(getAreaLabel());

  bindInput();
  bindUI();
  bindPauseKey();
  applyFarmingFlag();
  applyStoryFlag();
  attachWorldSmoke();

  state.season = seasonForDay(state.totalDays);
  applySeasonalWorldTint();

  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateUpgradesUI(state);
  updateGoalsUI(state, null);

  window.addEventListener('resize', onResize);

  showTitleScreen();
  refreshContinueButton();
  // #region agent log
  debugLog('H3', 'init.before_first_frame', {
    appState,
    sceneChildren: scene?.children?.length ?? null,
    currentArea: getCurrentArea()
  });
  // #endregion

  requestAnimationFrame(animate);
}

function bindInput() {
  renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
  bindPlayerInput(player, renderer.domElement);

  renderer.domElement.addEventListener('wheel', (e) => {
    if (appState !== APP_STATE.PLAYING) return;
    e.preventDefault();
    cycleEquippedWeapon(Math.sign(e.deltaY));
  }, { passive: false });

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
      if (!FARMING_ENABLED) return;
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
    if (FARMING_ENABLED && toolHotkeys[e.key]) {
      currentTool = toolHotkeys[e.key];
      setActiveTool(currentTool);
      return;
    }

    if (e.key.toLowerCase() === 'e') {
      e.preventDefault();
      if (isLoreNoteOpen()) { hideLoreNote(); return; }
      tryInteractNearby();
    }
    if (e.key.toLowerCase() === 'f') {
      feedMode = !feedMode;
      const feedToggle = document.getElementById('btn-feed');
      if (feedToggle) feedToggle.classList.toggle('active', feedMode);
      showNotification(feedMode ? 'Modo ração: E ou clique no animal para alimentar.' : 'Modo ração desligado.');
    }
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      tryReloadWeapon();
    }
    if (e.key.toLowerCase() === 'h') {
      const result = useBandage(state);
      showNotification(result.ok ? result.message : result.reason);
      if (result.ok) { updateHUD(state); playSfx('harvest'); }
    }
    if (e.key.toLowerCase() === 'g') {
      const result = eatFood(state);
      showNotification(result.ok ? result.message : result.reason);
      if (result.ok) { updateHUD(state); playSfx('plant'); }
    }
    if (e.key.toLowerCase() === 't') {
      const result = drinkWater(state);
      showNotification(result.ok ? result.message : result.reason);
      if (result.ok) { updateHUD(state); playSfx('water'); }
    }
    if (e.key.toLowerCase() === 'v') {
      const result = useVaccine(state);
      showNotification(result.ok ? result.message : result.reason);
      if (result.ok) { updateHUD(state); playSfx('notification'); }
    }
    if (e.key.toLowerCase() === 'c') {
      tryCraftAtBarn();
    }
    if (e.key.toLowerCase() === 'q') {
      attackWithEquippedWeapon();
    }
    if (e.key === '5' || e.key === '6' || e.key === '7' || e.key === '8') {
      const map = { '5': 'taco', '6': 'machado', '7': 'pistola', '8': 'espingarda' };
      tryEquipWeapon(map[e.key]);
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

    if (isLoreNoteOpen()) { hideLoreNote(); return; }

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
    if (appState === APP_STATE.PLAYING && player?.pointerLocked) {
      exitPlayerPointerLock();
      return;
    }
    if (appState === APP_STATE.PLAYING || appState === APP_STATE.PAUSED) togglePause();
  });
}

// --- Fluxo de tela (título / jogo / pausa / configurações) ---------------

function showTitleScreen() {
  appState = APP_STATE.TITLE;
  const titleScreenEl = document.getElementById('title-screen');
  titleScreenEl.classList.remove('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('hud-clock')?.classList.add('hidden');
  document.getElementById('controls').classList.add('hidden');
  document.getElementById('speed-controls').classList.add('hidden');
  document.getElementById('weapon-hud')?.classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => {
    if (m.id !== 'title-screen') m.classList.add('hidden');
  });
  hideDialogue();
  // #region agent log
  debugLog('H8', 'title_screen.shown', {
    className: titleScreenEl.className,
    display: window.getComputedStyle(titleScreenEl).display,
    opacity: window.getComputedStyle(titleScreenEl).opacity
  });
  // #endregion
}

function enterPlayingState() {
  appState = APP_STATE.PLAYING;
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('hud-clock')?.classList.remove('hidden');
  document.getElementById('controls').classList.remove('hidden');
  document.getElementById('speed-controls').classList.remove('hidden');
  document.getElementById('weapon-hud')?.classList.remove('hidden');
  initAudio();
  updateWeaponHUD(state);
  showNotification('Noite eterna. Clique para olhar, E para pegar armas, clique esquerdo para atacar.');
}

async function startNewGame() {
  // #region agent log
  debugLog('H9', 'start_new_game.clicked', {
    appStateBefore: appState
  });
  // #endregion
  initAudio();
  const proceed = () => {
    enemies.slice().forEach(e => removeEnemy(scene, enemies, e));
    arrows.forEach(a => scene.remove(a.mesh));
    arrows = [];
    forceArea(AREA.FARM, () => {
      if (player) setPlayerPosition(player, PLAYER_SPAWN.x, PLAYER_SPAWN.z);
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
  if (!PAST_STORY_ENABLED) {
    updateGoalsUI(state, null);
    return;
  }
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
  state.playerMaxHealth = saved.state.playerMaxHealth ?? 100;
  state.playerHealth = (saved.state.playerHealth > 0) ? saved.state.playerHealth : state.playerMaxHealth;
  state.worldSeed = saved.state.worldSeed || state.worldSeed || 12345;
  state.weaponsOwned = Array.isArray(saved.state.weaponsOwned) ? saved.state.weaponsOwned : [];
  state.equippedWeapon = saved.state.equippedWeapon || 'fists';
  if (viewmodel) setViewmodelWeapon(viewmodel, state.equippedWeapon);
  updateWeaponHUD(state);

  enemies.slice().forEach(e => removeEnemy(scene, enemies, e));
  arrows.forEach(a => scene.remove(a.mesh));
  arrows = [];

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
  if (FARMING_ENABLED) rebuildFarmPlots(farmRoot, farmPlots, state.farmLevel);
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
  respawnWeaponPickups();

  if (saved.runtime) {
    worldTime = saved.runtime.worldTime ?? worldTime;
    const loadHours = Math.floor(worldTime / 60);
    if (loadHours >= 5 && loadHours < 20) worldTime = 21 * 60 + 20;
    timeScale = saved.runtime.timeScale ?? timeScale;
    wasDay = false;
    wolfRiskTimer = saved.runtime.wolfRiskTimer ?? 0;
    weedSpawnTimer = saved.runtime.weedSpawnTimer ?? 0;
    goalCheckTimer = saved.runtime.goalCheckTimer ?? 0;
    lastGoalId = saved.runtime.lastGoalId ?? null;
    winterStreakBroken = !!saved.runtime.winterStreakBroken;
    if (player && saved.runtime.playerX != null) {
      const areaId = saved.runtime.area || AREA.FARM;
      forceArea(areaId, () => {
        const bounds = getActiveBounds();
        let x = saved.runtime.playerX;
        let z = saved.runtime.playerZ ?? PLAYER_SPAWN.z;
        if (!pointInBounds(x, z, bounds)) {
          const spawn = getPlayerSpawn();
          x = spawn.x;
          z = spawn.z;
        } else {
          const clamped = clampToBounds(x, z, bounds);
          x = clamped.x;
          z = clamped.z;
        }
        setPlayerPosition(player, x, z);
        updateAreaBadge(getAreaLabel(areaId));
      });
      player.cameraYaw = saved.runtime.cameraYaw ?? 0;
      player.cameraPitch = saved.runtime.cameraPitch ?? 0;
      player.lookYaw = player.cameraYaw;
      player.lookPitch = player.cameraPitch;
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
    exitPlayerPointerLock();
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
  state.energy = state.maxEnergy;
  state.restedToday = true;
  updateHUD(state);
  showNotification('Você descansou. A noite continua lá fora...');
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
  if (groundMesh?.material?.color) {
    const tint = new THREE.Color(palette.grass).lerp(new THREE.Color(0xffffff), 0.45);
    groundMesh.material.color.copy(tint);
  }
  if (groundMesh?.userData?.collarMat?.color) {
    groundMesh.userData.collarMat.color.setHex(palette.grass);
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
  if (!modal.classList.contains('hidden')) exitPlayerPointerLock();
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

  // A caverna não é mais uma área 3D — o portal abre o mini-game 2D por
  // cima, sem trocar currentArea (o jogador nunca "sai" da fazenda).
  if (portal.to === AREA.CAVE) {
    enterCaveMinigame();
    return true;
  }

  const ok = await transitionToArea(portal.to, () => {
    setPlayerPosition(player, portal.spawn.x, portal.spawn.z);
    updateAreaBadge(getAreaLabel(portal.to));
  });
  if (ok) {
    showNotification(getAreaLabel(portal.to));
    playSfx('notification');
  }
  return ok;
}

function enterCaveMinigame() {
  if (isTransitioning() || isCaveMinigameActive()) return;
  previousAppState = appState;
  appState = APP_STATE.CAVE_MINIGAME;
  exitPlayerPointerLock();

  document.getElementById('controls').classList.add('hidden');
  document.getElementById('speed-controls').classList.add('hidden');
  document.getElementById('weapon-hud')?.classList.add('hidden');
  minigameCanvas.classList.remove('hidden');
  minigameCanvas.width = window.innerWidth;
  minigameCanvas.height = window.innerHeight;

  initCaveMinigame(minigameCanvas, state, onExitCaveMinigame);
}

function onExitCaveMinigame(summary) {
  Object.entries(summary).forEach(([type, qty]) => {
    if (qty > 0) state.materials[type] = (state.materials[type] || 0) + qty;
  });

  minigameCanvas.classList.add('hidden');
  document.getElementById('controls').classList.remove('hidden');
  document.getElementById('speed-controls').classList.remove('hidden');
  document.getElementById('weapon-hud')?.classList.remove('hidden');
  appState = previousAppState || APP_STATE.PLAYING;

  setPlayerPosition(player, FARM_FROM_CAVE_SPAWN.x, FARM_FROM_CAVE_SPAWN.z);
  updateAreaBadge(getAreaLabel(getCurrentArea()));

  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateHUD(state);

  const collected = Object.entries(summary).filter(([, qty]) => qty > 0);
  if (collected.length > 0) {
    const text = collected.map(([type, qty]) => `${qty}× ${type}`).join(', ');
    showNotification(`Trouxe da caverna: ${text}`);
  } else {
    showNotification('Voltou da caverna de mãos vazias.');
  }
  playSfx('notification');
}

function applyFarmingFlag() {
  const tools = document.getElementById('farm-tools');
  if (tools) tools.classList.toggle('hidden', !FARMING_ENABLED);
}

function applyStoryFlag() {
  if (!PAST_STORY_ENABLED) updateGoalsUI(state, null);
}

function attachWorldSmoke() {
  if (houseGroup?.userData?.chimney) {
    const p = new THREE.Vector3();
    houseGroup.userData.chimney.getWorldPosition(p);
    addSmokeEmitter(farmRoot, p.x, p.y + 0.4, p.z, { rate: 3.1, color: 0x4a4844, scale: 0.85, rise: 1.05 });
  }
  if (planeWreckGroup) {
    const local = planeWreckGroup.userData.smokeLocal || new THREE.Vector3(0.2, 1.5, -0.4);
    const p = local.clone();
    planeWreckGroup.localToWorld(p);
    addSmokeEmitter(farmRoot, p.x, p.y, p.z, { rate: 5.6, color: 0x3a3832, scale: 1.4, rise: 1.3 });
  }
}

function vfxRoot() {
  return getCurrentArea() === AREA.LAKE ? lakeRoot : farmRoot;
}

function villageNpcs() {
  return [merchantNpc, supplierNpc, govNpc, ...deadVillagers].filter(Boolean);
}

function overworldPlaceLabel() {
  if (getCurrentArea() !== AREA.FARM) return getAreaLabel();
  return player?.mesh?.position?.z > VILLAGE_GATE.z - 2 ? 'Vila' : 'Fazenda';
}

function onEnemyDamaged(enemy, died) {
  const p = enemy.mesh.position;
  const look = player ? getLookDirection(player, camera) : { x: 0, y: 0, z: 0 };
  spawnBlood(vfxRoot(), p.x, p.y, p.z, { death: died, dir: look });
  playSfx('flesh_hit');
  if (died) {
    poseEnemyCorpse(enemy);
    playSfx('zombie_die');
  } else {
    playSfx('zombie_hurt', { volume: 0.75 });
  }
}

function tryInteractNearby() {
  const pos = player.mesh.position;
  const area = getCurrentArea();

  if (tryPickupNearbyWeapon()) return;
  if (tryPickupNearbyLoot()) return;

  if (area === AREA.BASEMENT) {
    const note = nearestLoreNote(pos);
    if (note) { showLoreNote(note); return; }
  }

  if (nearestPortal(pos)) {
    tryUsePortal();
    return;
  }

  // AREA.CAVE nunca é a área ativa de fato — o portal farm_to_cave abre o
  // mini-game 2D (ver enterCaveMinigame/tryUsePortal) sem trocar currentArea.

  const npc = nearestInRange(pos, villageNpcs());
  if (npc) {
    if (npc.userData.dead) {
      showNotification(npc.userData.deathHint || 'O corpo está frio. Não há o que fazer.');
      playSfx('error');
      return;
    }
    talkToNpc(npc.userData.npcId);
    return;
  }

  if (area === AREA.LAKE) {
    if (isNearDock(pos)) {
      tryFishAtDock();
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

  const animalMesh = nearestInRange(pos, state.animals.map(a => a.mesh));
  if (animalMesh?.userData.animalRef) {
    handleAnimalInteract(animalMesh.userData.animalRef);
    return;
  }

  if (FARMING_ENABLED) {
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
  }

  showNotification('Nada próximo para interagir (E).');
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

function attackWithEquippedWeapon() {
  const now = Date.now();
  const weapon = equippedWeapon(state);
  if (player.reloading) return;
  if (weapon.kind === 'ranged') {
    if ((state.mag[weapon.id] || 0) <= 0) {
      if ((state.ammo[weapon.id] || 0) > 0) {
        performReload(weapon);
      } else {
        showNotification('Sem munição.');
        playSfx('error');
      }
      return;
    }
    const pellets = fireWeaponProjectiles(scene, player, camera, now, weapon);
    if (pellets) {
      consumeMagShot(state, weapon.id);
      arrows.push(...pellets);
      attackAnimTime = 0;
      kickViewmodel(viewmodel, weapon.id === 'espingarda' ? 1.55 : 1.05);
      const origin = new THREE.Vector3();
      camera.getWorldPosition(origin);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      origin.addScaledVector(dir, 0.55);
      spawnSmokePuff(vfxRoot(), origin.x, origin.y, origin.z, {
        count: weapon.id === 'espingarda' ? 8 : 4,
        scale: weapon.id === 'espingarda' ? 1.15 : 0.7,
        color: 0x8a8a82
      });
      playSfx('gunshot', { volume: weapon.id === 'espingarda' ? 1.15 : 0.9 });
      updateWeaponHUD(state);
    }
    return;
  }

  const swing = beginMeleeSwing(player, weapon, now);
  if (!swing) return;
  attackAnimTime = 0;
  kickViewmodel(viewmodel, 1);
  playSfx('melee_swing');
  const pos = player.mesh.position;
  spawnMeleeDust(vfxRoot(), pos.x, pos.y, pos.z);
}

function tryReloadWeapon() {
  const weapon = equippedWeapon(state);
  if (weapon.kind !== 'ranged') {
    tryRestAtHouse();
    return;
  }
  performReload(weapon);
}

function performReload(weapon) {
  if (player.reloading) return false;
  const result = reloadWeapon(state, weapon.id);
  if (!result.ok) {
    showNotification(result.reason);
    playSfx('error');
    return false;
  }
  player.reloading = true;
  player.reloadUntil = Date.now() + result.duration;
  playSfx('reload');
  showNotification('Recarregando...');
  return true;
}

function tryPickupNearbyLoot() {
  const loot = nearestLoot(player.mesh.position, survivalLoot);
  if (!loot) return false;
  const type = loot.userData.lootType;
  const label = collectLoot(state, loot);
  const idx = survivalLoot.indexOf(loot);
  if (idx >= 0) survivalLoot.splice(idx, 1);
  if (type === 'plane_note') {
    showLoreNote({
      title: 'Bilhete do piloto',
      text: 'A carga não chegou. Se alguém achar isso, tem suprimentos no porão da casa perto do celeiro — desviem do lago, tem gente lá.'
    });
  } else {
    showNotification(`Pegou ${label}.`);
  }
  playSfx('harvest');
  updateHUD(state);
  return true;
}

function respawnWeaponPickups() {
  clearWeaponPickups(weaponPickups);
  weaponPickups = spawnWeaponPickups(farmRoot || scene, state.weaponsOwned || []);
}

function tryPickupNearbyWeapon() {
  const pickup = nearestWeaponPickup(player.mesh.position, weaponPickups);
  if (!pickup) return false;
  const id = pickup.userData.weaponId;
  const def = getWeaponDef(id);
  if (!state.weaponsOwned) state.weaponsOwned = [];
  if (!state.weaponsOwned.includes(id)) state.weaponsOwned.push(id);
  tryEquipWeapon(id, true);
  if (pickup.parent) pickup.parent.remove(pickup);
  const idx = weaponPickups.indexOf(pickup);
  if (idx >= 0) weaponPickups.splice(idx, 1);
  showNotification(`Pegou ${def.name}! Clique esquerdo para usar.`);
  playSfx('harvest');
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  return true;
}

function tryEquipWeapon(id, silent = false) {
  const def = getWeaponDef(id);
  if (def.collectible && !(state.weaponsOwned || []).includes(id)) {
    if (!silent) showNotification(`Você ainda não encontrou: ${def.name}.`);
    return false;
  }
  state.equippedWeapon = def.id;
  if (viewmodel) setViewmodelWeapon(viewmodel, def.id);
  updateWeaponHUD(state);
  if (!silent) showNotification(`${def.name} equipada.`);
  return true;
}

function cycleEquippedWeapon(dir = 1) {
  const list = ownedWeapons(state);
  const current = state.equippedWeapon || 'fists';
  let idx = list.indexOf(current);
  if (idx < 0) idx = 0;
  const next = list[(idx + (dir > 0 ? 1 : -1) + list.length) % list.length];
  tryEquipWeapon(next, true);
}

function onCanvasPointerDown(event) {
  if (event.button !== 0) return;
  if (isTransitioning()) return;
  if (document.pointerLockElement !== renderer.domElement) {
    requestPlayerPointerLock(renderer.domElement);
    return;
  }
  attackWithEquippedWeapon();
}

function ringAlarm(opts = {}) {
  if (alarmRinging) return;
  alarmRinging = true;
  alarmBellSwingTime = 0;
  playSfx('bell');

  const inVillage = player.mesh.position.z > VILLAGE_GATE.z - 2;
  [merchantNpc, supplierNpc, govNpc].forEach(npc => {
    if (npc.userData.dead) return;
    if (npc.userData.tookShelter) return;
    if (inVillage) {
      npc.userData.fleeing = true;
      npc.userData.fleeTarget = npc.userData.homeShelter || { x: VILLAGE_PLAZA.x, z: VILLAGE_PLAZA.z };
    } else {
      // Fora da vila: abriga instantaneamente (sem animar em instância oculta)
      const home = npc.userData.homeShelter;
      if (home) {
        const groundY = getGroundHeightAt(home.x, home.z, 'farm');
        npc.position.set(home.x, groundY, home.z);
      }
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
  if (!FARMING_ENABLED) return;
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
      if (PAST_STORY_ENABLED) showDialogue('Fazendeiro', farmerLine('moneyMilestone', amount));
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
  if (FARMING_ENABLED) rebuildFarmPlots(farmRoot, farmPlots, state.farmLevel);
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
    if (PAST_STORY_ENABLED) showDialogue('Fazendeiro', farmerLine('seasonChange', state.season));

    if (state.season === 'Inverno') {
      winterStreakBroken = false;
      if (PAST_STORY_ENABLED) showDialogue('Fazendeiro', farmerLine('winterStart'));
    }
    if (wasWinter) {
      if (!winterStreakBroken) state.goalsProgress.seasonsSurvived++;
    }

    const palette = skyPaletteForSeason(state.season);
    if (groundMesh?.material?.color) {
      const tint = new THREE.Color(palette.grass).lerp(new THREE.Color(0xffffff), 0.45);
      groundMesh.material.color.copy(tint);
    }
    if (groundMesh?.userData?.collarMat?.color) {
      groundMesh.userData.collarMat.color.setHex(palette.grass);
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
let debugFrameLogCount = 0;

function debugLog(hypothesisId, message, data = {}, runId = 'initial') {
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId,
      hypothesisId,
      location: 'src/js/main.js',
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
}

window.addEventListener('error', (event) => {
  // #region agent log
  debugLog('H1', 'window.error', {
    message: event?.message || null,
    source: event?.filename || null,
    lineno: event?.lineno || null,
    colno: event?.colno || null
  });
  // #endregion
});

window.addEventListener('unhandledrejection', (event) => {
  // #region agent log
  debugLog('H1', 'window.unhandledrejection', {
    reason: String(event?.reason || 'unknown')
  });
  // #endregion
});

const ENEMY_TYPE_ROLL = [
  { type: 'Zumbi', weight: 0.42 },
  { type: 'ZumbiCorredor', weight: 0.30 },
  { type: 'ZumbiBruto', weight: 0.13 },
  { type: 'ZumbiRastejante', weight: 0.15 }
];
function rollEnemyType() {
  const r = Math.random();
  let acc = 0;
  for (const { type, weight } of ENEMY_TYPE_ROLL) {
    acc += weight;
    if (r <= acc) return type;
  }
  return 'Zumbi';
}

/** Spawna/atualiza/anima inimigos noturnos + flechas + dano por contato. Só ativo em áreas de mundo aberto (fazenda/vila). */
function updateEnemiesAndCombat(isDay, simDelta) {
  const areaId = getCurrentArea();
  const isOpenWorldArea = areaId === AREA.FARM || areaId === AREA.VILLAGE || areaId === AREA.LAKE;
  if (!isOpenWorldArea) return;

  const livingCount = enemies.filter(e => e.state !== 'dead').length;
  if (!isDay) {
    if (livingCount < 3) {
      trySpawnEnemy(areaId);
    } else {
      enemySpawnTimer += simDelta * 1000;
      if (enemySpawnTimer >= ENEMY_SPAWN_CHECK_INTERVAL_MS) {
        enemySpawnTimer = 0;
        if (livingCount < ENEMY_MAX_ACTIVE) trySpawnEnemy(areaId);
      }
    }
  }

  const safeZone = { x: HOUSE_POSITION.x, z: HOUSE_POSITION.z, radius: ENEMY_SAFE_ZONE_RADIUS };
  const playerPos = player.mesh.position;
  const aiArea = areaId === AREA.LAKE ? AREA.LAKE : AREA.FARM;

  enemies.slice().forEach(enemy => {
    if (enemy.state === 'dead') {
      enemy.corpseLife -= simDelta;
      if (enemy.corpseLife <= 0) removeEnemy(scene, enemies, enemy);
      return;
    }
    const event = updateEnemyAI(enemy, simDelta, playerPos, aiArea, safeZone, { crouched: !!player.crouched });
    animateEnemy(enemy, simDelta);

    enemy.sfxTimer = (enemy.sfxTimer || 0) - simDelta;
    if (enemy.sfxTimer <= 0) {
      const dist = Math.hypot(playerPos.x - enemy.mesh.position.x, playerPos.z - enemy.mesh.position.z);
      const vol = Math.max(0.08, 1 - dist / 18);
      enemy.sfxTimer = (enemy.state === 'chasing' || enemy.state === 'attacking')
        ? 1.8 + Math.random() * 1.6
        : 4.2 + Math.random() * 3.5;
      playSfx(enemy.state === 'chasing' || enemy.state === 'attacking' ? 'zombie_agro' : 'zombie_idle', { volume: vol });
    }

    if (event === 'attack') {
      playSfx('zombie_attack');
      applyDamageToPlayer(enemy.damage);
    }
  });

  const swing = updateMeleeSwing(player, enemies, simDelta);
  if (swing.event?.type === 'hit') {
    const killed = new Set(swing.event.result.killed);
    swing.event.result.hits.forEach(enemy => onEnemyDamaged(enemy, killed.has(enemy)));
  }

  const projectileHits = updateArrows(arrows, enemies, simDelta, scene);
  projectileHits.forEach(hit => onEnemyDamaged(hit.enemy, hit.died));

  if (attackAnimTime != null) {
    attackAnimTime += simDelta;
    if (attackAnimTime >= ATTACK_ANIM_DURATION) {
      attackAnimTime = null;
    } else {
      animateAttackHumanoid(player.mesh, attackAnimTime / ATTACK_ANIM_DURATION);
    }
  }
}

function trySpawnEnemy(areaId) {
  const playerPos = player.mesh.position;
  for (let attempt = 0; attempt < 5; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = ENEMY_SPAWN_MIN_DIST_FROM_PLAYER + Math.random() * (ENEMY_SPAWN_MAX_DIST_FROM_PLAYER - ENEMY_SPAWN_MIN_DIST_FROM_PLAYER);
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;

    if (Math.hypot(x - HOUSE_POSITION.x, z - HOUSE_POSITION.z) < ENEMY_SAFE_ZONE_RADIUS) continue;
    const bounds = getActiveBounds();
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) continue;

    const spawnArea = areaId === AREA.LAKE ? AREA.LAKE : AREA.FARM;
    const cleared = avoidObstacles(x, z, 0.5, spawnArea);
    const type = rollEnemyType();
    const root = spawnArea === AREA.LAKE ? lakeRoot : farmRoot;
    const enemy = spawnEnemy(root, type, cleared, spawnArea);
    enemies.push(enemy);
    return;
  }
}

function applyDamageToPlayer(amount) {
  const now = Date.now();
  if (now - (player.lastDamageTime || 0) < PLAYER_DAMAGE_INVULN_MS) return;
  player.lastDamageTime = now;

  state.playerHealth = Math.max(0, state.playerHealth - amount);
  applyZombieWound(state).forEach(note => showNotification(note));
  updateHUD(state);
  playSfx('error');

  const pos = player.mesh.position;
  const look = getLookDirection(player, camera);
  spawnBlood(vfxRoot(), pos.x, pos.y, pos.z, {
    death: false,
    count: 6,
    fromHeight: 1.2,
    dir: { x: -look.x, y: 0.2, z: -look.z }
  });

  const flashEl = document.getElementById('damage-flash');
  flashEl.classList.add('active');
  setTimeout(() => flashEl.classList.remove('active'), 120);

  if (state.playerHealth <= 0) handlePlayerDeath();
}

function handlePlayerDeath() {
  enemies.slice().forEach(e => removeEnemy(scene, enemies, e));
  clearBlood(farmRoot);
  if (lakeRoot) clearBlood(lakeRoot);

  state.playerHealth = state.playerMaxHealth;
  state.energy = Math.max(0, state.energy - PLAYER_RESPAWN_ENERGY_PENALTY);
  state.bleeding = false;
  state.infected = false;
  state.hunger = Math.max(35, state.hunger || 100);
  state.thirst = Math.max(35, state.thirst || 100);
  const moneyPenalty = Math.min(PLAYER_RESPAWN_MONEY_PENALTY_CAP, Math.round(state.money * PLAYER_RESPAWN_MONEY_PENALTY_PCT));
  state.money = Math.max(0, state.money - moneyPenalty);

  if (getCurrentArea() !== AREA.FARM) {
    forceArea(AREA.FARM, () => {
      setPlayerPosition(player, HOUSE_POSITION.x, HOUSE_POSITION.z - 2);
      updateAreaBadge(getAreaLabel(AREA.FARM));
    });
  } else {
    setPlayerPosition(player, HOUSE_POSITION.x, HOUSE_POSITION.z - 2);
  }

  updateHUD(state);
  showDialogue('Fazendeiro', 'Os zumbis te derrubaram... Você acordou em casa. Pegue uma arma e tome cuidado na noite.');
  showNotification(`Desmaiou! -${PLAYER_RESPAWN_ENERGY_PENALTY} energia, -R$ ${moneyPenalty}.`);
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (debugFrameLogCount < 3) {
    const titleScreenEl = document.getElementById('title-screen');
    const titleShellEl = document.querySelector('.title-shell');
    // #region agent log
    debugLog('H4', 'animate.frame', {
      frame: debugFrameLogCount + 1,
      appState,
      delta,
      cameraPos: camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null,
      canvasClient: canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null,
      titleScreen: titleScreenEl ? {
        className: titleScreenEl.className,
        display: window.getComputedStyle(titleScreenEl).display,
        opacity: window.getComputedStyle(titleScreenEl).opacity
      } : null,
      titleShell: titleShellEl ? {
        display: window.getComputedStyle(titleShellEl).display,
        opacity: window.getComputedStyle(titleShellEl).opacity,
        rect: titleShellEl.getBoundingClientRect().toJSON ? titleShellEl.getBoundingClientRect().toJSON() : null
      } : null
    });
    // #endregion
    debugFrameLogCount++;
  }

  if (appState === APP_STATE.CAVE_MINIGAME) {
    updateCaveMinigame(delta);
    renderCaveMinigame(minigameCtx, minigameCanvas.width, minigameCanvas.height);
    return; // Three.js não renderiza neste frame — economiza GPU.
  }

  if (appState !== APP_STATE.PLAYING) {
    if (player) updateFollowCamera(camera, player, controls, delta);
    else controls.update();
    composer.render();
    return;
  }

  let moving = false;
  if (!isTransitioning()) {
    const blockers = [
      ...enemies.filter(e => e.state !== 'dead').map(e => ({
        x: e.mesh.position.x, z: e.mesh.position.z, radius: e.type === 'ZumbiBruto' ? 0.48 : 0.36
      })),
      ...villageNpcs().filter(n => n.visible !== false).map(n => ({
        x: n.position.x, z: n.position.z, radius: n.userData.dead ? 0.28 : 0.34
      }))
    ];
    moving = updatePlayerMovement(player, delta, (cost) => {
      if (state.energy > 0) {
        state.energy = Math.max(0, state.energy - cost);
        updateHUD(state);
      }
    }, blockers, { energyRatio: state.energy / Math.max(1, state.maxEnergy || 100) });
    const pos = player.mesh.position;
    if (player.stepEvent) {
      spawnDust(vfxRoot(), pos.x, pos.y, pos.z, {
        count: player.sprintFactor > 0.4 ? 5 : 3,
        burst: player.sprintFactor > 0.55,
        color: 0x7a6a4e
      });
    }
    if (player.justLanded) {
      spawnDust(vfxRoot(), pos.x, pos.y, pos.z, { count: 8, burst: true, spread: 0.45, color: 0x6a5a40 });
    }
  }
  updateFollowCamera(camera, player, controls, delta);

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
      markers.village = VILLAGE_PLAZA;
      markers.villageGate = true;
    }
    updateMinimap(player.mesh.position, markers, getActiveBounds(), overworldPlaceLabel());
    updateAreaBadge(overworldPlaceLabel());
  }

  const simDelta = delta * timeScale;
  simTime += simDelta;
  animateWeaponPickups(weaponPickups, simTime);
  animateSurvivalLoot(survivalLoot, simTime);

  if (player.reloading && Date.now() >= (player.reloadUntil || 0)) {
    player.reloading = false;
    updateWeaponHUD(state);
    showNotification('Pronto.');
  }

  const survivalEvents = tickSurvival(state, simDelta);
  if (survivalEvents.includes('dot')) {
    updateHUD(state);
    if (state.playerHealth <= 0) handlePlayerDeath();
  }

  const onFarm = getCurrentArea() === AREA.FARM;
  updateWind(windSystem, simDelta);
  tickWeather(simDelta, windSystem?.strength || 0.7);
  applyWindEffects({
    wind: windSystem,
    treesGroup: onFarm ? treesGroup : null,
    grassGroup: onFarm ? groundMesh?.userData?.grassGroup : null,
    windmill: onFarm ? windmill : null,
    clouds,
    delta: simDelta
  });

  worldTime = (worldTime + simDelta * 7) % 1440;
  if (worldTime >= 5 * 60 && worldTime < 20 * 60) worldTime = 20 * 60;
  const hours = Math.floor(worldTime / 60);
  const minutes = Math.floor(worldTime % 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const isDay = false;
  const isDawnDusk = false;

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

  sunLight.intensity = THREE.MathUtils.lerp(0.05, isDawnDusk ? 2.55 : 3.2, dayFactor);
  sunLight.color.setHex(isDawnDusk ? 0xffb06a : 0xfff0c8);
  moonLight.intensity = THREE.MathUtils.lerp(1.15 + Math.sin(simTime * 0.12) * 0.18, 0, dayFactor);
  ambientLight.intensity = THREE.MathUtils.lerp(0.16, 0.38, dayFactor);
  hemiLight.intensity = THREE.MathUtils.lerp(0.22, 0.48, dayFactor);
  fillLight.intensity = THREE.MathUtils.lerp(0.12, 0.28, dayFactor);

  const seasonSky = skyPaletteForSeason(state.season);
  const nightTop = new THREE.Color(0x06101c);
  const nightBottom = new THREE.Color(0x121820);
  const skyTop = new THREE.Color(isDawnDusk ? 0xe6853e : seasonSky.top).lerp(nightTop, 1 - dayFactor);
  const skyBottom = new THREE.Color(isDawnDusk ? 0xffd49a : seasonSky.bottom).lerp(nightBottom, 1 - dayFactor);
  skyUniforms.topColor.value.lerp(skyTop, 0.05);
  skyUniforms.bottomColor.value.lerp(skyBottom, 0.05);
  scene.fog.color.copy(skyUniforms.bottomColor.value);
  const fogDay = 0.0025;
  const fogDusk = 0.0048;
  const fogNight = 0.0155 + Math.sin(simTime * 0.18) * 0.0035;
  const fogTarget = (isDawnDusk
    ? THREE.MathUtils.lerp(fogNight, fogDusk, dayFactor)
    : THREE.MathUtils.lerp(fogNight, fogDay, dayFactor)) * weatherFogMul();
  scene.fog.density = THREE.MathUtils.damp(scene.fog.density, fogTarget, 1.2, simDelta);

  // Contraste de exposição no ciclo (amanhecer/pôr do sol mais quente)
  renderer.toneMappingExposure = THREE.MathUtils.lerp(0.78, isDawnDusk ? 1.22 : 1.18, dayFactor);

  // Olhos espreitando na mata e lampião da varanda só aparecem/acendem à noite
  if (treesGroup && treesGroup.userData.eyesGroup) {
    treesGroup.userData.eyesGroup.visible = dayFactor < 0.15;
  }
  const lantern = houseGroup.userData.lantern;
  if (lantern) {
    const nightGlow = 1 - dayFactor;
    lantern.light.intensity = THREE.MathUtils.lerp(0, 2.4, nightGlow);
    lantern.glassMat.emissiveIntensity = THREE.MathUtils.lerp(0, 1.6, nightGlow);
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
      if (npc.userData.dead) return;
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

    // Inimigos noturnos "voltam à escuridão" com a luz do dia.
    enemies.slice().forEach(e => removeEnemy(scene, enemies, e));
    clearBlood(farmRoot);
    if (lakeRoot) clearBlood(lakeRoot);
  }
  if (!isDay && wasDay) {
    ringAlarm({ quiet: true });
    const outsideCount = state.animals.filter(a => a.isOutside).length;
    if (outsideCount > 0) {
      showNotification(`Sino da vila! ${outsideCount} animal(is) ainda fora do curral — cuidado com o lobo.`);
      if (PAST_STORY_ENABLED) showDialogue('Fazendeiro', farmerLine('duskAnimalsOut', outsideCount));
      winterStreakBroken = true;
    } else {
      showNotification('O sino da vila tocou! Os moradores correm para abrigo.');
      state.goalsProgress.safeNights++;
      if (state.goalsProgress.safeNights % 3 === 0) {
        if (PAST_STORY_ENABLED) showDialogue('Fazendeiro', farmerLine('safeNight', state.goalsProgress.safeNights));
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

  updateEnemiesAndCombat(isDay, simDelta);
  const fxRoot = vfxRoot();
  updateBlood(simDelta, fxRoot);
  updateParticles(simDelta, fxRoot, { wind: windSystem, playerPos: player?.mesh?.position });
  if (lakeGroup?.userData?.animateLake) lakeGroup.userData.animateLake(simTime);
  if (!isTransitioning()) {
    const swingProgress = player.meleeSwing
      ? Math.min(1, player.meleeSwing.elapsed / player.meleeSwing.duration)
      : (attackAnimTime != null ? attackAnimTime / ATTACK_ANIM_DURATION : 0);
    updateViewmodel(viewmodel, delta, moving, swingProgress, {
      aiming: !!player.aiming && equippedWeapon(state).kind === 'ranged',
      reloading: !!player.reloading,
      reloadT: player.reloading ? 1 - Math.max(0, (player.reloadUntil - Date.now()) / 1800) : 0,
      crouched: !!player.crouched,
      airborne: !player.onGround,
      sprinting: (player.sprintFactor || 0) > 0.4,
      landDip: player.landDip || 0,
      time: simTime
    });
  }

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

  // NPCs da vila (agora no mesmo mapa da fazenda)
  [merchantNpc, supplierNpc, govNpc].forEach(npc => {
    if (npc.userData.dead) return;
    if (npc.visible && !npc.userData.fleeing) animateIdleHumanoid(npc, simTime);
  });

  villagerNpcs.forEach(npc => {
    if (npc.userData.dead || !npc.userData.fleeing) return;
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
    const cleared = avoidObstacles(nextX, nextZ, 0.28, 'farm');
    npc.position.x = cleared.x;
    npc.position.z = cleared.z;
    npc.rotation.y = Math.atan2(dx, dz);
    animateWalkHumanoid(npc, simTime, fleeSpeed);
  });

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
          if (PAST_STORY_ENABLED) showDialogue('Fazendeiro', farmerLine('wolfAttack', animal.type.toLowerCase()));
          updateUpgradesUI(state);
        }
      });

      villagerNpcs.filter(npc => !npc.userData.dead && npc.visible && !npc.userData.tookShelter).forEach(npc => {
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

  if (FARMING_ENABLED && isHolding) {
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

  if (FARMING_ENABLED) {
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
  }

  goalCheckTimer += simDelta * 1000;
  if (goalCheckTimer >= 1000) {
    goalCheckTimer = 0;
    if (PAST_STORY_ENABLED) {
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
    } else {
      updateGoalsUI(state, null);
    }
  }

  // Hint de interação próxima
  const hintEl = document.getElementById('crosshair-hint');
  if (hintEl && player) {
    const pos = player.mesh.position;
    const area = getCurrentArea();
    let hint = '';
    const portal = nearestPortal(pos);
    const weaponNear = nearestWeaponPickup(pos, weaponPickups);
    const lootNear = nearestLoot(pos, survivalLoot);
    if (weaponNear) hint = `E — Pegar ${getWeaponDef(weaponNear.userData.weaponId).name}`;
    else if (lootNear) hint = `E — Pegar ${lootLabel(lootNear.userData.lootType)}`;
    else if (area === AREA.BASEMENT && nearestLoreNote(pos)) hint = `E — Ler: ${nearestLoreNote(pos).title}`;
    else if (portal) hint = portal.hint;
    else if (nearestInRange(pos, villageNpcs())) {
      const npc = nearestInRange(pos, villageNpcs());
      hint = npc.userData.dead ? 'E — Examinar corpo' : 'E — Conversar';
    }
    else if (area === AREA.LAKE && isNearDock(pos)) hint = isFishing() ? 'Pescando...' : 'E — Pescar';
    else if (area === AREA.FARM) {
      if (isInRange(pos, BARN_POSITION, 4.0) && canCraftFeed(state)) hint = 'E / C — Craftar ração';
      else if (isInRange(pos, HOUSE_POSITION, HOUSE_REST_RANGE) && !state.restedToday) hint = 'E — Descansar';
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

  const lookPrompt = document.getElementById('look-prompt');
  const crosshair = document.getElementById('crosshair');
  const locked = !!player?.pointerLocked;
  if (lookPrompt) lookPrompt.classList.toggle('hidden', appState !== APP_STATE.PLAYING || locked);
  if (crosshair) {
    crosshair.classList.toggle('hidden', appState !== APP_STATE.PLAYING || !locked);
    crosshair.classList.toggle('ads', !!player?.aiming);
  }

  composer.render();
}
