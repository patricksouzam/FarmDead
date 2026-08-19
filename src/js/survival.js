import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { getGroundHeightAt } from './world.js';
import { getMap } from './mapLoader.js';

export const MAG_SIZE = { pistola: 7, espingarda: 2 };
export const RELOAD_MS = { pistola: 1400, espingarda: 2200 };
export const HUNGER_DRAIN = 0.28;
export const THIRST_DRAIN = 0.36;
export const BLEED_DPS = 2.1;
export const INFECTION_DPS = 0.9;
export const STARVE_DPS = 1.2;

export function ensureSurvival(state) {
  if (state.hunger == null) state.hunger = 100;
  if (state.thirst == null) state.thirst = 100;
  if (state.maxHunger == null) state.maxHunger = 100;
  if (state.maxThirst == null) state.maxThirst = 100;
  if (typeof state.bleeding !== 'boolean') state.bleeding = false;
  if (typeof state.infected !== 'boolean') state.infected = false;
  if (state.bandages == null) state.bandages = 2;
  if (state.vaccines == null) state.vaccines = 0;
  if (state.cannedFood == null) state.cannedFood = 1;
  if (state.bottledWater == null) state.bottledWater = 1;
  if (!state.ammo) state.ammo = { pistola: 14, espingarda: 6 };
  if (!state.mag) state.mag = { pistola: MAG_SIZE.pistola, espingarda: MAG_SIZE.espingarda };
  return state;
}

export function tickSurvival(state, delta) {
  ensureSurvival(state);
  const events = [];
  state.hunger = Math.max(0, state.hunger - HUNGER_DRAIN * delta);
  state.thirst = Math.max(0, state.thirst - THIRST_DRAIN * delta);

  let dmg = 0;
  if (state.bleeding) dmg += BLEED_DPS * delta;
  if (state.infected) dmg += INFECTION_DPS * delta;
  if (state.hunger <= 0) dmg += STARVE_DPS * delta;
  if (state.thirst <= 0) dmg += STARVE_DPS * 1.15 * delta;
  if (dmg > 0) {
    state.playerHealth = Math.max(0, state.playerHealth - dmg);
    events.push('dot');
  }
  return events;
}

export function applyZombieWound(state) {
  ensureSurvival(state);
  const notes = [];
  if (Math.random() < 0.42) {
    state.bleeding = true;
    notes.push('Sangrando! Use H para fazer um curativo.');
  }
  if (Math.random() < 0.16) {
    state.infected = true;
    notes.push('Infecção! Procure um soro (V).');
  }
  return notes;
}

export function useBandage(state) {
  ensureSurvival(state);
  if (state.bandages <= 0) return { ok: false, reason: 'Sem bandagens.' };
  if (!state.bleeding && state.playerHealth >= state.playerMaxHealth) {
    return { ok: false, reason: 'Não precisa de curativo agora.' };
  }
  state.bandages--;
  state.bleeding = false;
  state.playerHealth = Math.min(state.playerMaxHealth, state.playerHealth + 18);
  return { ok: true, message: 'Curativo aplicado. Sangramento parado.' };
}

export function useVaccine(state) {
  ensureSurvival(state);
  if (state.vaccines <= 0) return { ok: false, reason: 'Sem soro.' };
  if (!state.infected) return { ok: false, reason: 'Você não está infectado.' };
  state.vaccines--;
  state.infected = false;
  return { ok: true, message: 'Soro aplicado. Infecção controlada.' };
}

export function eatFood(state) {
  ensureSurvival(state);
  if (state.cannedFood > 0) {
    state.cannedFood--;
    state.hunger = Math.min(state.maxHunger, state.hunger + 55);
    state.playerHealth = Math.min(state.playerMaxHealth, state.playerHealth + 6);
    return { ok: true, message: 'Comeu comida enlatada.' };
  }
  for (const type of Object.keys(state.harvested || {})) {
    if (state.harvested[type] > 0) {
      state.harvested[type]--;
      state.hunger = Math.min(state.maxHunger, state.hunger + 28);
      return { ok: true, message: `Comeu ${type.toLowerCase()}.` };
    }
  }
  return { ok: false, reason: 'Sem comida.' };
}

export function drinkWater(state) {
  ensureSurvival(state);
  if (state.bottledWater > 0) {
    state.bottledWater--;
    state.thirst = Math.min(state.maxThirst, state.thirst + 50);
    return { ok: true, message: 'Bebeu água da garrafa.' };
  }
  if (state.water >= 10) {
    state.water -= 10;
    state.thirst = Math.min(state.maxThirst, state.thirst + 35);
    return { ok: true, message: 'Bebeu da reserva da fazenda.' };
  }
  return { ok: false, reason: 'Sem água.' };
}

export function consumeMagShot(state, weaponId) {
  ensureSurvival(state);
  if (weaponId !== 'pistola' && weaponId !== 'espingarda') return true;
  if ((state.mag[weaponId] || 0) <= 0) return false;
  state.mag[weaponId]--;
  return true;
}

export function reloadWeapon(state, weaponId) {
  ensureSurvival(state);
  if (weaponId !== 'pistola' && weaponId !== 'espingarda') return { ok: false, reason: 'Essa arma não recarrega.' };
  const size = MAG_SIZE[weaponId];
  const current = state.mag[weaponId] || 0;
  if (current >= size) return { ok: false, reason: 'Pente cheio.' };
  const reserve = state.ammo[weaponId] || 0;
  if (reserve <= 0) return { ok: false, reason: 'Sem munição reserva.' };
  const need = size - current;
  const take = Math.min(need, reserve);
  state.ammo[weaponId] -= take;
  state.mag[weaponId] += take;
  return { ok: true, take, duration: RELOAD_MS[weaponId] };
}

const LOOT_SPAWNS = [
  { type: 'bandage', x: 3.4, z: -10.2 },
  { type: 'bandage', x: 9.2, z: 40.4 },
  { type: 'food', x: -4.1, z: -13.6 },
  { type: 'water', x: -8.4, z: -7.1 },
  { type: 'ammo_pistola', x: -4.6, z: -15.2 },
  { type: 'ammo_espingarda', x: 16.0, z: -6.0 },
  { type: 'vaccine', x: 1.6, z: 43.8 },
  { type: 'plane_supplies', x: -22.6, z: -19.5 },
  { type: 'plane_note', x: -21.4, z: -17.2 }
];

function getLootSpawns() {
  return getMap()?.loot || LOOT_SPAWNS;
}

const LOOT_COLOR = {
  bandage: 0xe8e0d0,
  food: 0xb84a2a,
  water: 0x3a8ec8,
  ammo_pistola: 0xc9a13a,
  ammo_espingarda: 0x8a93a0,
  vaccine: 0x6ad08a,
  plane_supplies: 0xc9b48a,
  plane_note: 0xe8d8a0
};

export function spawnSurvivalLoot(parent) {
  const items = [];
  getLootSpawns().forEach(spawn => {
    const mesh = voxelBox(0.28, 0.18, 0.22, voxelMat(LOOT_COLOR[spawn.type], {
      roughness: 0.55,
      emissive: LOOT_COLOR[spawn.type],
      emissiveIntensity: 0.12
    }));
    const y = getGroundHeightAt(spawn.x, spawn.z, 'farm') + 0.16;
    mesh.position.set(spawn.x, y, spawn.z);
    mesh.userData.lootType = spawn.type;
    mesh.userData.bob = Math.random() * Math.PI * 2;
    parent.add(mesh);
    items.push(mesh);
  });
  return items;
}

export function animateSurvivalLoot(items, time) {
  items.forEach(mesh => {
    mesh.rotation.y = time * 1.4;
    mesh.position.y = getGroundHeightAt(mesh.position.x, mesh.position.z, 'farm') + 0.16 + Math.sin(time * 2.4 + mesh.userData.bob) * 0.05;
  });
}

export function nearestLoot(pos, items, range = 1.7) {
  let best = null;
  let bestD = range;
  for (const mesh of items) {
    const d = Math.hypot(pos.x - mesh.position.x, pos.z - mesh.position.z);
    if (d < bestD) {
      bestD = d;
      best = mesh;
    }
  }
  return best;
}

export function collectLoot(state, mesh) {
  ensureSurvival(state);
  const type = mesh.userData.lootType;
  const labels = {
    bandage: 'Bandagem',
    food: 'Comida enlatada',
    water: 'Garrafa d\'água',
    ammo_pistola: 'Munição de pistola',
    ammo_espingarda: 'Cartuchos',
    vaccine: 'Soro',
    plane_supplies: 'Suprimentos do avião',
    plane_note: 'Bilhete do piloto'
  };
  if (type === 'bandage') state.bandages += 1;
  else if (type === 'food') state.cannedFood += 1;
  else if (type === 'water') state.bottledWater += 1;
  else if (type === 'vaccine') state.vaccines += 1;
  else if (type === 'ammo_pistola') state.ammo.pistola += MAG_SIZE.pistola * 2;
  else if (type === 'ammo_espingarda') state.ammo.espingarda += 4;
  else if (type === 'plane_supplies') { state.cannedFood += 1; state.bandages += 1; }
  else if (type === 'plane_note') state.foundPlaneNote = true;
  if (mesh.parent) mesh.parent.remove(mesh);
  return labels[type] || type;
}

export function lootLabel(type) {
  return {
    bandage: 'Bandagem (H)',
    food: 'Comida (G)',
    water: 'Água (T)',
    ammo_pistola: 'Munição de pistola',
    ammo_espingarda: 'Cartuchos',
    vaccine: 'Soro (V)',
    plane_supplies: 'Suprimentos do avião',
    plane_note: 'Bilhete do piloto'
  }[type] || type;
}
