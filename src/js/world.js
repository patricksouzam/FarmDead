import { getMap, parseColor } from './mapLoader.js';
import { AREA_BOUNDS, resetActiveBounds } from './terrain/obstacles.js';
import { DECOR_SLOTS } from './world/npcsAndVillage.js';
import { setFarmPlotBounds } from './terrain/heightmap.js';

export * from './terrain/obstacles.js';
export * from './world/sceneObjects.js';
export * from './world/npcsAndVillage.js';

// Valores iniciais iguais a src/maps/world.json; `applyWorldMap()` sincroniza após o load.
export const PLAY_BOUNDS = AREA_BOUNDS.farm;

export const PLAYER_SPAWN = { x: 0, z: -6 };
export const HOUSE_POSITION = { x: 0, z: -12 };
export const BARN_POSITION = { x: 14, z: -12 };
export const SILO_POSITION = { x: 18, z: -16 };
export const WINDMILL_POSITION = { x: 20, z: -8 };
export const CAVE_POSITION = { x: -24, z: 8 };
export const BASEMENT_POSITION = { x: 2.4, z: -13.5 };
export const BASEMENT_ENTER_SPAWN = { x: 2.4, z: -11.2 };
export const BASEMENT_EXIT_SPAWN = { x: 1.6, z: -12.6 };
export const LAKE_GATE = { x: 24, z: 8 };
export const LAKE_AREA_CENTER = { x: 18, z: 8 };
export const LAKE_POSITION = LAKE_AREA_CENTER;
export const DOCK_POSITION = { x: 14.5, z: 8 };
export const VILLAGE_PLAZA = { x: 0, z: 42 };
export const VILLAGE_GATE = { x: 0, z: 28 };
export const CAR_POSITION = { x: 5.5, z: -9.5 };
export const WELL_POSITION = { x: -6.5, z: -7.5 };
export const ARTESIAN_WELL_POSITION = { x: -10.5, z: -6.0 };
export const CORRAL_LAYOUT = { x: -12, z: -12, width: 5, depth: 4.5, gateSide: 'east' };
export const FENCES_LAYOUT = {
  boundsX: [-16, 16],
  boundsZ: [-18, 12],
  gateSide: 'north',
  gateWidth: 3.4
};
export const VILLAGE_LAYOUT = {
  merchantStand: { x: 8.2, z: 39.5 },
  supplierStand: { x: -8.2, z: 39.5 },
  govStand: { x: 0, z: 44.6 },
  merchantHome: { x: 10.6, z: 46.4 },
  supplierHome: { x: -10.6, z: 46.4 },
  govHome: { x: 0, z: 48.6 },
  bakery: { x: 8.4, z: 36.6 },
  stall: { x: -8.4, z: 36.8 },
  alarmBell: { x: 4.4, z: 46.2 },
  extraHomes: [],
  benches: [[-3.8, 40.2], [3.8, 40.2]],
  lamps: [[-4.8, 42.6], [4.8, 42.6], [0, 39.2], [10.2, 43.4], [-10.2, 43.4]],
  crates: [[1.8, 39.4], [-3.2, 42.8], [8.6, 40.8], [-7.4, 44.2], [5.2, 38.6]],
  planks: [[-1.4, 37.8, 0.9], [6.2, 45.4, -0.4], [-9.2, 40.6, 1.4]],
  corpseSpots: [
    { x: 2.4, z: 41.2, yaw: 1.2 },
    { x: -2.1, z: 43.4, yaw: -0.6 },
    { x: 7.4, z: 43.6, yaw: 2.4 },
    { x: -6.8, z: 38.4, yaw: 0.4 }
  ]
};

export const CAVE_ENTER_SPAWN = { x: -24, z: 7.2 };
export const CAVE_EXIT_SPAWN = { x: -24, z: 8.6 };
export const VILLAGE_ENTER_SPAWN = { x: 0, z: 35.5 };
export const FARM_FROM_CAVE_SPAWN = { x: -22.5, z: 9.2 };
export const FARM_FROM_VILLAGE_SPAWN = { x: 0, z: 26.2 };
export const LAKE_ENTER_SPAWN = { x: 15.5, z: 6.5 };
export const FARM_FROM_LAKE_SPAWN = { x: 21.5, z: 5.5 };

function assignXZ(target, src) {
  if (!target || !src) return;
  if (src.x != null) target.x = src.x;
  if (src.z != null) target.z = src.z;
}

export function applyWorldMap(map = getMap()) {
  if (!map) return;

  const overworld = map.bounds?.overworld;
  if (overworld) Object.assign(PLAY_BOUNDS, overworld);
  if (map.bounds?.lake) Object.assign(AREA_BOUNDS.lake, map.bounds.lake);
  if (map.bounds?.basement) Object.assign(AREA_BOUNDS.basement, map.bounds.basement);
  if (map.bounds?.cave) Object.assign(AREA_BOUNDS.cave, map.bounds.cave);

  assignXZ(PLAYER_SPAWN, map.playerSpawn);
  const L = map.landmarks || {};
  assignXZ(HOUSE_POSITION, L.house);
  assignXZ(BARN_POSITION, L.barn);
  assignXZ(SILO_POSITION, L.silo);
  assignXZ(WINDMILL_POSITION, L.windmill);
  assignXZ(CAVE_POSITION, L.cave);
  assignXZ(BASEMENT_POSITION, L.basement);
  assignXZ(LAKE_GATE, L.lakeGate);
  assignXZ(LAKE_AREA_CENTER, L.lakeAreaCenter);
  assignXZ(DOCK_POSITION, L.dock);
  assignXZ(VILLAGE_PLAZA, L.plaza);
  assignXZ(VILLAGE_GATE, L.villageGate);
  assignXZ(CAR_POSITION, L.car);
  assignXZ(WELL_POSITION, L.well);
  assignXZ(ARTESIAN_WELL_POSITION, L.artesianWell);

  const S = map.spawns || {};
  assignXZ(CAVE_ENTER_SPAWN, S.caveEnter);
  assignXZ(CAVE_EXIT_SPAWN, S.caveExit);
  assignXZ(VILLAGE_ENTER_SPAWN, S.villageEnter);
  assignXZ(FARM_FROM_CAVE_SPAWN, S.farmFromCave);
  assignXZ(FARM_FROM_VILLAGE_SPAWN, S.farmFromVillage);
  assignXZ(LAKE_ENTER_SPAWN, S.lakeEnter);
  assignXZ(FARM_FROM_LAKE_SPAWN, S.farmFromLake);
  assignXZ(BASEMENT_ENTER_SPAWN, S.basementEnter);
  assignXZ(BASEMENT_EXIT_SPAWN, S.basementExit);

  if (map.corral) Object.assign(CORRAL_LAYOUT, map.corral);
  if (map.fences) {
    FENCES_LAYOUT.boundsX = map.fences.boundsX || FENCES_LAYOUT.boundsX;
    FENCES_LAYOUT.boundsZ = map.fences.boundsZ || FENCES_LAYOUT.boundsZ;
    if (map.fences.gateSide) FENCES_LAYOUT.gateSide = map.fences.gateSide;
    if (map.fences.gateWidth != null) FENCES_LAYOUT.gateWidth = map.fences.gateWidth;
  }

  const V = map.village || {};
  assignXZ(VILLAGE_LAYOUT.merchantStand, V.merchantStand);
  assignXZ(VILLAGE_LAYOUT.supplierStand, V.supplierStand);
  assignXZ(VILLAGE_LAYOUT.govStand, V.govStand);
  assignXZ(VILLAGE_LAYOUT.merchantHome, V.merchantHome);
  assignXZ(VILLAGE_LAYOUT.supplierHome, V.supplierHome);
  assignXZ(VILLAGE_LAYOUT.govHome, V.govHome);
  assignXZ(VILLAGE_LAYOUT.bakery, V.bakery);
  assignXZ(VILLAGE_LAYOUT.stall, V.stall);
  assignXZ(VILLAGE_LAYOUT.alarmBell, V.alarmBell);
  VILLAGE_LAYOUT.benches = V.benches || VILLAGE_LAYOUT.benches;
  VILLAGE_LAYOUT.lamps = V.lamps || VILLAGE_LAYOUT.lamps;
  VILLAGE_LAYOUT.crates = V.crates || VILLAGE_LAYOUT.crates;
  VILLAGE_LAYOUT.planks = V.planks || VILLAGE_LAYOUT.planks;
  VILLAGE_LAYOUT.corpseSpots = V.corpseSpots || VILLAGE_LAYOUT.corpseSpots;
  VILLAGE_LAYOUT.extraHomes = (V.extraHomes || []).map(home => ({
    x: home.x,
    z: home.z,
    wall: parseColor(home.wall, 0xe4c9a4),
    roof: parseColor(home.roof, 0x6a3a28),
    yaw: home.yaw || 0
  }));

  if (map.decorSlots) {
    Object.keys(map.decorSlots).forEach(key => {
      DECOR_SLOTS[key] = map.decorSlots[key];
    });
  }

  if (map.farmPlotBounds) setFarmPlotBounds(map.farmPlotBounds);
  resetActiveBounds();
}
