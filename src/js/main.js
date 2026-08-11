import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  createScene, createSky, createLights, createGround, createFences,
  createTrees, createWindmill, createHouse, buildHouse, createCar, buildCar,
  createBarn, createSilo, createPaths, createClouds, createCorral
} from './world.js';
import {
  rebuildFarmPlots, createCropMesh, updateCropVisualState, setPlotWetVisual,
  maybeSpawnWeed, removeWeed
} from './crops.js';
import { spawnAnimal, updateAnimalAI, removeAnimal, createWolfMesh, updateWolfPatrol } from './animals.js';
import { checkGoals, getActiveGoal } from './goals.js';
import {
  createGameState, FARM_UPGRADE_COSTS, HOUSE_UPGRADE_COST, CAR_COST, WATER_REFILL_COST,
  WATER_PER_USE, HOLD_DURATION_MS, BATCH_HOLD_DURATION_MS, WOLF_RISK_CHECK_INTERVAL_MS, WOLF_RISK_CHANCE
} from './gameState.js';
import { updateHUD, updateInventoryUI, updateUpgradesUI, showNotification, setActiveTool, updateGoalsUI, setDuskWarning } from './ui.js';
import { svgIcon } from '../icons/icons.js';

const canvas = document.getElementById('game-canvas');
const state = createGameState();

let scene, camera, renderer, composer, controls;
let raycaster, mouse;
let sunLight, ambientLight, hemiLight, moonLight, skyUniforms;
let houseGroup, carGroup, windmill, clouds, treesGroup;
let corral, wolf;
let farmPlots = [];
let crops = [];

let currentTool = 'plant';
let targetPlot = null;
let isHolding = false;
let isBatchHolding = false;
let holdStartTime = 0;

let worldTime = 400; // 06:40
let lastFrameTime = performance.now();
let wasDay = true;
let duskWarningShown = false;
let wolfRiskTimer = 0;
let weedSpawnTimer = 0;
let goalCheckTimer = 0;

init();

function init() {
  scene = createScene();
  skyUniforms = createSky(scene);
  clouds = createClouds(scene);
  ({ ambientLight, hemiLight, sunLight, moonLight } = createLights(scene));

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 15, 22);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, -2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 55;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.5, 0.86);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createGround(scene);
  createFences(scene, [-14, 17.5], [-13.5, 13]);
  treesGroup = createTrees(scene);
  windmill = createWindmill(scene);
  createBarn(scene);
  createSilo(scene);
  wolf = createWolfMesh(scene);

  houseGroup = createHouse(scene, state.houseLevel);
  carGroup = createCar(scene);
  buildCar(carGroup, state.hasCar);

  // Rede de caminhos com a casa como hub: trilha principal (mais larga) até a
  // área de plantio — a rota mais usada — e ramais mais estreitos para as
  // dependências (zona de serviço a leste, curral a oeste, garagem), com uma
  // curva suave na bifurcação em vez de um cruzamento reto abrupto.
  createPaths(scene, [
    { width: 2.1, points: [[0, -9.0], [0, -8.3], [0, -5.0], [0, -1.0]] },
    { width: 1.6, points: [[0, -8.3], [5, -8.3], [12, -7.9]] },
    { width: 1.3, points: [[12, -7.9], [12, -2.5]] },
    { width: 1.3, points: [[12, -7.9], [12.5, -11.3]] },
    { width: 1.5, points: [[0, -8.3], [-4.2, -8.3], [-8.5, -8.3]] },
    { width: 1.2, points: [[0, -8.3], [-3, -7.0], [-4.2, -6.3]] }
  ]);

  rebuildFarmPlots(scene, farmPlots, state.farmLevel);
  corral = createCorral(scene, -8.5, -8.5, 6, 5, 'east');

  bindInput();
  bindUI();

  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct);
  updateUpgradesUI(state);
  updateGoalsUI(state, getActiveGoal(state));

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
}

function toggleModal(id) {
  const modal = document.getElementById(id);
  modal.classList.toggle('hidden');
  if (id === 'shop-modal') updateInventoryUI(state, sellCrop, sellProduct);
}

function onCanvasPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

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

    state.seeds[state.activeSeedType]--;
    const cropObj = createCropMesh(state.activeSeedType, state.seedConfigs[state.activeSeedType].growthTime);
    plot.add(cropObj);
    updateCropVisualState(cropObj);
    data.hasCrop = true;
    data.cropRef = cropObj;
    crops.push(cropObj);

    updateInventoryUI(state, sellCrop, sellProduct);
    if (!silent) showNotification(`Plantou ${state.activeSeedType}!`);
    return true;

  } else if (currentTool === 'water') {
    if (!data.hasCrop) return fail('Não há planta neste bloco.');
    const cropData = data.cropRef.userData;
    if (cropData.watered) return fail('Esta planta já está irrigada!');
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

    updateInventoryUI(state, sellCrop, sellProduct);
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
  updateInventoryUI(state, sellCrop, sellProduct);
  showNotification(`Comprou semente de ${type}!`);
}

function sellCrop(type) {
  if (state.harvested[type] <= 0) return;
  const price = Math.round(state.seedConfigs[type].sell * (1 + state.saleBonus));
  state.harvested[type]--;
  state.money += price;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct);
  showNotification(`Vendeu 1x ${type} por R$ ${price}!`);
}

function sellProduct(type) {
  if (state.products[type] <= 0) return;
  const animalType = type === 'Ovo' ? 'Galinha' : 'Vaca';
  const price = Math.round(state.animalConfigs[animalType].sell * (1 + state.saleBonus));
  state.products[type]--;
  state.money += price;
  updateHUD(state);
  updateInventoryUI(state, sellCrop, sellProduct);
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

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  controls.update();

  if (windmill) windmill.hub.rotation.z += delta * 1.4;

  if (clouds) {
    clouds.children.forEach(cloud => {
      cloud.position.x += cloud.userData.driftSpeed * delta;
      if (cloud.position.x > 130) cloud.position.x = -130;
    });
  }

  worldTime = (worldTime + delta * 7) % 1440;
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
      npcChair.rotation.x = Math.sin(now * 0.0015) * 0.06;
      const waveCycle = (now * 0.001) % 8;
      npcPivot.userData.waveArm.rotation.x = waveCycle < 1.2 ? -1.6 + Math.sin(waveCycle * 10) * 0.3 : -0.3;
    } else {
      sleepIndicator.children.forEach((sprite, i) => {
        sprite.position.y = sprite.userData.baseY + Math.sin(now * 0.002 + i * 1.3) * 0.08;
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
  sunLight.intensity = THREE.MathUtils.lerp(0.05, 2.4, dayFactor);
  moonLight.intensity = THREE.MathUtils.lerp(0.35, 0, dayFactor);
  ambientLight.intensity = THREE.MathUtils.lerp(0.18, 0.55, dayFactor);
  hemiLight.intensity = THREE.MathUtils.lerp(0.15, 0.5, dayFactor);

  const skyTop = new THREE.Color(isDawnDusk ? 0xd97a3e : 0x3a8fd6).lerp(new THREE.Color(0x050818), 1 - dayFactor);
  const skyBottom = new THREE.Color(isDawnDusk ? 0xffcf8f : 0xcfeeff).lerp(new THREE.Color(0x161b30), 1 - dayFactor);
  skyUniforms.topColor.value.lerp(skyTop, 0.05);
  skyUniforms.bottomColor.value.lerp(skyBottom, 0.05);
  scene.fog.color.copy(skyUniforms.bottomColor.value);
  // Névoa noturna mais densa que o padrão diurno — reforça o clima de terror
  // sem esconder a cena por completo (0.010 dia -> 0.028 noite fechada).
  scene.fog.density = THREE.MathUtils.lerp(0.028, 0.010, dayFactor);

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
  }
  if (!isDay && wasDay) {
    const outsideCount = state.animals.filter(a => a.isOutside).length;
    if (outsideCount > 0) {
      showNotification(`Anoiteceu com ${outsideCount} animal(is) fora do curral! Cuidado com o lobo.`);
    } else {
      state.goalsProgress.safeNights++;
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
  if (wolf.visible) updateWolfPatrol(wolf, delta, now * 0.001);

  state.animals.forEach(animal => {
    const bounds = animal.isOutside
      ? { minX: corral.bounds.minX - 6, maxX: corral.bounds.maxX + 6, minZ: corral.bounds.minZ - 6, maxZ: corral.bounds.maxZ + 6 }
      : corral.bounds;
    updateAnimalAI(animal, delta, bounds);

    if (!animal.isOutside || isDay) {
      animal.productTimer += delta * 1000;
      if (animal.productTimer >= animal.productTime) {
        animal.productTimer = 0;
        state.products[animal.product]++;
        updateInventoryUI(state, sellCrop, sellProduct);
      }
    }
  });

  if (!isDay) {
    wolfRiskTimer += delta * 1000;
    if (wolfRiskTimer >= WOLF_RISK_CHECK_INTERVAL_MS) {
      wolfRiskTimer = 0;
      const outside = state.animals.filter(a => a.isOutside);
      outside.forEach(animal => {
        if (Math.random() < WOLF_RISK_CHANCE) {
          removeAnimal(scene, state.animals, animal);
          state.goalsProgress.animalsLostTotal++;
          showNotification(`O lobo mau pegou sua ${animal.type.toLowerCase()}! 🐺`);
          updateUpgradesUI(state);
        }
      });
    }
  } else {
    wolfRiskTimer = 0;
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

  crops.forEach(crop => {
    const data = crop.userData;
    if (data.status === 'growing' && data.watered) {
      const speedMultiplier = isDay ? 1.0 : 0.2;
      const weedPenalty = crop.parent && crop.parent.userData.hasWeed ? 0.5 : 1.0;
      data.growthProgress += delta * 1000 * speedMultiplier * weedPenalty;

      if (data.growthProgress >= data.growthDuration) {
        data.status = 'ready';
      }
      updateCropVisualState(crop);
    }
  });

  weedSpawnTimer += delta * 1000;
  if (weedSpawnTimer >= 6000) {
    weedSpawnTimer = 0;
    if (farmPlots.length > 0 && Math.random() < 0.35) {
      const candidates = farmPlots.filter(p => !p.userData.hasWeed && !(p.userData.hasCrop && p.userData.cropRef.userData.status === 'ready'));
      if (candidates.length > 0) {
        maybeSpawnWeed(candidates[Math.floor(Math.random() * candidates.length)]);
      }
    }
  }

  goalCheckTimer += delta * 1000;
  if (goalCheckTimer >= 1000) {
    goalCheckTimer = 0;
    const completed = checkGoals(state);
    if (completed) {
      showNotification(completed.completeMessage);
      updateHUD(state);
      updateUpgradesUI(state);
    }
    updateGoalsUI(state, getActiveGoal(state));
  }

  composer.render();
}
