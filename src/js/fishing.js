import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { LAKE_POSITION, DOCK_POSITION, registerObstaclePublic, AREA_BOUNDS } from './world.js';
import { FARM_BASE_HEIGHT } from './terrain/heightmap.js';
import { createTerrainForArea } from './terrain/terrainMesh.js';

export const FISH_ENERGY_COST = 2;
export const FISH_DURATION_MS = 2200;
export const DOCK_INTERACT_RANGE = 2.6;

export const FISH_TYPES = {
  'Peixe Comum': { chance: 0.75, sell: 18 },
  'Peixe Raro': { chance: 0.25, sell: 55 }
};

let dockMesh = null;
let fishingUntil = 0;
let fishingActive = false;

export function createLake(scene, worldSeed = 12345) {
  // Terreno da área "lake" (depressão + praia + encostas), gerado pelo motor
  // voxel dentro dos bounds próprios da área (AREA_BOUNDS.lake em world.js).
  const { group: terrainGroup } = createTerrainForArea('lake', AREA_BOUNDS.lake, worldSeed, LAKE_POSITION);
  terrainGroup.name = 'lakeTerrain';
  scene.add(terrainGroup);

  const group = new THREE.Group();
  group.name = 'lake';
  // Y = nível d'água = mesma convenção de getGroundHeightAt/placeOnTerrain
  // em toda a base (FARM_BASE_HEIGHT + 1 = topo andável, não o valor puro).
  // O fundo do lago fica LAKE_DEPTH blocos abaixo disso (ver heightmap.js).
  group.position.set(LAKE_POSITION.x, FARM_BASE_HEIGHT + 1, LAKE_POSITION.z);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3a9fd8,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
    flatShading: true
  });
  const shoreMat = voxelMat(0xc2b280, { roughness: 0.9 });
  const rockMat = voxelMat(0x7a756e, { roughness: 0.92 });

  // Água em "pixels" de caixas baixas
  const waterCells = [
    [0, 0, 4.5, 3.8],
    [1.8, 1.2, 2.2, 2.0],
    [-1.6, 1.0, 2.0, 2.2],
    [0.5, -1.6, 2.8, 1.8],
    [-1.2, -1.4, 2.0, 1.6]
  ];
  waterCells.forEach(([x, z, w, d]) => {
    const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), waterMat);
    water.position.set(x, 0.06, z);
    water.receiveShadow = true;
    group.add(water);
  });

  // Margem voxel
  [[-2.8, 0], [2.8, 0], [0, 2.6], [0, -2.6], [-2.2, 2.0], [2.2, 2.0], [-2.2, -2.0], [2.2, -2.0]].forEach(([x, z]) => {
    const shore = voxelBox(1.2, 0.22, 1.2, shoreMat);
    shore.position.set(x, 0.08, z);
    group.add(shore);
  });

  [[-2.5, 1.5], [2.6, -1.2], [1.8, 2.2]].forEach(([x, z]) => {
    const rock = voxelBox(0.7, 0.5, 0.7, rockMat);
    rock.position.set(x, 0.25, z);
    group.add(rock);
  });

  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xd8e8f0, roughness: 0.55, transparent: true, opacity: 0.45, flatShading: true
  });
  [[-2.4, 0.4], [2.5, -0.2], [0.2, 2.3], [-0.4, -2.2], [1.6, 1.6]].forEach(([x, z], i) => {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.7 + (i % 2) * 0.25, 0.05, 0.45), foamMat.clone());
    foam.position.set(x, 0.16, z);
    foam.userData.foamPhase = i * 0.9;
    group.add(foam);
  });
  group.userData.animateLake = (t) => {
    group.children.forEach(child => {
      if (child.userData.foamPhase == null) return;
      child.position.y = 0.14 + Math.sin(t * 1.6 + child.userData.foamPhase) * 0.03;
      if (child.material) child.material.opacity = 0.32 + Math.sin(t * 2.1 + child.userData.foamPhase) * 0.12;
    });
  };

  // Colisão: bloquear o centro da água (não andável)
  registerObstaclePublic(LAKE_POSITION.x, LAKE_POSITION.z, 2.4, 'lake');
  registerObstaclePublic(LAKE_POSITION.x + 1.5, LAKE_POSITION.z + 0.8, 1.2, 'lake');
  registerObstaclePublic(LAKE_POSITION.x - 1.4, LAKE_POSITION.z + 0.6, 1.1, 'lake');

  // Cais de pesca (oeste do lago, perto do jogador)
  const dock = new THREE.Group();
  const woodMat = voxelMat(0x8f6038, { roughness: 0.85 });
  const plank = voxelBox(2.4, 0.16, 1.4, woodMat);
  plank.position.y = 0.12;
  dock.add(plank);
  [[-1.0, -0.5], [1.0, -0.5], [-1.0, 0.5], [1.0, 0.5]].forEach(([x, z]) => {
    const post = voxelBox(0.16, 0.5, 0.16, woodMat);
    post.position.set(x, 0.25, z);
    dock.add(post);
  });
  const rail = voxelBox(2.2, 0.12, 0.12, woodMat);
  rail.position.set(0, 0.45, 0.6);
  dock.add(rail);

  dock.position.set(
    DOCK_POSITION.x - LAKE_POSITION.x,
    0,
    DOCK_POSITION.z - LAKE_POSITION.z
  );
  dock.userData.isDock = true;
  group.add(dock);
  dockMesh = dock;

  scene.add(group);
  return { group, dock };
}

export function isNearDock(pos, range = DOCK_INTERACT_RANGE) {
  return Math.hypot(pos.x - DOCK_POSITION.x, pos.z - DOCK_POSITION.z) < range;
}

export function isFishing() {
  return fishingActive;
}

export function startFishing(state, now = Date.now()) {
  if (fishingActive) return { ok: false, reason: 'busy' };
  if (state.energy < FISH_ENERGY_COST) return { ok: false, reason: 'energy' };
  state.energy -= FISH_ENERGY_COST;
  fishingActive = true;
  fishingUntil = now + FISH_DURATION_MS;
  return { ok: true };
}

export function updateFishing(state, now = Date.now()) {
  if (!fishingActive) return null;
  if (now < fishingUntil) return { done: false };
  fishingActive = false;

  const roll = Math.random();
  let caught = 'Peixe Comum';
  let acc = 0;
  for (const [name, cfg] of Object.entries(FISH_TYPES)) {
    acc += cfg.chance;
    if (roll <= acc) {
      caught = name;
      break;
    }
  }

  if (!state.products) state.products = {};
  state.products[caught] = (state.products[caught] || 0) + 1;
  return { done: true, fish: caught };
}

export function fishSellPrice(type, bonus = 0) {
  const base = FISH_TYPES[type]?.sell ?? 10;
  return Math.round(base * (1 + bonus));
}
