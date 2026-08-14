import {
  setActiveObstacleArea,
  getActivePlayBounds,
  CAVE_POSITION,
  VILLAGE_PLAZA,
  VILLAGE_GATE,
  CAVE_EXIT_SPAWN,
  CAVE_ENTER_SPAWN,
  VILLAGE_ENTER_SPAWN,
  FARM_FROM_CAVE_SPAWN,
  FARM_FROM_VILLAGE_SPAWN
} from './world.js';

export const AREA = {
  FARM: 'farm',
  CAVE: 'cave',
  VILLAGE: 'village'
};

export const PORTAL_RANGE = 2.6;

/** @type {'farm'|'cave'|'village'} */
let currentArea = AREA.FARM;
let transitioning = false;
let farmRoot = null;
let caveRoot = null;
let villageRoot = null;
let groundDecor = null;

const PORTALS = [
  {
    id: 'farm_to_cave',
    from: AREA.FARM,
    to: AREA.CAVE,
    position: CAVE_POSITION,
    hint: 'E — Entrar na caverna',
    spawn: CAVE_ENTER_SPAWN
  },
  {
    id: 'cave_to_farm',
    from: AREA.CAVE,
    to: AREA.FARM,
    position: CAVE_EXIT_SPAWN,
    hint: 'E — Sair da caverna',
    spawn: FARM_FROM_CAVE_SPAWN
  },
  {
    id: 'farm_to_village',
    from: AREA.FARM,
    to: AREA.VILLAGE,
    position: VILLAGE_GATE,
    hint: 'E — Ir à vila',
    spawn: VILLAGE_ENTER_SPAWN
  },
  {
    id: 'village_to_farm',
    from: AREA.VILLAGE,
    to: AREA.FARM,
    position: { x: VILLAGE_PLAZA.x, z: VILLAGE_PLAZA.z - 6.5 },
    hint: 'E — Voltar à fazenda',
    spawn: FARM_FROM_VILLAGE_SPAWN
  }
];

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
  return 'Fazenda';
}

export function setAreaRoots({ farm, cave, village, ground }) {
  farmRoot = farm;
  caveRoot = cave;
  villageRoot = village;
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
  if (farmRoot) farmRoot.visible = areaId === AREA.FARM;
  if (caveRoot) caveRoot.visible = areaId === AREA.CAVE;
  if (villageRoot) villageRoot.visible = areaId === AREA.VILLAGE;
  if (groundDecor) {
    // Chão/montanhas/grama só no overworld (fazenda e vila compartilham o terreno)
    groundDecor.visible = areaId !== AREA.CAVE;
  }
}

export function applyAreaState(areaId) {
  currentArea = areaId;
  setActiveObstacleArea(areaId);
  applyAreaVisibility(areaId);
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
      house: null,
      village: VILLAGE_PLAZA,
      cave: null,
      lake: null,
      exit: PORTALS.find(p => p.id === 'village_to_farm').position
    };
  }
  return {
    house: { x: 0, z: -8 },
    village: VILLAGE_GATE,
    cave: CAVE_POSITION,
    lake: { x: 18, z: 8 },
    exit: null
  };
}

export function getPortalDefs() {
  return PORTALS;
}
