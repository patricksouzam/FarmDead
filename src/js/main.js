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
  createMerchantNpc, createSupplierNpc, createWell, createGovOfficialNpc, createArtesianWell,
  createAlarmBell
} from './world.js';
import {
  rebuildFarmPlots, createCropMesh, updateCropVisualState, setPlotWetVisual,
  maybeSpawnWeed, removeWeed
} from './crops.js';
import { spawnAnimal, updateAnimalAI, animateAnimal, removeAnimal, createWolfMesh, updateWolfPatrol } from './animals.js';
import { checkGoals, getActiveGoal } from './goals.js';
import {
  createGameState, FARM_UPGRADE_COSTS, HOUSE_UPGRADE_COST, CAR_COST, WELL_COST, WATER_REFILL_COST,
  WATER_PER_USE, FERTILIZER_COST, FERTILIZER_GROWTH_MULTIPLIER, HOLD_DURATION_MS, BATCH_HOLD_DURATION_MS,
  WOLF_RISK_CHECK_INTERVAL_MS, GOV_AUTHORIZATION_COST, ARTESIAN_WELL_COST, ARTESIAN_WELL_WATER_BONUS
} from './gameState.js';
import {
  updateHUD, updateInventoryUI, updateUpgradesUI, showNotification, setActiveTool, updateGoalsUI,
  setDuskWarning, showDialogue, hideDialogue, showChapterIntro
} from './ui.js';
import {
  seasonForDay, dayOfSeasonFor, growthMultiplierForSeason, skyPaletteForSeason,
  wolfRiskChanceForSeason, isPlantableInSeason
} from './seasons.js';
import {
  MERCHANT_NAME, SUPPLIER_NAME, GOV_OFFICIAL_NAME, randomMerchantLine, randomSupplierLine,
  generateSpecialOrder, fulfillOrder, farmerLine, govAuthorizationOffer, randomGovAuthorizedLine
} from './npcs.js';
import { svgIcon } from '../icons/icons.js';

const canvas = document.getElementById('game-canvas');
const state = createGameState();

let scene, camera, renderer, composer, controls;
let raycaster, mouse;
let sunLight, ambientLight, hemiLight, moonLight, fillLight, skyUniforms;
let houseGroup, carGroup, windmill, clouds, treesGroup, groundMesh;
let corral, wolf, merchantNpc, supplierNpc, govNpc, wellGroup, artesianWellGroup, alarmBell;
let alarmRinging = false;
let alarmBellSwingTime = 0;
let farmPlots = [];
let crops = [];

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
  ({ ambientLight, hemiLight, sunLight, moonLight, fillLight } = createLights(scene));

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 15, 22);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, -2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.28, 0.45, 0.9);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  groundMesh = createGround(scene);
  createFences(scene, [-16, 21], [-14.5, 17]);
  treesGroup = createTrees(scene);
  windmill = createWindmill(scene);
  createBarn(scene);
  createSilo(scene);
  wolf = createWolfMesh(scene);
  merchantNpc = createMerchantNpc(scene);
  supplierNpc = createSupplierNpc(scene);
  govNpc = createGovOfficialNpc(scene);
  alarmBell = createAlarmBell(scene);

  houseGroup = createHouse(scene, state.houseLevel);
  carGroup = createCar(scene);
  buildCar(carGroup, state.hasCar);

  // Rede de caminhos com a casa como hub: trilha principal (mais larga) até a
  // área de plantio — a rota mais usada — e ramais mais estreitos para as
  // dependências (zona de serviço a leste, curral a oeste, garagem), com uma
  // curva suave na bifurcação em vez de um cruzamento reto abrupto.
  createPaths(scene, [
    { width: 2.1, points: [[0, -9.0], [0, -8.3], [0, -5.0], [0, -1.0]] },
    { width: 1.6, points: [[0, -8.3], [7, -8.3], [14.5, -9.0]] },
    { width: 1.3, points: [[14.5, -9.0], [19, -4.5]] },
    { width: 1.3, points: [[14.5, -9.0], [16.5, -14.5]] },
    { width: 1.5, points: [[0, -8.3], [-4.2, -8.3], [-8.5, -8.3]] },
    { width: 1.2, points: [[0, -8.3], [3, -6.8], [6.2, -6.0]] }
  ]);

  rebuildFarmPlots(scene, farmPlots, state.farmLevel);
  corral = createCorral(scene, -8.5, -8.5, 6, 5, 'east');

  bindInput();
  bindUI();

  state.season = seasonForDay(state.totalDays);

  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  updateUpgradesUI(state);
  const startingGoal = getActiveGoal(state);
  updateGoalsUI(state, startingGoal);
  if (startingGoal) {
    lastGoalId = startingGoal.id;
    showChapterIntro(startingGoal);
  }

  window.addEventListener('resize', onResize);

  requestAnimationFrame(animate);
}

function bindInput() {
  renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);

  document.querySelectorAll('.tool-btn').forEach(btn => {
    const tool = btn.dataset.tool;
    btn.addEventListener('pointerdown', () => startAction(tool));
    btn.addEventListener('pointerup', stopAction);
    btn.addEventListener('pointerleave', stopAction);
  });
}

function bindUI() {
  document.getElementById('btn-shop').addEventListener('click', () => toggleModal('shop-modal'));
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

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeScale(Number(btn.dataset.speed)));
  });
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
  if (id === 'shop-modal') updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
}

function onCanvasPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const bellHits = raycaster.intersectObjects([alarmBell], true);
  if (bellHits.length > 0) {
    ringAlarm();
    return;
  }

  const animalMeshes = state.animals.map(a => a.mesh);
  const animalHits = raycaster.intersectObjects(animalMeshes, true);
  if (animalHits.length > 0) {
    let obj = animalHits[0].object;
    while (obj && !obj.userData.animalRef) obj = obj.parent;
    if (obj && obj.userData.animalRef) {
      toggleAnimalOutside(obj.userData.animalRef);
      return;
    }
  }

  const npcHits = raycaster.intersectObjects([merchantNpc, supplierNpc, govNpc], true);
  if (npcHits.length > 0) {
    let obj = npcHits[0].object;
    while (obj && !obj.userData.npcId) obj = obj.parent;
    if (obj && obj.userData.npcId) {
      talkToNpc(obj.userData.npcId);
      return;
    }
  }

  const intersects = raycaster.intersectObjects(farmPlots, true);
  if (intersects.length === 0) return;

  let obj = intersects[0].object;
  while (obj && !obj.userData.isPlot) obj = obj.parent;
  if (!obj || !obj.userData.isPlot) return;

  targetPlot = obj;
  isBatchHolding = false;
  isHolding = true;
  holdStartTime = performance.now();
  document.getElementById('action-progress-container').classList.remove('hidden');
  const names = { plant: 'Plantando', water: 'Regando', harvest: 'Colhendo', weed: 'Arrancando' };
  document.getElementById('action-text').textContent = `${names[currentTool]}...`;
}

function ringAlarm() {
  if (alarmRinging) return;
  alarmRinging = true;
  alarmBellSwingTime = 0;

  const safeSpot = houseGroup.position;
  [merchantNpc, supplierNpc, govNpc].forEach(npc => {
    if (npc.userData.tookShelter) return;
    npc.userData.fleeing = true;
    npc.userData.fleeTarget = safeSpot;
  });

  showNotification('Sino tocado! Os moradores estão correndo para casa.');
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
  const fail = (msg) => { if (!silent) showNotification(msg); return false; };

  if (currentTool === 'plant') {
    if (data.hasCrop) return fail('Este bloco já tem uma plantação!');
    if (state.seeds[state.activeSeedType] <= 0) {
      return fail(`Sem sementes de ${state.activeSeedType}! Compre na loja.`);
    }
    if (!isPlantableInSeason(state.seedConfigs[state.activeSeedType], state.season)) {
      return fail(`${state.activeSeedType} não pode ser plantada no(a) ${state.season}!`);
    }

    state.seeds[state.activeSeedType]--;
    const cropObj = createCropMesh(state.activeSeedType, state.seedConfigs[state.activeSeedType].growthTime);
    plot.add(cropObj);
    updateCropVisualState(cropObj);
    data.hasCrop = true;
    data.cropRef = cropObj;
    crops.push(cropObj);

    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    if (!silent) showNotification(`Plantou ${state.activeSeedType}!`);
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
    cropData.watered = true;
    setPlotWetVisual(plot, true);
    updateHUD(state);
    if (!silent) showNotification('Planta regada!');
    return true;

  } else if (currentTool === 'harvest') {
    if (!data.hasCrop) return fail('Não há planta neste bloco.');
    const cropData = data.cropRef.userData;
    if (cropData.status !== 'ready') return fail('A plantação ainda não está madura!');

    const sType = cropData.seedType;
    state.harvested[sType]++;
    state.goalsProgress.totalHarvested++;

    plot.remove(data.cropRef);
    crops = crops.filter(c => c !== data.cropRef);
    data.hasCrop = false;
    data.cropRef = null;
    setPlotWetVisual(plot, false);

    updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
    if (!silent) showNotification(`Colheu 1x ${sType}!`);
    return true;

  } else if (currentTool === 'weed') {
    if (!data.hasWeed) return fail('Não há erva daninha neste bloco.');
    removeWeed(plot);
    if (!silent) showNotification('Erva daninha arrancada!');
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
  const cfg = state.seedConfigs[type];
  if (state.money < cfg.cost) return showNotification('Dinheiro insuficiente!');
  state.money -= cfg.cost;
  state.seeds[type]++;
  state.activeSeedType = type;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Comprou semente de ${type}!`);
}

function selectActiveSeed(type) {
  state.activeSeedType = type;
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Semente ativa: ${type}`);
}

function sellCrop(type) {
  if (state.harvested[type] <= 0) return;
  const price = Math.round(state.seedConfigs[type].sell * (1 + state.saleBonus));
  state.harvested[type]--;
  state.money += price;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Vendeu 1x ${type} por R$ ${price}!`);
}

function sellProduct(type) {
  if (state.products[type] <= 0) return;
  const animalType = Object.keys(state.animalConfigs).find(a => state.animalConfigs[a].product === type);
  const price = Math.round(state.animalConfigs[animalType].sell * (1 + state.saleBonus));
  state.products[type]--;
  state.money += price;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
  showNotification(`Vendeu 1x ${type} por R$ ${price}!`);
}

function buyAnimal(type) {
  const cfg = state.animalConfigs[type];
  if (state.animals.length >= state.maxAnimals) return showNotification(`Curral cheio! Máximo de ${state.maxAnimals} animais.`);
  if (state.money < cfg.cost) return showNotification(`Necessário R$ ${cfg.cost}`);
  state.money -= cfg.cost;
  const animal = spawnAnimal(scene, type, cfg, corral.bounds);
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
  rebuildFarmPlots(scene, farmPlots, state.farmLevel);
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
  buildCar(carGroup, true);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification('Picape adquirida!');
}

function buyWell() {
  if (state.hasWell) return showNotification('Você já possui um poço!');
  if (state.money < WELL_COST) return showNotification(`Necessário R$ ${WELL_COST}`);
  state.money -= WELL_COST;
  state.hasWell = true;
  state.maxWater += 60;
  wellGroup = createWell(scene);
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
      const tint = new THREE.Color(palette.grass).lerp(new THREE.Color(0xffffff), 0.5);
      groundMesh.material.color.copy(tint);
      if (groundMesh.userData.collarMat) groundMesh.userData.collarMat.color.setHex(palette.grass);
    }
  }
}

function talkToNpc(npcId) {
  if (npcId === 'merchant') {
    const order = state.specialOrder;
    if (order) {
      showDialogue(MERCHANT_NAME, order.text, {
        actionLabel: `Entregar (+R$ ${order.reward})`,
        onAction: () => deliverSpecialOrder()
      });
    } else {
      showDialogue(MERCHANT_NAME, randomMerchantLine());
    }
  } else if (npcId === 'supplier') {
    showDialogue(SUPPLIER_NAME, randomSupplierLine());
  } else if (npcId === 'gov') {
    if (state.govAuthorization) {
      showDialogue(GOV_OFFICIAL_NAME, randomGovAuthorizedLine());
    } else {
      showDialogue(GOV_OFFICIAL_NAME, govAuthorizationOffer(GOV_AUTHORIZATION_COST), {
        actionLabel: `Pagar taxa (R$ ${GOV_AUTHORIZATION_COST})`,
        onAction: () => payGovAuthorization()
      });
    }
  }
}

function payGovAuthorization() {
  if (state.govAuthorization) return;
  if (state.money < GOV_AUTHORIZATION_COST) return showNotification('Dinheiro insuficiente!');
  state.money -= GOV_AUTHORIZATION_COST;
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
  artesianWellGroup = createArtesianWell(scene);
  updateHUD(state);
  updateUpgradesUI(state);
  showNotification(`Poço artesiano construído! +${ARTESIAN_WELL_WATER_BONUS} de capacidade máxima de água.`);
}

function deliverSpecialOrder() {
  const order = state.specialOrder;
  if (!fulfillOrder(state, order)) {
    return showNotification(`Ainda falta ${order.item} para completar o pedido.`);
  }
  showNotification(`Pedido entregue! +R$ ${order.reward}`);
  state.specialOrder = null;
  hideDialogue();
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

let simTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  const simDelta = delta * timeScale;
  simTime += simDelta;

  controls.update();

  if (windmill) windmill.hub.rotation.z += simDelta * 1.4;

  if (clouds) {
    clouds.children.forEach(cloud => {
      cloud.position.x += cloud.userData.driftSpeed * simDelta;
      if (cloud.position.x > 130) cloud.position.x = -130;
    });
  }

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
  sunLight.position.set(Math.cos(sunAngle) * 45, Math.max(sunHeight, -0.15) * 45 + 5, 15);
  moonLight.position.set(-Math.cos(sunAngle) * 45, Math.max(-sunHeight, -0.15) * 45 + 5, -15);

  const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.15) / 0.35, 0, 1);
  sunLight.intensity = THREE.MathUtils.lerp(0.05, 3.4, dayFactor);
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
  // Névoa noturna mais densa que o padrão diurno — reforça o clima de terror
  // sem esconder a cena por completo. Base diurna bem mais leve que antes
  // (0.0035) para não lavar o contraste da cena a poucos metros da câmera.
  scene.fog.density = THREE.MathUtils.lerp(0.022, 0.0035, dayFactor);

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
  if (isDay && !wasDay) {
    state.animals.forEach(a => { a.isOutside = true; a.wanderTarget = null; });
    duskWarningShown = false;
    setDuskWarning(false);
    if (state.animals.length > 0) showNotification('Amanheceu! Os animais foram soltos do curral.');

    state.totalDays++;
    advanceSeasonIfNeeded();
  }
  if (!isDay && wasDay) {
    const outsideCount = state.animals.filter(a => a.isOutside).length;
    if (outsideCount > 0) {
      showNotification(`Anoiteceu com ${outsideCount} animal(is) fora do curral! Cuidado com o lobo.`);
      showDialogue('Fazendeiro', farmerLine('duskAnimalsOut', outsideCount));
      winterStreakBroken = true;
    } else {
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
      if (animal.productTimer >= animal.productTime) {
        animal.productTimer = 0;
        state.products[animal.product]++;
        updateInventoryUI(state, sellCrop, sellProduct, selectActiveSeed);
      }
    }
  });

  const villagerNpcs = [merchantNpc, supplierNpc, govNpc];
  const villagerName = npc => npc.userData.npcId === 'merchant' ? MERCHANT_NAME
    : npc.userData.npcId === 'supplier' ? SUPPLIER_NAME : GOV_OFFICIAL_NAME;

  if (isDay && !wasDay) {
    villagerNpcs.forEach(npc => {
      npc.userData.tookShelter = false;
      npc.userData.fleeing = false;
      npc.visible = true;
    });
  }

  villagerNpcs.forEach(npc => {
    if (!npc.userData.fleeing) return;
    const target = npc.userData.fleeTarget;
    const dx = target.x - npc.position.x;
    const dz = target.z - npc.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.2) {
      npc.userData.fleeing = false;
      npc.userData.tookShelter = true;
      npc.visible = false;
      return;
    }

    const fleeSpeed = 3.2;
    const step = Math.min(dist, fleeSpeed * simDelta);
    npc.position.x += (dx / dist) * step;
    npc.position.z += (dz / dist) * step;
    npc.rotation.y = Math.atan2(dx, dz);
  });

  if (!isDay) {
    wolfRiskTimer += simDelta * 1000;
    if (wolfRiskTimer >= WOLF_RISK_CHECK_INTERVAL_MS) {
      wolfRiskTimer = 0;
      const riskChance = wolfRiskChanceForSeason(state.season);
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
    if (farmPlots.length > 0 && Math.random() < 0.35) {
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
      state.specialOrder = generateSpecialOrder();
      showNotification('Novo pedido especial disponível! Fale com Seu Tobias.');
    }
  }

  composer.render();
}
