import {
  setActiveObstacleArea,
  getActivePlayBounds,
  CAVE_POSITION,
  VILLAGE_PLAZA,
  LAKE_GATE,
  LAKE_AREA_CENTER,
  CAVE_EXIT_SPAWN,
  HOUSE_POSITION,
  BASEMENT_ENTER_SPAWN
} from './world.js';
import { getMap } from './mapLoader.js';
import { setAreaPreset } from './lighting.js';

export const AREA = {
  FARM: 'farm',
  CAVE: 'cave',
  VILLAGE: 'village',
  LAKE: 'lake',
  BASEMENT: 'basement'
};

export const PORTAL_RANGE = 2.6;

/** @type {'farm'|'cave'|'village'|'lake'} */
let currentArea = AREA.FARM;
let transitioning = false;
let farmRoot = null;
let caveRoot = null;
let villageRoot = null;
let lakeRoot = null;
let basementRoot = null;
let groundDecor = null;

const PORTALS = [];

export function applyMapPortals(map = getMap()) {
  PORTALS.length = 0;
  const list = map?.portals || [];
  for (const p of list) {
    PORTALS.push({
      id: p.id,
      from: p.from,
      to: p.to,
      position: { x: p.position.x, z: p.position.z },
      hint: p.hint,
      spawn: { x: p.spawn.x, z: p.spawn.z }
    });
  }
}

export function getCurrentArea() {
  return currentArea;
}

export function isTransitioning() {
  return transitioning;
}

export function getActiveBounds() {
  return getActivePlayBounds();
}

export function getAreaLabel(areaId = currentArea) {
  if (areaId === AREA.CAVE) return 'Caverna';
  if (areaId === AREA.VILLAGE) return 'Vila';
  if (areaId === AREA.LAKE) return 'Lago';
  if (areaId === AREA.BASEMENT) return 'Porão';
  return 'Fazenda';
}

export function setAreaRoots({ farm, cave, village, lake, basement, ground }) {
  farmRoot = farm;
  caveRoot = cave;
  villageRoot = village;
  lakeRoot = lake;
  basementRoot = basement;
  groundDecor = ground;
}

export function nearestPortal(playerPos, range = PORTAL_RANGE) {
  let best = null;
  let bestD = range;
  for (const portal of PORTALS) {
    if (portal.from !== currentArea) continue;
    const d = Math.hypot(playerPos.x - portal.position.x, playerPos.z - portal.position.z);
    if (d < bestD) {
      bestD = d;
      best = portal;
    }
  }
  return best;
}

function applyAreaVisibility(areaId) {
  const overworld = areaId === AREA.FARM || areaId === AREA.VILLAGE;
  if (farmRoot) farmRoot.visible = overworld;
  if (caveRoot) caveRoot.visible = areaId === AREA.CAVE;
  if (villageRoot) villageRoot.visible = overworld;
  if (lakeRoot) lakeRoot.visible = areaId === AREA.LAKE;
  if (basementRoot) basementRoot.visible = areaId === AREA.BASEMENT;
  if (groundDecor) {
    groundDecor.visible = overworld;
  }
}

export function applyAreaState(areaId) {
  currentArea = areaId;
  setActiveObstacleArea(areaId);
  applyAreaVisibility(areaId);
  setAreaPreset(areaId === AREA.BASEMENT ? 'basement' : 'overworld');
}

function ensureFadeEl() {
  let el = document.getElementById('area-fade');
  if (!el) {
    el = document.createElement('div');
    el.id = 'area-fade';
    document.body.appendChild(el);
  }
  return el;
}

function fadeTo(opacity, ms = 280) {
  const el = ensureFadeEl();
  return new Promise(resolve => {
    el.style.transition = `opacity ${ms}ms ease`;
    // force reflow so transition always runs
    void el.offsetWidth;
    el.style.opacity = String(opacity);
    el.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';
    setTimeout(resolve, ms + 20);
  });
}

/**
 * Troca de área com fade. onSwap roda no meio (teleporte, luz, etc).
 */
export async function transitionToArea(areaId, onSwap) {
  if (transitioning || areaId === currentArea) return false;
  transitioning = true;
  try {
    await fadeTo(1, 260);
    applyAreaState(areaId);
    if (onSwap) onSwap();
    await fadeTo(0, 300);
  } finally {
    transitioning = false;
  }
  return true;
}

/** Restaura área sem fade (load de save / boot). */
export function forceArea(areaId, onSwap) {
  applyAreaState(areaId || AREA.FARM);
  if (onSwap) onSwap();
}

export function getMinimapMarkers(areaId = currentArea) {
  if (areaId === AREA.CAVE) {
    return {
      house: null,
      village: null,
      cave: CAVE_POSITION,
      lake: null,
      exit: CAVE_EXIT_SPAWN
    };
  }
  if (areaId === AREA.VILLAGE) {
    return {
      house: HOUSE_POSITION,
      village: VILLAGE_PLAZA,
      cave: CAVE_POSITION,
      lake: LAKE_GATE,
      exit: null
    };
  }
  if (areaId === AREA.LAKE) {
    const lakeExit = PORTALS.find(p => p.id === 'lake_to_farm');
    return {
      house: null,
      village: null,
      cave: null,
      lake: LAKE_AREA_CENTER,
      exit: lakeExit?.position || null
    };
  }
  if (areaId === AREA.BASEMENT) {
    return {
      house: null,
      village: null,
      cave: null,
      lake: null,
      exit: BASEMENT_ENTER_SPAWN
    };
  }
  return {
    house: HOUSE_POSITION,
    village: VILLAGE_PLAZA,
    cave: CAVE_POSITION,
    lake: LAKE_GATE,
    exit: null
  };
}

export function getPortalDefs() {
  return PORTALS;
}
