import * as THREE from 'three';
import {
  makeGrassTexture, makeDirtTexture, makeTilledDirtTexture,
  makeWoodTexture, makeRoofTexture, makeStoneTexture
} from './textures.js';
import { buildLowPolyHumanoid } from './characters.js';
import { voxelBox, voxelStairRoof, buildVoxelTree, buildVoxelCloud, voxelMat } from './voxel.js';
import { createTerrainForArea } from './terrain/terrainMesh.js';
import { getGroundHeightAt, FARM_BASE_HEIGHT, setFarmPlotBounds } from './terrain/heightmap.js';
import { getMap, parseColor } from './mapLoader.js';
import { createLantern } from './lighting.js';

// Altura andável do terreno plano da fazenda — MESMA convenção de
// getGroundHeightAt/placeOnTerrain (FARM_BASE_HEIGHT + 1, topo do bloco +1,
// não FARM_BASE_HEIGHT puro). Usada onde é mais direto somar um valor fixo
// em vez de chamar placeOnTerrain (ex.: offsets relativos dentro de
// buildFenceLoop, ou o collar decorativo).
const FARM_TERRAIN_TOP_Y = FARM_BASE_HEIGHT + 1;

export { getGroundHeightAt };

/** "Senta" um Object3D sobre o heightmap da área — mesma X/Z, Y ajustado. */
export function placeOnTerrain(object3D, x, z, areaId = 'farm') {
  const y = getGroundHeightAt(x, z, areaId);
  object3D.position.set(x, y, z);
  return y;
}

// ---------------------------------------------------------------------------
// Direção de arte — Voxel / Cube World.
// Construções e props em caixas empilhadas; casas proporcionais aos NPCs.
// ---------------------------------------------------------------------------

const areaObstacles = {
  farm: [],
  cave: [],
  village: [],
  lake: [],
  basement: []
};
let registrationArea = 'farm';
let activeObstacles = areaObstacles.farm;
let activeBounds = null;

// Valores iniciais iguais a src/maps/world.json; `applyWorldMap()` sincroniza após o load.
export const PLAY_BOUNDS = { minX: -28, maxX: 28, minZ: -24, maxZ: 52 };
export const AREA_BOUNDS = {
  farm: PLAY_BOUNDS,
  cave: { minX: -27.2, maxX: -20.8, minZ: 4.8, maxZ: 11.2 },
  village: PLAY_BOUNDS,
  lake: { minX: 6, maxX: 30, minZ: -4, maxZ: 20 },
  basement: { minX: -0.6, maxX: 5.4, minZ: -16.5, maxZ: -10.5 }
};
activeBounds = AREA_BOUNDS.farm;

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
  activeBounds = AREA_BOUNDS.farm;
}

export function beginObstacleRegistration(areaId = 'farm') {
  registrationArea = areaObstacles[areaId] ? areaId : 'farm';
}

export function setActiveObstacleArea(areaId = 'farm') {
  activeObstacles = areaObstacles[areaId] || areaObstacles.farm;
  activeBounds = AREA_BOUNDS[areaId] || AREA_BOUNDS.farm;
}

export function getActivePlayBounds() {
  return activeBounds || AREA_BOUNDS.farm;
}

function registerObstacle(x, z, radius, areaId) {
  const key = areaId || registrationArea || 'farm';
  if (!areaObstacles[key]) areaObstacles[key] = [];
  areaObstacles[key].push({ kind: 'circle', x, z, radius });
}

export function registerBoxObstacle(x, z, hx, hz, areaId) {
  const key = areaId || registrationArea || 'farm';
  if (!areaObstacles[key]) areaObstacles[key] = [];
  areaObstacles[key].push({ kind: 'box', x, z, hx: Math.max(0.08, hx), hz: Math.max(0.08, hz) });
}

export function registerOrientedBox(x, z, width, depth, yaw = 0, areaId) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  registerBoxObstacle(x, z, (width / 2) * c + (depth / 2) * s, (width / 2) * s + (depth / 2) * c, areaId);
}

export function registerObstaclePublic(x, z, radius, areaId) {
  registerObstacle(x, z, radius, areaId);
}

export function getObstacles(areaId) {
  if (areaId) return areaObstacles[areaId] || [];
  return activeObstacles;
}

function closestOnObstacle(o, x, z) {
  if (o.kind === 'box') {
    return {
      x: Math.max(o.x - o.hx, Math.min(x, o.x + o.hx)),
      z: Math.max(o.z - o.hz, Math.min(z, o.z + o.hz))
    };
  }
  return { x: o.x, z: o.z };
}

function isBlocked(x, z, margin, list = activeObstacles) {
  for (const o of list) {
    const p = closestOnObstacle(o, x, z);
    const dx = x - p.x;
    const dz = z - p.z;
    if (o.kind === 'box' && dx === 0 && dz === 0) return true;
    const minDist = o.kind === 'box' ? margin : (o.radius + margin);
    if (Math.hypot(dx, dz) < minDist) return true;
  }
  return false;
}

function pushOutOfObstacle(o, x, z, margin) {
  if (o.kind === 'box') {
    const insideX = Math.abs(x - o.x) <= o.hx;
    const insideZ = Math.abs(z - o.z) <= o.hz;
    if (insideX && insideZ) {
      const ox = o.hx - Math.abs(x - o.x);
      const oz = o.hz - Math.abs(z - o.z);
      if (ox < oz) x = o.x + Math.sign(x - o.x || 1) * (o.hx + margin);
      else z = o.z + Math.sign(z - o.z || 1) * (o.hz + margin);
      return { x, z };
    }
    const p = closestOnObstacle(o, x, z);
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < margin) {
      if (dist > 1e-5) {
        const push = (margin + 0.002) / dist;
        return { x: p.x + dx * push, z: p.z + dz * push };
      }
      return { x: x + margin, z };
    }
    return { x, z };
  }

  const dx = x - o.x;
  const dz = z - o.z;
  const minDist = o.radius + margin;
  const dist = Math.hypot(dx, dz);
  if (dist < minDist) {
    if (dist > 1e-4) {
      const push = minDist / dist;
      return { x: o.x + dx * push, z: o.z + dz * push };
    }
    return { x: o.x + minDist, z };
  }
  return { x, z };
}

export function avoidObstacles(x, z, margin = 0.3, areaId = null) {
  const list = areaId ? (areaObstacles[areaId] || []) : activeObstacles;
  for (let pass = 0; pass < 4; pass++) {
    for (const o of list) {
      const next = pushOutOfObstacle(o, x, z, margin);
      x = next.x;
      z = next.z;
    }
  }
  return { x, z };
}

export function resolveMovement(fromX, fromZ, toX, toZ, margin = 0.3, areaId = null) {
  const list = areaId ? (areaObstacles[areaId] || []) : activeObstacles;
  const start = avoidObstacles(fromX, fromZ, margin, areaId);
  const fx = start.x;
  const fz = start.z;

  if (!isBlocked(toX, toZ, margin, list)) return { x: toX, z: toZ };
  if (!isBlocked(toX, fz, margin, list)) return { x: toX, z: fz };
  if (!isBlocked(fx, toZ, margin, list)) return { x: fx, z: toZ };

  const dx = toX - fx;
  const dz = toZ - fz;
  const dist = Math.hypot(dx, dz);
  if (dist > 1e-5) {
    const base = Math.atan2(dx, dz);
    for (const a of [0.35, -0.35, 0.7, -0.7, 1.15, -1.15]) {
      const nx = fx + Math.sin(base + a) * dist;
      const nz = fz + Math.cos(base + a) * dist;
      if (!isBlocked(nx, nz, margin, list)) return { x: nx, z: nz };
    }
  }

  return { x: fx, z: fz };
}

export function resolveEntityBump(x, z, radius, others) {
  for (const o of others) {
    if (!o) continue;
    const dx = x - o.x;
    const dz = z - o.z;
    const min = radius + (o.radius || 0.35);
    const dist = Math.hypot(dx, dz);
    if (dist < min && dist > 1e-4) {
      const push = (min - dist) / dist;
      x += dx * push * 0.85;
      z += dz * push * 0.85;
    }
  }
  return { x, z };
}

const textures = {
  grass: makeGrassTexture(),
  dirt: makeDirtTexture(),
  tilled: makeTilledDirtTexture(),
  wood: makeWoodTexture(),
  roof: makeRoofTexture(),
  stone: makeStoneTexture()
};
textures.grass.repeat.set(28, 28);
textures.dirt.repeat.set(2, 2);
textures.tilled.repeat.set(1, 1);
textures.wood.repeat.set(1, 2);
textures.roof.repeat.set(4, 4);
textures.stone.repeat.set(2, 2);

// Paleta mais saturada e contrastante que a original — tons "premium"
// puxados para cores primárias vivas em vez de bege/marrom lavado, para
// que os volumes leiam com clareza mesmo sob luz difusa.
const palette = {
  wallCream: 0xfbf1d8,
  wallBarnRed: 0xd13a24,
  trimWhite: 0xffffff,
  roofSlate: 0x4d5b66,
  roofBarn: 0x7a2a20,
  roofHouse: 0xc23324,
  woodLight: 0xb3854f,
  woodMid: 0x8f6038,
  woodDark: 0x4a3221,
  metalDark: 0x2c2c2c,
  metalMid: 0x9aa0a6,
  metalLight: 0xd8dde2,
  stoneGrey: 0xa3a39a,
  foliageA: 0x4fa32f,
  foliageB: 0x3c8a28,
  foliageC: 0x69c243,
  grassGround: 0x5cb03e,
  mountainRock: 0x7d5a72,
  mountainRockLight: 0x9673a3,
  rockGrey: 0x9a9690,
  rockGreyLight: 0xb5b0a8
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.68, metalness: 0.04, ...opts });
}
function texMat(map, opts = {}) {
  return new THREE.MeshStandardMaterial({ map, flatShading: true, roughness: 0.7, ...opts });
}

function makeZzzTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = '#eaf3ff';
  ctx.strokeStyle = 'rgba(40,60,90,0.9)';
  ctx.lineWidth = 4;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('Z', 64, 68);
  ctx.fillText('Z', 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const zzzTexture = makeZzzTexture();

function makeCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const blobs = [[40, 38, 22], [64, 30, 26], [88, 38, 20], [56, 44, 18], [76, 46, 16]];
  blobs.forEach(([x, y, r]) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const cloudTexture = makeCloudTexture();

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5eb8ef);
  // Névoa sutil — mantém horizonte soft sem lavar o contraste voxel.
  scene.fog = new THREE.FogExp2(0x12182a, 0.016);
  return scene;
}

export function createSky(scene) {
  const uniforms = {
    topColor: { value: new THREE.Color(0x1a72d8) },
    bottomColor: { value: new THREE.Color(0xb8e8ff) },
    offset: { value: 18 },
    exponent: { value: 0.55 }
  };
  const skyGeo = new THREE.SphereGeometry(320, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        float t = max(pow(max(h, 0.0), exponent), 0.0);
        // Faixa de horizonte um pouco mais clara (estilo Cube World)
        float horizon = smoothstep(0.0, 0.18, h) * (1.0 - smoothstep(0.18, 0.45, h));
        vec3 col = mix(bottomColor, topColor, t);
        col += vec3(0.08, 0.05, 0.02) * horizon;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'skyDome';
  scene.add(sky);
  return uniforms;
}

export function createClouds(scene) {
  const group = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const scale = 2.2 + Math.random() * 4.2;
    const cloud = buildVoxelCloud(scale);
    const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 35 + Math.random() * 85;
    cloud.position.set(
      Math.cos(angle) * dist,
      24 + Math.random() * 18,
      Math.sin(angle) * dist
    );
    cloud.rotation.y = Math.random() * Math.PI * 2;
    cloud.userData.driftSpeed = 0.35 + Math.random() * 0.55;
    cloud.userData.bobPhase = Math.random() * Math.PI * 2;
    cloud.userData.baseY = cloud.position.y;
    group.add(cloud);
  }
  scene.add(group);
  return group;
}

/** Sol voxel luminoso + corona (bloom pega o emissive). */
export function createSun(scene) {
  const group = new THREE.Group();
  const coreMat = voxelMat(0xfff2a0, {
    emissive: 0xffc84a,
    emissiveIntensity: 1.6,
    roughness: 0.35,
    metalness: 0.05
  });
  const glowMat = voxelMat(0xffe07a, {
    emissive: 0xffaa33,
    emissiveIntensity: 0.9,
    roughness: 0.6,
    transparent: true,
    opacity: 0.55
  });

  const core = voxelBox(5.2, 5.2, 5.2, coreMat, { castShadow: false, receiveShadow: false });
  group.add(core);

  const mid = voxelBox(7.2, 7.2, 7.2, glowMat, { castShadow: false, receiveShadow: false });
  mid.rotation.set(0.2, 0.35, 0.1);
  group.add(mid);

  // Raios em cruz (cubos alongados)
  const rayMat = voxelMat(0xffe8a8, {
    emissive: 0xffcc55,
    emissiveIntensity: 1.1,
    roughness: 0.5,
    transparent: true,
    opacity: 0.7
  });
  [[10, 1.1, 1.1], [1.1, 10, 1.1], [1.1, 1.1, 10]].forEach(([w, h, d]) => {
    const ray = voxelBox(w, h, d, rayMat, { castShadow: false, receiveShadow: false });
    group.add(ray);
  });

  group.visible = true;
  scene.add(group);
  return group;
}

/** Lua voxel suave (visível à noite). */
export function createMoon(scene) {
  const group = new THREE.Group();
  const moonMat = voxelMat(0xe8eef8, {
    emissive: 0xa8b8d8,
    emissiveIntensity: 0.55,
    roughness: 0.85
  });
  const core = voxelBox(3.6, 3.6, 3.6, moonMat, { castShadow: false, receiveShadow: false });
  group.add(core);
  const crater = voxelBox(1.1, 0.4, 1.1, voxelMat(0xc8d0e0, { roughness: 1 }), {
    castShadow: false, receiveShadow: false
  });
  crater.position.set(0.7, 0.9, 0.5);
  group.add(crater);
  group.visible = false;
  scene.add(group);
  return group;
}

/**
 * Sistema de ventania: direção, força base e rajadas.
 * Afeta nuvens, moinho, árvores, grama e folhas voadoras.
 */
export function createWindSystem(scene) {
  const leaves = new THREE.Group();
  const leafColors = [0x6bc24a, 0x4fa32f, 0xc2a03a, 0xd45a3a];
  for (let i = 0; i < 28; i++) {
    const leaf = voxelBox(0.18, 0.06, 0.12, leafColors[i % leafColors.length], {
      castShadow: false, receiveShadow: false
    });
    leaf.position.set(
      (Math.random() - 0.5) * 50,
      1 + Math.random() * 8,
      (Math.random() - 0.5) * 50
    );
    leaf.userData.spin = 1 + Math.random() * 3;
    leaf.userData.fall = 0.4 + Math.random() * 0.8;
    leaf.userData.phase = Math.random() * Math.PI * 2;
    leaves.add(leaf);
  }
  scene.add(leaves);

  return {
    angle: 0.35,
    strength: 0.7,
    gust: 0,
    time: 0,
    leaves
  };
}

export function updateWind(wind, delta) {
  wind.time += delta;
  wind.gust = Math.max(0, wind.gust - delta * 0.55);
  // Rajadas ocasionais
  if (Math.random() < 0.009 * delta * 60) {
    wind.gust = 1.15 + Math.random() * 1.7;
  }
  const breathe = 0.62 + Math.sin(wind.time * 0.22) * 0.28 + Math.sin(wind.time * 0.07) * 0.16;
  wind.strength = breathe + wind.gust;
  wind.angle += Math.sin(wind.time * 0.05) * 0.015 * delta;
  return wind;
}

export function applyWindEffects({ wind, treesGroup, grassGroup, windmill, clouds, delta }) {
  if (!wind) return;
  const t = wind.time;
  const strength = wind.strength;
  const dx = Math.cos(wind.angle);
  const dz = Math.sin(wind.angle);
  const sway = strength * 0.055;

  if (treesGroup) {
    const eyes = treesGroup.userData.eyesGroup;
    treesGroup.children.forEach((tree, i) => {
      if (tree === eyes) return;
      const phase = t * (1.1 + strength * 0.35) + i * 0.85;
      tree.rotation.z = Math.sin(phase) * sway * (0.7 + dx * 0.5);
      tree.rotation.x = Math.sin(phase * 0.85 + 0.4) * sway * 0.55 * (0.7 + dz * 0.5);
    });
  }

  if (grassGroup) {
    grassGroup.children.forEach((tuft, i) => {
      const phase = t * (2.2 + strength) + i * 0.4;
      tuft.rotation.z = Math.sin(phase) * sway * 1.8 * dx;
      tuft.rotation.x = Math.sin(phase * 0.9) * sway * 1.2 * dz;
    });
  }

  if (windmill?.hub) {
    windmill.hub.rotation.z += delta * (1.1 + strength * 2.4);
  }

  if (clouds) {
    const speedMul = 0.8 + strength * 1.6;
    clouds.children.forEach((cloud, i) => {
      const spd = (cloud.userData.driftSpeed || 0.4) * speedMul;
      cloud.position.x += dx * spd * delta;
      cloud.position.z += dz * spd * delta * 0.55;
      const bob = Math.sin(t * 0.4 + (cloud.userData.bobPhase || i)) * 0.35;
      cloud.position.y = (cloud.userData.baseY || cloud.position.y) + bob;
      if (cloud.position.x > 140) cloud.position.x = -140;
      if (cloud.position.x < -140) cloud.position.x = 140;
      if (cloud.position.z > 140) cloud.position.z = -140;
      if (cloud.position.z < -140) cloud.position.z = 140;
    });
  }

  if (wind.leaves) {
    const leafSpeed = 3 + strength * 6;
    wind.leaves.children.forEach((leaf) => {
      leaf.position.x += dx * leafSpeed * delta;
      leaf.position.z += dz * leafSpeed * delta * 0.7;
      leaf.position.y += Math.sin(t * leaf.userData.spin + leaf.userData.phase) * 0.6 * delta
        - leaf.userData.fall * delta * 0.35;
      leaf.rotation.x += leaf.userData.spin * delta;
      leaf.rotation.y += leaf.userData.spin * 0.7 * delta;
      if (leaf.position.y < 0.3) leaf.position.y = 2 + Math.random() * 6;
      if (leaf.position.x > PLAY_BOUNDS.maxX + 4) leaf.position.x = PLAY_BOUNDS.minX - 4;
      if (leaf.position.x < PLAY_BOUNDS.minX - 4) leaf.position.x = PLAY_BOUNDS.maxX + 4;
      if (leaf.position.z > PLAY_BOUNDS.maxZ + 4) leaf.position.z = PLAY_BOUNDS.minZ - 4;
      if (leaf.position.z < PLAY_BOUNDS.minZ - 4) leaf.position.z = PLAY_BOUNDS.maxZ + 4;
    });
  }
}

export { createLighting as createLights } from './lighting.js';

export function createGround(scene, worldSeed = 12345) {
  const size = 90; // colar/coleção decorativa (montanhas etc.) mantém o raio visual original

  // Bounds do terreno EM BLOCOS: cobre só a área navegável real da fazenda
  // (PLAY_BOUNDS) com uma margem pequena — gerar blocos até size/2=45 em
  // cada eixo custava ~17k instâncias sombreadas (91x91 colunas), pesado
  // demais para o primeiro frame. A "moldura" visual distante continua
  // coberta pelo collar/montanhas (meshes únicos, baratos), não pelo motor
  // de blocos. Sem lakePosition aqui — o lago agora é uma área própria (ver
  // fishing.js createLake + AREA_BOUNDS.lake), gerada separadamente.
  const terrainMargin = 6;
  const terrainBounds = {
    minX: PLAY_BOUNDS.minX - terrainMargin, maxX: PLAY_BOUNDS.maxX + terrainMargin,
    minZ: PLAY_BOUNDS.minZ - terrainMargin, maxZ: PLAY_BOUNDS.maxZ + terrainMargin
  };
  const { group: terrainGroup } = createTerrainForArea('farm', terrainBounds, worldSeed, null);
  terrainGroup.name = 'voxelTerrain';
  scene.add(terrainGroup);

  const collarMat = new THREE.MeshStandardMaterial({
    color: palette.grassGround, roughness: 0.95, flatShading: true
  });
  // Raio interno do anel = borda do terreno em blocos (evita um vão sem
  // chão entre o fim do voxel e o início do collar decorativo).
  const collarInnerRadius = Math.max(Math.abs(terrainBounds.minX), Math.abs(terrainBounds.maxX), Math.abs(terrainBounds.minZ), Math.abs(terrainBounds.maxZ)) + 1;
  const collar = new THREE.Mesh(new THREE.RingGeometry(collarInnerRadius, collarInnerRadius + 24, 40), collarMat);
  collar.rotation.x = -Math.PI / 2;
  collar.position.y = FARM_TERRAIN_TOP_Y - 0.05;
  collar.receiveShadow = true;
  scene.add(collar);

  const mountainGroup = createMountains(scene);
  const rocksGroup = createRocks(scene);
  const grassGroup = createGrassTufts(scene);

  // Pacote de overworld (chão + props) — oculto dentro da caverna
  const overworldDecor = new THREE.Group();
  overworldDecor.name = 'overworldDecor';
  scene.add(overworldDecor);
  overworldDecor.attach(terrainGroup);
  overworldDecor.attach(collar);
  if (mountainGroup?.parent) overworldDecor.attach(mountainGroup);
  if (rocksGroup?.parent) overworldDecor.attach(rocksGroup);
  if (grassGroup?.parent) overworldDecor.attach(grassGroup);

  // "ground" é agora um container leve (não a malha em si, que virou um
  // THREE.Group de InstancedMesh) — mantém a mesma API de userData que o
  // resto do código (main.js) já consome.
  const ground = new THREE.Group();
  ground.name = 'groundContainer';
  ground.userData.baseCollarColor = palette.grassGround;
  ground.userData.collarMat = collarMat;
  ground.userData.mountainGroup = mountainGroup;
  ground.userData.grassGroup = grassGroup;
  ground.userData.overworldDecor = overworldDecor;
  ground.userData.terrainGroup = terrainGroup;
  return ground;
}

function createGrassTufts(scene) {
  const group = new THREE.Group();
  const bladeMat = mat(palette.foliageA, { roughness: 0.9 });
  const flowerMats = [0xe85d6a, 0xf0d24a, 0xd0e8ff].map(c => mat(c, { roughness: 0.7 }));

  for (let i = 0; i < 55; i++) {
    const tuft = new THREE.Group();
    const blades = 3 + (i % 3);
    for (let b = 0; b < blades; b++) {
      const h = 0.18 + (b % 3) * 0.08;
      const blade = voxelBox(0.06, h, 0.06, bladeMat);
      blade.position.set((b - 1) * 0.08, h / 2, (b % 2) * 0.05);
      tuft.add(blade);
    }
    if (i % 5 === 0) {
      const flower = voxelBox(0.1, 0.1, 0.1, flowerMats[i % flowerMats.length]);
      flower.position.y = 0.28;
      tuft.add(flower);
    }
    const angle = (i / 55) * Math.PI * 2;
    const dist = 10 + (i % 7) * 3.5;
    let x = Math.cos(angle) * dist;
    let z = Math.sin(angle) * dist;
    if (Math.abs(x) < 10 && z > -8 && z < 14) x += Math.sign(x || 1) * 12;
    if (Math.hypot(x - CAVE_POSITION.x, z - CAVE_POSITION.z) < 6) continue;
    if (Math.hypot(x - LAKE_GATE.x, z - LAKE_GATE.z) < 6) continue;
    tuft.position.set(x, FARM_TERRAIN_TOP_Y, z);
    group.add(tuft);
  }

  const bushMat = mat(palette.foliageB, { roughness: 0.85 });
  const bushSpots = getMap()?.bushes || [[-14, 14], [14, 14], [-16, -16], [18, -14], [16, 34], [-16, 34]];
  bushSpots.forEach(([x, z]) => {
    const bush = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const lobe = voxelBox(0.55 + j * 0.1, 0.5, 0.55 + j * 0.1, bushMat);
      lobe.userData.isFoliage = true;
      lobe.userData.baseFoliage = palette.foliageB;
      lobe.position.set((j - 1) * 0.25, 0.3, (j % 2) * 0.12);
      bush.add(lobe);
    }
    bush.position.set(x, FARM_TERRAIN_TOP_Y, z);
    group.add(bush);
  });

  scene.add(group);
  return group;
}

// Cordilheira Low Poly ao redor do campo jogável: cones facetados (poucos
// segmentos radiais, sem suavização de normais) em cor sólida contrastante —
// nas referências as montanhas nunca usam a mesma textura pintada da grama,
// leem como blocos geométricos distintos vistos de longe.
function createMountains(scene) {
  const group = new THREE.Group();
  const colors = [palette.mountainRock, palette.mountainRockLight];
  const snowMat = mat(0xeef6fb, { roughness: 0.75 });
  const ringRadius = Math.max(
    Math.abs(PLAY_BOUNDS.minX), Math.abs(PLAY_BOUNDS.maxX),
    Math.abs(PLAY_BOUNDS.minZ), Math.abs(PLAY_BOUNDS.maxZ)
  ) + 14;
  const count = 28;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = ringRadius + (i % 5) * 2.5;
    const layers = 4 + (i % 4);
    const peak = new THREE.Group();
    for (let L = 0; L < layers; L++) {
      const s = 8 - L * 1.5;
      const block = voxelBox(s, 2.2, s, colors[i % colors.length]);
      block.position.y = 1.1 + L * 2.0;
      peak.add(block);
    }
    const snow = voxelBox(3.5, 1.4, 3.5, snowMat);
    snow.position.y = 1.1 + layers * 2.0;
    snow.userData.isSnowCap = true;
    peak.add(snow);
    peak.position.set(Math.cos(angle) * dist, FARM_TERRAIN_TOP_Y, Math.sin(angle) * dist);
    peak.rotation.y = angle;
    group.add(peak);
  }

  scene.add(group);
  return group;
}

// Pedras soltas espalhadas pelo campo — clusters voxel.
function buildRockCluster(rockMat, rockMatLight) {
  const group = new THREE.Group();
  const main = voxelBox(0.55, 0.4, 0.5, Math.random() > 0.5 ? rockMat : rockMatLight);
  main.position.y = 0.2;
  group.add(main);
  const frag = voxelBox(0.3, 0.25, 0.28, Math.random() > 0.5 ? rockMat : rockMatLight);
  frag.position.set(0.28, 0.12, 0.1);
  group.add(frag);
  return group;
}

function createRocks(scene) {
  const group = new THREE.Group();
  const rockMat = mat(palette.rockGrey, { roughness: 0.9 });
  const rockMatLight = mat(palette.rockGreyLight, { roughness: 0.9 });

  const positions = getMap()?.rocks || [
    [-20, -8], [22, -4], [-18, 12], [18, 12],
    [-22, 4], [10, -18], [-8, -18], [24, -16], [-24, -14]
  ];

  positions.forEach(([x, z]) => {
    const cluster = buildRockCluster(rockMat, rockMatLight);
    const scale = 0.8 + Math.random() * 0.6;
    const px = x + (Math.random() - 0.5) * 2;
    const pz = z + (Math.random() - 0.5) * 2;
    cluster.position.set(px, FARM_TERRAIN_TOP_Y, pz);
    cluster.rotation.y = Math.random() * Math.PI * 2;
    cluster.scale.setScalar(scale);
    group.add(cluster);
    registerObstacle(px, pz, 0.44 * scale, 'farm');
  });

  scene.add(group);
  return group;
}

// `routes`: array de { points: [[x,z], ...], width? } — cada rota é uma polyline
// (2+ pontos) que liga pontos de interesse com trechos retos e curvas nos vértices
// intermediários, formando uma rede de caminhos coerente (hub na casa, ramais mais
// estreitos para dependências secundárias).
export function createPaths(scene, routes, baseY = FARM_TERRAIN_TOP_Y) {
  const group = new THREE.Group();

  routes.forEach(route => {
    const width = route.width || 1.8;
    const pts = route.points;
    const capGeo = new THREE.CircleGeometry(width / 2, 10);
    const capMat = texMat(textures.dirt, { roughness: 0.95 });

    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const segTex = textures.dirt.clone();
      segTex.needsUpdate = true;
      segTex.repeat.set(Math.max(1, Math.round(length / 2)), 1);
      const segMat = texMat(segTex, { roughness: 0.95 });

      const geo = new THREE.PlaneGeometry(length + width * 0.5, width, 1, 1);
      const mesh = new THREE.Mesh(geo, segMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -angle;
      mesh.position.set((ax + bx) / 2, getGroundHeightAt((ax + bx) / 2, (az + bz) / 2, 'farm') + 0.03, (az + bz) / 2);
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    pts.forEach(([px, pz]) => {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.rotation.x = -Math.PI / 2;
      cap.position.set(px, getGroundHeightAt(px, pz, 'farm') + 0.03, pz);
      cap.receiveShadow = true;
      group.add(cap);
    });
  });

  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Cercas
// ---------------------------------------------------------------------------

// Constrói um laço de cerca (fechado ou aberto) a partir de uma lista ordenada de
// pontos [x,z]: um poste facetado em cada ponto, e entre cada par de pontos
// consecutivos, travessas e fios ESTICADOS com o comprimento exato do vão — assim
// toda peça horizontal encosta fisicamente no poste seguinte. Reaproveitada por
// createFences e createCorral. `closed: true` fecha o último ponto de volta ao primeiro.
function buildFenceLoop(group, points, { closed = true, postMat, capMat, plankMat, wireMat, areaId = 'farm' } = {}) {
  const postW = 0.2;
  const postH = 1.42;
  const plankH = 0.16;
  const plankT = 0.07;

  function addPost(x, z) {
    const post = voxelBox(postW, postH, postW, postMat);
    post.position.set(x, FARM_TERRAIN_TOP_Y + postH / 2, z);
    group.add(post);
    const cap = voxelBox(0.26, 0.08, 0.26, capMat);
    cap.position.set(x, FARM_TERRAIN_TOP_Y + postH + 0.03, z);
    group.add(cap);
  }

  function addSpan(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.2) return;
    const angle = Math.atan2(dx, dz);
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const plankLen = Math.max(0.2, length - 0.18);

    [0.38, 0.78, 1.16].forEach(h => {
      const plank = voxelBox(plankT, plankH, plankLen, plankMat);
      plank.position.set(mx, FARM_TERRAIN_TOP_Y + h, mz);
      plank.rotation.y = angle;
      group.add(plank);
    });

    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, plankLen, 5),
      wireMat
    );
    wire.position.set(mx, FARM_TERRAIN_TOP_Y + 1.34, mz);
    wire.rotation.order = 'YXZ';
    wire.rotation.y = angle;
    wire.rotation.x = Math.PI / 2;
    group.add(wire);

    registerOrientedBox(mx, mz, plankT + 0.18, length, angle, areaId);
  }

  points.forEach(p => addPost(p[0], p[1]));
  const n = points.length;
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    addSpan(a[0], a[1], b[0], b[1]);
  }
}

// Cerca da propriedade da fazenda. Opcionalmente deixa um vão (portão) no
// lado indicado — 'north' = maxZ (rumo à estrada/vila), 'south' = minZ, etc.
export function createFences(scene, boundsX, boundsZ, opts = {}) {
  const group = new THREE.Group();
  group.name = 'farmFence';
  const postMat = voxelMat(palette.woodDark, { roughness: 0.78 });
  const capMat = voxelMat(0x3a2a1c, { roughness: 0.7 });
  const plankMat = voxelMat(palette.woodMid, { roughness: 0.82 });
  const wireMat = mat(0xa8a090, { roughness: 0.4, metalness: 0.55, flatShading: false });

  const [minX, maxX] = boundsX;
  const [minZ, maxZ] = boundsZ;
  const step = 1.35;
  const gateSide = opts.gateSide || null;
  const gateWidth = opts.gateWidth ?? 3.4;

  const perimeter = [];
  for (let x = minX; x < maxX; x += step) perimeter.push([x, minZ]);
  for (let z = minZ; z < maxZ; z += step) perimeter.push([maxX, z]);
  for (let x = maxX; x > minX; x -= step) perimeter.push([x, maxZ]);
  for (let z = maxZ; z > minZ; z -= step) perimeter.push([minX, z]);

  const fenceOpts = { closed: !gateSide, postMat, capMat, plankMat, wireMat, areaId: 'farm' };

  if (!gateSide) {
    buildFenceLoop(group, perimeter, fenceOpts);
    scene.add(group);
    return { group, gate: null, bounds: { minX, maxX, minZ, maxZ } };
  }

  const gateX = gateSide === 'east' ? maxX : gateSide === 'west' ? minX : (minX + maxX) / 2;
  const gateZ = gateSide === 'north' ? maxZ : gateSide === 'south' ? minZ : (minZ + maxZ) / 2;

  function distAlongGateSide([x, z]) {
    if (gateSide === 'north' && Math.abs(z - maxZ) < 1e-6) return Math.abs(x - gateX);
    if (gateSide === 'south' && Math.abs(z - minZ) < 1e-6) return Math.abs(x - gateX);
    if (gateSide === 'east' && Math.abs(x - maxX) < 1e-6) return Math.abs(z - gateZ);
    if (gateSide === 'west' && Math.abs(x - minX) < 1e-6) return Math.abs(z - gateZ);
    return Infinity;
  }

  let gateVertexIdx = 0;
  let bestDist = Infinity;
  perimeter.forEach((p, i) => {
    const d = distAlongGateSide(p);
    if (d < bestDist) { bestDist = d; gateVertexIdx = i; }
  });
  const rotated = [...perimeter.slice(gateVertexIdx), ...perimeter.slice(0, gateVertexIdx)];
  const openPerimeter = rotated.filter(p => distAlongGateSide(p) >= gateWidth / 2 - 1e-6);

  buildFenceLoop(group, openPerimeter, { ...fenceOpts, closed: false });

  const half = gateWidth / 2;
  if (gateSide === 'north' || gateSide === 'south') {
    [[gateX - half, gateZ], [gateX + half, gateZ]].forEach(([x, z]) => {
      const post = voxelBox(0.3, 1.9, 0.3, postMat);
      post.position.set(x, FARM_TERRAIN_TOP_Y + 0.95, z);
      group.add(post);
      const capital = voxelBox(0.42, 0.14, 0.42, capMat);
      capital.position.set(x, FARM_TERRAIN_TOP_Y + 1.92, z);
      group.add(capital);
      const lanternGlassMat = voxelMat(0x3a2f10, {
        emissive: 0xffb347, emissiveIntensity: 1.1, roughness: 0.4, transparent: true, opacity: 0.9
      });
      const lantern = voxelBox(0.14, 0.18, 0.14, lanternGlassMat);
      lantern.position.set(x, FARM_TERRAIN_TOP_Y + 1.72, z);
      group.add(lantern);
      const { light: lanternLight } = createLantern({ color: 0xffc878, intensity: 0.9, range: 7, decay: 1.8 });
      lanternLight.position.copy(lantern.position);
      group.add(lanternLight);
    });
    const beam = voxelBox(gateWidth + 0.2, 0.16, 0.2, plankMat);
    beam.position.set(gateX, FARM_TERRAIN_TOP_Y + 1.98, gateZ);
    group.add(beam);
    const signFrame = voxelBox(1.5, 0.6, 0.1, plankMat);
    signFrame.position.set(gateX, FARM_TERRAIN_TOP_Y + 2.25, gateZ + 0.13);
    group.add(signFrame);
    const sign = voxelBox(1.3, 0.44, 0.06, voxelMat(0xc9b48a, { roughness: 0.7 }));
    sign.position.set(gateX, FARM_TERRAIN_TOP_Y + 2.25, gateZ + 0.17);
    group.add(sign);
  }

  scene.add(group);
  return { group, gate: { x: gateX, z: gateZ, width: gateWidth, side: gateSide }, bounds: { minX, maxX, minZ, maxZ } };
}

// Cerca menor e fechada para o curral de animais, com um vão sem fios/travessas
// (o "portão") centrado no lado indicado por `gateSide` ('north'|'south'|'east'|'west').
// Retorna { group, gate: {x, z, width}, bounds } para o main.js posicionar animais/porteira.
export function createCorral(scene, centerX, centerZ, width, depth, gateSide = 'south') {
  const group = new THREE.Group();
  const postMat = voxelMat(palette.woodLight, { roughness: 0.82 });
  const capMat = voxelMat(palette.woodDark, { roughness: 0.75 });
  const plankMat = voxelMat(0xb08958, { roughness: 0.8 });
  const wireMat = mat(0x8d8d82, { roughness: 0.55, metalness: 0.55, flatShading: false });

  const minX = centerX - width / 2, maxX = centerX + width / 2;
  const minZ = centerZ - depth / 2, maxZ = centerZ + depth / 2;
  const step = 1.0;
  const gateWidth = Math.min(1.8, gateSide === 'north' || gateSide === 'south' ? width - 0.5 : depth - 0.5);

  const perimeter = [];
  for (let x = minX; x < maxX; x += step) perimeter.push([x, minZ]);
  for (let z = minZ; z < maxZ; z += step) perimeter.push([maxX, z]);
  for (let x = maxX; x > minX; x -= step) perimeter.push([x, maxZ]);
  for (let z = maxZ; z > minZ; z -= step) perimeter.push([minX, z]);

  const gateX = gateSide === 'east' ? maxX : gateSide === 'west' ? minX : centerX;
  const gateZ = gateSide === 'north' ? minZ : gateSide === 'south' ? maxZ : centerZ;

  function distAlongGateSide([x, z]) {
    if (gateSide === 'north' && Math.abs(z - minZ) < 1e-6) return Math.abs(x - gateX);
    if (gateSide === 'south' && Math.abs(z - maxZ) < 1e-6) return Math.abs(x - gateX);
    if (gateSide === 'east' && Math.abs(x - maxX) < 1e-6) return Math.abs(z - gateZ);
    if (gateSide === 'west' && Math.abs(x - minX) < 1e-6) return Math.abs(z - gateZ);
    return Infinity;
  }

  let gateVertexIdx = 0;
  let bestDist = Infinity;
  perimeter.forEach((p, i) => {
    const d = distAlongGateSide(p);
    if (d < bestDist) { bestDist = d; gateVertexIdx = i; }
  });
  const rotated = [...perimeter.slice(gateVertexIdx), ...perimeter.slice(0, gateVertexIdx)];
  const openPerimeter = rotated.filter(p => distAlongGateSide(p) >= gateWidth / 2 - 1e-6);

  buildFenceLoop(group, openPerimeter, {
    closed: false, postMat, capMat, plankMat, wireMat, areaId: 'farm'
  });

  scene.add(group);
  return { group, gate: { x: gateX, z: gateZ, width: gateWidth, side: gateSide }, bounds: { minX, maxX, minZ, maxZ } };
}

// ---------------------------------------------------------------------------
// Árvores
// ---------------------------------------------------------------------------

// Copa Low Poly: um núcleo icosaédrico central com 2-3 lóbulos menores fundidos,
// formando uma silhueta arredondada mas facetada — leitura clara de "bloco de
// folhagem" à distância sem virar uma esfera perfeitamente lisa.
function buildCanopy(leafMat, baseRadius) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(baseRadius, 0), leafMat);
  core.userData.isFoliage = true;
  core.castShadow = true;
  group.add(core);

  const lobeCount = 3;
  for (let i = 0; i < lobeCount; i++) {
    const angle = (i / lobeCount) * Math.PI * 2 + Math.random() * 0.6;
    const r = baseRadius * (0.55 + Math.random() * 0.15);
    const lobe = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat);
    lobe.userData.isFoliage = true;
    lobe.position.set(
      Math.cos(angle) * baseRadius * 0.55,
      baseRadius * (0.25 + Math.random() * 0.35),
      Math.sin(angle) * baseRadius * 0.55
    );
    lobe.rotation.set(Math.random(), Math.random(), Math.random());
    lobe.castShadow = true;
    group.add(lobe);
  }

  const topLobe = new THREE.Mesh(new THREE.IcosahedronGeometry(baseRadius * 0.62, 0), leafMat);
  topLobe.userData.isFoliage = true;
  topLobe.position.y = baseRadius * 0.8;
  topLobe.castShadow = true;
  group.add(topLobe);

  return group;
}

// Copa cônica (silhueta de pinheiro): 3 anéis de cones facetados decrescentes
// empilhados, para dar variedade de silhueta em relação à copa arredondada —
// nas referências a mata mistura os dois formatos, não só blobs redondos.
function buildConicalCanopy(leafMat, baseRadius) {
  const group = new THREE.Group();
  const tiers = [
    { y: 0, r: baseRadius * 1.05, h: baseRadius * 1.1 },
    { y: baseRadius * 0.85, r: baseRadius * 0.8, h: baseRadius * 1.0 },
    { y: baseRadius * 1.6, r: baseRadius * 0.55, h: baseRadius * 0.9 }
  ];
  tiers.forEach(t => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 6), leafMat);
    cone.userData.isFoliage = true;
    cone.position.y = t.y + t.h / 2;
    cone.castShadow = true;
    group.add(cone);
  });
  return group;
}

function buildTrunk(trunkMat, height, baseRadius, topRadius) {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(topRadius, baseRadius, height, 6);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const rootGeo = new THREE.ConeGeometry(baseRadius * 1.35, baseRadius * 1.2, 6);
  const root = new THREE.Mesh(rootGeo, trunkMat);
  root.position.y = baseRadius * 0.5;
  root.castShadow = true;
  group.add(root);

  return group;
}

// Tronco nu com galhos secos finos, usado nas árvores "mortas" da mata.
function buildDeadTree(trunkMat) {
  const tree = new THREE.Group();
  tree.add(buildTrunk(trunkMat, 2.8, 0.36, 0.16));

  const branchSpecs = [
    { y: 2.5, len: 1.1, tilt: 0.9, rotY: 0.4 },
    { y: 2.9, len: 0.9, tilt: 1.1, rotY: 2.6 },
    { y: 2.2, len: 0.8, tilt: 1.3, rotY: 4.4 },
    { y: 3.3, len: 0.6, tilt: 0.7, rotY: 5.5 }
  ];
  branchSpecs.forEach(b => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, b.len, 5), trunkMat);
    branch.position.y = b.len / 2;
    const pivot = new THREE.Group();
    pivot.position.y = b.y;
    pivot.rotation.y = b.rotY;
    pivot.rotation.z = b.tilt;
    pivot.add(branch);
    branch.castShadow = true;
    tree.add(pivot);
  });

  return tree;
}

// Cria as duas "esferinhas" emissivas de um par de olhos espreitando na mata,
// visíveis apenas à noite (visibilidade controlada de fora via userData/group.visible).
function buildLurkingEyes(x, y, z, rotY) {
  const group = new THREE.Group();
  const eyeMat = mat(0x1a0500, { emissive: 0xffcf3a, emissiveIntensity: 1.4, roughness: 0.4 });
  const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
  [-0.09, 0.09].forEach(dx => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(dx, 0, 0);
    group.add(eye);
  });
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

export function createTrees(scene) {
  const group = new THREE.Group();
  const foliage = [palette.foliageA, palette.foliageB, palette.foliageC];

  const positions = getMap()?.trees || [
    [-26, -16], [26, -16], [-26, 8], [26, 8],
    [0, -22], [-10, -22], [10, -22], [-18, 24], [18, 24]
  ];

  const eyesGroup = new THREE.Group();

  positions.forEach((pos, idx) => {
    const scale = 0.85 + (idx % 5) * 0.08;
    const tree = buildVoxelTree(scale, foliage[idx % foliage.length], palette.woodMid);
    placeOnTerrain(tree, pos[0], pos[1], 'farm');
    tree.rotation.y = (idx * 0.7) % (Math.PI * 2);
    tree.traverse(obj => {
      if (obj.isMesh) {
        const isTrunk = obj.material?.color?.getHex?.() === palette.woodMid;
        obj.userData.isFoliage = !isTrunk;
        obj.userData.baseFoliage = foliage[idx % foliage.length];
      }
    });
    const snowCap = voxelBox(0.7 * scale, 0.35 * scale, 0.7 * scale, 0xeef6fb);
    snowCap.position.y = 2.2 * scale;
    snowCap.userData.isSnowCap = true;
    snowCap.visible = false;
    tree.add(snowCap);
    group.add(tree);
    registerObstacle(pos[0], pos[1], 0.9 * scale);

    if (idx % 3 === 0) {
      const angleToCenter = Math.atan2(-pos[1], -pos[0]) + Math.PI / 2;
      const eyesX = pos[0] * 0.9;
      const eyesZ = pos[1] * 0.9;
      const eyesY = getGroundHeightAt(eyesX, eyesZ, 'farm') + 1.1;
      const eyes = buildLurkingEyes(eyesX, eyesY, eyesZ, angleToCenter);
      eyesGroup.add(eyes);
    }
  });

  eyesGroup.visible = false;
  group.add(eyesGroup);
  group.userData.eyesGroup = eyesGroup;
  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Moinho
// ---------------------------------------------------------------------------

export function createWindmill(scene) {
  const group = new THREE.Group();
  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const bladeMat = mat(0xf0e6cc, { roughness: 0.55 });
  const hubMat = mat(palette.woodDark, { roughness: 0.7 });

  // Torre em caixas empilhadas
  for (let i = 0; i < 5; i++) {
    const s = 1.1 - i * 0.1;
    const block = voxelBox(s, 0.9, s, woodMat);
    block.position.y = 0.45 + i * 0.9;
    group.add(block);
  }
  voxelStairRoof(group, { width: 1.0, depth: 1.0, baseY: 4.5, color: palette.roofSlate, layers: 2, stepH: 0.25, overhang: 0.15 });

  const hub = new THREE.Group();
  hub.position.set(0, 4.2, 0.55);
  const hubCore = voxelBox(0.35, 0.35, 0.35, hubMat);
  hub.add(hubCore);
  for (let i = 0; i < 4; i++) {
    const blade = voxelBox(0.22, 1.8, 0.08, bladeMat);
    blade.position.y = 1.0;
    const pivot = new THREE.Group();
    pivot.rotation.z = (Math.PI / 2) * i;
    pivot.add(blade);
    hub.add(pivot);
  }
  group.add(hub);

  placeOnTerrain(group, WINDMILL_POSITION.x, WINDMILL_POSITION.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.85);
  return { group, hub };
}

// ---------------------------------------------------------------------------
// Casa
// ---------------------------------------------------------------------------

export function createHouse(scene, level) {
  const group = new THREE.Group();
  placeOnTerrain(group, HOUSE_POSITION.x, HOUSE_POSITION.z, 'farm');
  scene.add(group);
  buildHouse(group, level);
  const w = group.userData.width || 5.2;
  const d = group.userData.depth || 4.4;
  registerOrientedBox(group.position.x, group.position.z, w, d, 0, 'farm');
  return group;
}

export function buildHouse(group, level) {
  while (group.children.length) group.remove(group.children[0]);

  const wallMat = mat(palette.wallCream, { roughness: 0.78 });
  const woodMat = mat(palette.woodLight, { roughness: 0.85 });
  const trimMat = mat(palette.trimWhite, { roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffd89a, roughness: 0.28, metalness: 0.08, transparent: true, opacity: 0.9, flatShading: true,
    emissive: 0xffc878, emissiveIntensity: 0.55
  });

  const width = level === 1 ? 5.2 : 6.6;
  const depth = level === 1 ? 4.4 : 5.4;
  const height = level === 1 ? 3.6 : 4.4;

  const plinthMat = mat(palette.stoneGrey, { roughness: 0.88 });
  const plinthH = 0.35;
  const plinth = voxelBox(width + 0.1, plinthH, depth + 0.1, plinthMat);
  plinth.position.y = -plinthH / 2;
  group.add(plinth);

  const base = voxelBox(width, height, depth, wallMat);
  base.position.y = height / 2;
  group.add(base);

  voxelStairRoof(group, {
    width, depth, baseY: height,
    color: palette.roofHouse,
    layers: level === 1 ? 3 : 4,
    stepH: 0.26,
    overhang: 0.25
  });

  const chimney = voxelBox(0.45, 1.15, 0.45, palette.stoneGrey);
  chimney.position.set(-width * 0.25, height + 1.15, -depth * 0.15);
  group.add(chimney);
  group.userData.chimney = chimney;

  // Anexo lateral (alcova) para quebrar a silhueta de caixa única.
  const annexW = width * 0.34;
  const annexD = depth * 0.62;
  const annexH = height * 0.68;
  const annexGroup = new THREE.Group();
  annexGroup.position.set(width / 2 + annexW / 2 - 0.05, 0, -depth / 2 + annexD / 2 + 0.15);
  const annex = voxelBox(annexW, annexH, annexD, wallMat);
  annex.position.y = annexH / 2;
  annexGroup.add(annex);
  voxelStairRoof(annexGroup, {
    width: annexW, depth: annexD, baseY: annexH,
    color: palette.roofHouse, layers: 2, stepH: 0.22, overhang: 0.16
  });
  group.add(annexGroup);

  const windowPositions = level === 1
    ? [[-1.15, depth / 2 + 0.03]]
    : [[-1.7, depth / 2 + 0.03], [1.7, depth / 2 + 0.03]];

  windowPositions.forEach(([wx]) => {
    const frame = voxelBox(0.95, 0.9, 0.12, trimMat);
    frame.position.set(wx, height * 0.52, depth / 2 + 0.02);
    group.add(frame);
    const glass = voxelBox(0.7, 0.65, 0.06, glassMat);
    glass.position.set(wx, height * 0.52, depth / 2 + 0.08);
    group.add(glass);
  });

  const sideFrame = voxelBox(0.1, 0.85, 0.75, trimMat);
  sideFrame.position.set(-width / 2 - 0.02, height * 0.55, depth * 0.1);
  group.add(sideFrame);
  const sideGlass = voxelBox(0.06, 0.6, 0.55, glassMat);
  sideGlass.position.set(-width / 2 - 0.08, height * 0.55, depth * 0.1);
  group.add(sideGlass);

  const door = voxelBox(0.95, 2.1, 0.1, 0x8a5a3a);
  door.position.set(width / 2 - 1.05, 1.05, depth / 2 + 0.05);
  group.add(door);
  const knob = voxelBox(0.08, 0.08, 0.08, 0xd8b23a);
  knob.position.set(width / 2 - 1.35, 1.05, depth / 2 + 0.12);
  group.add(knob);

  const porchDepth = 1.7;
  const porchFloor = voxelBox(width + 0.4, 0.14, porchDepth, woodMat);
  porchFloor.position.set(0, 0.07, depth / 2 + porchDepth / 2);
  group.add(porchFloor);

  voxelStairRoof(group, {
    width: width + 0.2,
    depth: porchDepth,
    baseY: height * 0.72,
    color: palette.roofHouse,
    layers: 2,
    stepH: 0.18,
    overhang: 0.1
  });
  // shift porch roof forward
  const porchRoofY = height * 0.72;
  group.children.forEach(child => {
    if (child.position.y > porchRoofY && child.position.y < porchRoofY + 0.5 && Math.abs(child.position.z) < 0.01) {
      // leave stair roof at origin; add simple porch slabs instead below
    }
  });

  [-width / 2 + 0.15, width / 2 - 0.15].forEach(px => {
    const pillar = voxelBox(0.16, height * 0.7, 0.16, woodMat);
    pillar.position.set(px, height * 0.35, depth / 2 + porchDepth - 0.15);
    group.add(pillar);
  });

  const lanternGroup = new THREE.Group();
  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0x3a2f10, emissive: 0xffb347, emissiveIntensity: 0, roughness: 0.4, transparent: true, opacity: 0.9, flatShading: true
  });
  const cage = voxelBox(0.16, 0.2, 0.16, palette.metalDark);
  cage.position.set(0, 0, 0);
  lanternGroup.add(cage);
  const lanternGlass = voxelBox(0.12, 0.14, 0.12, lanternGlassMat);
  lanternGroup.add(lanternGlass);
  const { light: lanternLight } = createLantern({
    color: 0xffc878,
    intensity: 0,
    range: 12,
    decay: 1.7,
    nightOnly: true,
    nightIntensity: 2.4,
    glassMat: lanternGlassMat,
    glassEmissive: 1.6
  });
  lanternGroup.add(lanternLight);
  lanternGroup.position.set(-width / 4, height * 0.7, depth / 2 + porchDepth - 0.2);
  group.add(lanternGroup);
  group.userData.lantern = { light: lanternLight, glassMat: lanternGlassMat };

  const npcGroup = buildRockingChairNpc(woodMat);
  npcGroup.position.set(width / 2 - 0.9, 0.14, depth / 2 + porchDepth - 0.55);
  group.add(npcGroup);
  group.userData.npc = npcGroup;

  const sleepGroup = buildSleepIndicator();
  sleepGroup.position.set(width / 2 - 0.9, height * 0.95, depth / 2 - 0.3);
  sleepGroup.visible = false;
  group.add(sleepGroup);
  group.userData.sleepIndicator = sleepGroup;

  group.userData.width = width;
  group.userData.depth = depth;
  group.userData.height = height;
}

function buildSleepIndicator() {
  const group = new THREE.Group();
  const zMat = new THREE.SpriteMaterial({ map: zzzTexture, transparent: true, depthWrite: false });

  [[0, 0, 0.34], [0.22, 0.28, 0.46], [0.42, 0.58, 0.58]].forEach(([x, y, scale]) => {
    const sprite = new THREE.Sprite(zMat);
    sprite.position.set(x, y, 0);
    sprite.scale.setScalar(scale);
    sprite.userData.baseY = y;
    group.add(sprite);
  });

  return group;
}

function buildRockingChairNpc(woodMat) {
  const chairGroup = new THREE.Group();

  const seat = voxelBox(0.55, 0.1, 0.5, woodMat);
  seat.position.y = 0.5;
  chairGroup.add(seat);

  const back = voxelBox(0.55, 0.6, 0.08, woodMat);
  back.position.set(0, 0.85, -0.22);
  chairGroup.add(back);

  [-0.22, 0.22].forEach(x => {
    const rocker = voxelBox(0.1, 0.08, 0.7, woodMat);
    rocker.position.set(x, 0.1, 0);
    chairGroup.add(rocker);
    const leg = voxelBox(0.08, 0.4, 0.08, woodMat);
    leg.position.set(x, 0.3, 0.15);
    chairGroup.add(leg);
  });

  const npcPivot = buildLowPolyHumanoid({
    shirt: 0x3f7cbf,
    pants: 0x35507a,
    skin: 0xf3c6a0,
    accessory: 'hat',
    hatColor: 0xe0b03a,
    pose: 'seated',
    overalls: true
  });
  npcPivot.position.set(0, 0.1, -0.05);
  chairGroup.add(npcPivot);

  const mustache = voxelBox(0.2, 0.045, 0.05, 0x8a6b3d);
  mustache.position.set(0, 0.08, 0.18);
  npcPivot.userData.headPivot.add(mustache);

  chairGroup.userData.pivot = npcPivot;
  return chairGroup;
}

// ---------------------------------------------------------------------------
// Carro
// ---------------------------------------------------------------------------

export function createCar(scene) {
  const group = new THREE.Group();
  placeOnTerrain(group, CAR_POSITION.x, CAR_POSITION.z, 'farm');
  group.rotation.y = Math.PI;
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 1.6);
  return group;
}

export function buildCar(group, visible) {
  while (group.children.length) group.remove(group.children[0]);
  if (!visible) return;

  const bodyMat = mat(0x2e7d32, { roughness: 0.45, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8f5, transparent: true, opacity: 0.8, flatShading: true });
  const wheelMat = mat(0x1a1a1a, { roughness: 0.9 });
  const trimMat = mat(0xd8d8d8, { roughness: 0.4, metalness: 0.4 });

  const chassis = voxelBox(1.6, 0.45, 3.2, bodyMat);
  chassis.position.y = 0.45;
  group.add(chassis);
  const cabin = voxelBox(1.4, 0.55, 1.4, bodyMat);
  cabin.position.set(0, 0.95, 0.1);
  group.add(cabin);
  const glass = voxelBox(1.2, 0.4, 1.2, glassMat);
  glass.position.set(0, 0.95, 0.1);
  group.add(glass);

  [[0.85, 0.35, 1.0], [-0.85, 0.35, 1.0], [0.85, 0.35, -1.0], [-0.85, 0.35, -1.0]].forEach(([x, y, z]) => {
    const wheel = voxelBox(0.28, 0.55, 0.55, wheelMat);
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  const bumperF = voxelBox(1.7, 0.2, 0.2, trimMat);
  bumperF.position.set(0, 0.4, -1.7);
  group.add(bumperF);
  const bumperB = voxelBox(1.7, 0.2, 0.2, trimMat);
  bumperB.position.set(0, 0.4, 1.7);
  group.add(bumperB);

  [[0.5, 0.5, -1.7], [-0.5, 0.5, -1.7]].forEach(([x, y, z]) => {
    const hl = voxelBox(0.22, 0.18, 0.1, 0xfff8d0);
    hl.position.set(x, y, z);
    group.add(hl);
  });
}

// ---------------------------------------------------------------------------
// Celeiro
// ---------------------------------------------------------------------------

export function createBarn(scene) {
  const group = new THREE.Group();
  const wallMat = mat(palette.wallBarnRed, { roughness: 0.8 });
  const trimMat = mat(palette.trimWhite, { roughness: 0.6 });
  const woodMat = mat(palette.woodDark, { roughness: 0.85 });

  const width = 6.4;
  const depth = 5.6;
  const wallHeight = 4.5;

  const base = voxelBox(width, wallHeight, depth, wallMat);
  base.position.y = wallHeight / 2;
  group.add(base);

  voxelStairRoof(group, {
    width, depth, baseY: wallHeight,
    color: palette.roofSlate,
    layers: 4,
    stepH: 0.3,
    overhang: 0.32
  });

  const door = voxelBox(1.9, 2.5, 0.12, woodMat);
  door.position.set(0, 1.25, depth / 2 + 0.06);
  group.add(door);
  const loft = voxelBox(1.1, 1.0, 0.1, trimMat);
  loft.position.set(0, 3.35, depth / 2 + 0.05);
  group.add(loft);

  placeOnTerrain(group, BARN_POSITION.x, BARN_POSITION.z, 'farm');
  group.rotation.y = -0.15;
  scene.add(group);
  registerOrientedBox(group.position.x, group.position.z, width, depth, group.rotation.y, 'farm');
  return group;
}

// ---------------------------------------------------------------------------
// Silo
// ---------------------------------------------------------------------------

export function createSilo(scene) {
  const group = new THREE.Group();
  const metalMat = mat(palette.metalLight, { roughness: 0.5, metalness: 0.3 });
  const trimMat = mat(0x8a2c22, { roughness: 0.45 });

  for (let i = 0; i < 5; i++) {
    const ring = voxelBox(2.2, 0.95, 2.2, metalMat);
    ring.position.y = 0.5 + i * 0.95;
    group.add(ring);
    const band = voxelBox(2.32, 0.12, 2.32, trimMat);
    band.position.y = 0.95 + i * 0.95;
    group.add(band);
  }
  voxelStairRoof(group, { width: 2.2, depth: 2.2, baseY: 4.85, color: 0x8a2c22, layers: 2, stepH: 0.3, overhang: 0.12 });

  placeOnTerrain(group, SILO_POSITION.x, SILO_POSITION.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 1.45);
  return group;
}

// ---------------------------------------------------------------------------
// NPCs fixos — Mercador e Fornecedora
// ---------------------------------------------------------------------------

// Figura humana simplificada (torso + cabeça + braços + pernas em blocos),
// reaproveitando a mesma linguagem de baixo-poli do fazendeiro na cadeira,
// mas sem o rig completo de assento — estes NPCs ficam de pé, parados, com
// só um leve balanço de respiração aplicado externamente via userData.headPivot.
function buildStandingNpc({ shirt, pants, skin, accessory }) {
  return buildLowPolyHumanoid({ shirt, pants, skin, accessory, pose: 'standing' });
}

// Mercador (compra colheitas/produtos, entrega pedidos especiais) — fica perto
// do celeiro, com um cesto de vime ao lado para reforçar a leitura de "comprador".
function faceToward(npc, targetX, targetZ) {
  npc.rotation.y = Math.atan2(targetX - npc.position.x, targetZ - npc.position.z);
}

export function createMerchantNpc(scene) {
  const npc = buildStandingNpc({ shirt: 0x3f7cbf, pants: 0x35507a, skin: 0xdba374, accessory: 'hat' });

  const basketMat = mat(0x9a6a3a, { roughness: 0.85 });
  const basket = voxelBox(0.4, 0.28, 0.35, basketMat);
  basket.position.set(0.45, 0.18, 0.1);
  npc.add(basket);

  const stand = VILLAGE_LAYOUT.merchantStand;
  placeOnTerrain(npc, stand.x, stand.z, 'farm');
  faceToward(npc, VILLAGE_PLAZA.x, VILLAGE_PLAZA.z);
  npc.userData.isNpc = true;
  npc.userData.npcId = 'merchant';
  npc.userData.standPosition = { x: stand.x, z: stand.z };
  npc.userData.homeShelter = { x: VILLAGE_LAYOUT.merchantHome.x, z: VILLAGE_LAYOUT.merchantHome.z };
  scene.add(npc);
  return npc;
}

// Fornecedora (vende sementes/itens especiais, dá dicas de história) — fica
// perto da entrada/caminho principal, com um carrinho de sementes simplificado.
export function createSupplierNpc(scene) {
  const npc = buildStandingNpc({ shirt: 0x6a8f4a, pants: 0x4a3f6a, skin: 0xe8c8a0, accessory: 'scarf' });

  const cartMat = mat(0x8a5a3a, { roughness: 0.85 });
  const cartBed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.36), cartMat);
  cartBed.position.set(-0.5, 0.22, 0);
  npc.add(cartBed);
  const wheelMat = mat(0x2a2a2a, { roughness: 0.7 });
  [-0.15, 0.15].forEach(z => {
    const wheel = voxelBox(0.08, 0.24, 0.24, wheelMat);
    wheel.position.set(-0.5, 0.12, z * 1.1);
    npc.add(wheel);
  });
  const sackMat = mat(0xc9b56a, { roughness: 0.9 });
  [[-0.42, 0.42, 0.05], [-0.58, 0.4, -0.05]].forEach(([x, y, z]) => {
    const sack = voxelBox(0.22, 0.22, 0.22, sackMat);
    sack.position.set(x, y, z);
    npc.add(sack);
  });

  const stand = VILLAGE_LAYOUT.supplierStand;
  placeOnTerrain(npc, stand.x, stand.z, 'farm');
  faceToward(npc, VILLAGE_PLAZA.x, VILLAGE_PLAZA.z);
  npc.userData.isNpc = true;
  npc.userData.npcId = 'supplier';
  npc.userData.standPosition = { x: stand.x, z: stand.z };
  npc.userData.homeShelter = { x: VILLAGE_LAYOUT.supplierHome.x, z: VILLAGE_LAYOUT.supplierHome.z };
  scene.add(npc);
  return npc;
}

// Fiscal do governo (autoriza a perfuração do poço artesiano) — fica perto da
// entrada principal, com uma prancheta simplificada no lugar do cesto/carrinho.
export function createGovOfficialNpc(scene) {
  const npc = buildStandingNpc({ shirt: 0x4c5eac, pants: 0x2c3a6e, skin: 0xe0b088, accessory: 'hat' });

  const clipboardMat = mat(0x8a5a3a, { roughness: 0.8 });
  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.03), clipboardMat);
  clipboard.position.set(0.4, 0.5, 0.15);
  clipboard.rotation.y = -0.3;
  npc.add(clipboard);
  const clipboardPaper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.01), mat(0xf4f0e6, { roughness: 0.9 }));
  clipboardPaper.position.set(0.4, 0.52, 0.17);
  clipboardPaper.rotation.y = -0.3;
  npc.add(clipboardPaper);

  const stand = VILLAGE_LAYOUT.govStand;
  placeOnTerrain(npc, stand.x, stand.z, 'farm');
  faceToward(npc, VILLAGE_PLAZA.x, VILLAGE_PLAZA.z);
  npc.userData.isNpc = true;
  npc.userData.npcId = 'gov';
  npc.userData.standPosition = { x: stand.x, z: stand.z };
  npc.userData.homeShelter = { x: VILLAGE_LAYOUT.govHome.x, z: VILLAGE_LAYOUT.govHome.z };
  scene.add(npc);
  return npc;
}

// ---------------------------------------------------------------------------
// Poço (upgrade: aumenta a capacidade máxima de água)
// ---------------------------------------------------------------------------

export function createWell(scene) {
  const group = new THREE.Group();
  const stoneMat = mat(palette.stoneGrey, { roughness: 0.9 });
  const woodMat = mat(palette.woodMid, { roughness: 0.85 });

  const ring = voxelBox(1.4, 0.7, 1.4, stoneMat);
  ring.position.y = 0.35;
  group.add(ring);
  const inner = voxelBox(0.9, 0.2, 0.9, 0x3a6a8a);
  inner.position.y = 0.55;
  group.add(inner);
  [-0.55, 0.55].forEach(x => {
    const post = voxelBox(0.12, 1.3, 0.12, woodMat);
    post.position.set(x, 1.0, 0);
    group.add(post);
  });
  const beam = voxelBox(1.3, 0.12, 0.12, woodMat);
  beam.position.set(0, 1.65, 0);
  group.add(beam);
  voxelStairRoof(group, { width: 1.5, depth: 1.0, baseY: 1.7, color: palette.roofSlate, layers: 2, stepH: 0.18, overhang: 0.1 });

  placeOnTerrain(group, WELL_POSITION.x, WELL_POSITION.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.85);
  return group;
}

export function createArtesianWell(scene) {
  const group = new THREE.Group();
  const stoneMat = mat(palette.stoneGrey, { roughness: 0.9 });
  const metalMat = mat(palette.metalMid, { roughness: 0.45, metalness: 0.4 });

  const base = voxelBox(1.6, 0.5, 1.6, stoneMat);
  base.position.y = 0.25;
  group.add(base);
  const pump = voxelBox(0.35, 1.4, 0.35, metalMat);
  pump.position.y = 1.0;
  group.add(pump);
  const arm = voxelBox(0.8, 0.12, 0.12, metalMat);
  arm.position.set(0.35, 1.5, 0);
  group.add(arm);
  const handle = voxelBox(0.12, 0.35, 0.12, metalMat);
  handle.position.set(0.7, 1.35, 0);
  group.add(handle);

  placeOnTerrain(group, ARTESIAN_WELL_POSITION.x, ARTESIAN_WELL_POSITION.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.95);
  return group;
}


function buildVillageCottage({ width = 4.4, depth = 3.8, height = 3.4, wallColor, roofColor }) {
  const group = new THREE.Group();
  const wallMat = mat(wallColor, { roughness: 0.78 });
  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffd89a, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92, flatShading: true,
    emissive: 0xffb24a, emissiveIntensity: 0.7
  });

  const plinthMat = mat(palette.stoneGrey, { roughness: 0.88 });
  const plinthH = 0.28;
  const plinth = voxelBox(width + 0.1, plinthH, depth + 0.1, plinthMat);
  plinth.position.y = -plinthH / 2;
  group.add(plinth);

  const base = voxelBox(width, height, depth, wallMat);
  base.position.y = height / 2;
  group.add(base);

  voxelStairRoof(group, {
    width, depth, baseY: height,
    color: roofColor,
    layers: 4,
    stepH: 0.24,
    overhang: 0.22
  });

  const door = voxelBox(0.9, 2.05, 0.1, woodMat);
  door.position.set(0, 1.025, depth / 2 + 0.05);
  group.add(door);

  const win = voxelBox(0.6, 0.7, 0.08, glassMat);
  win.position.set(-width * 0.28, height * 0.55, depth / 2 + 0.04);
  group.add(win);

  const win2 = voxelBox(0.6, 0.7, 0.08, glassMat);
  win2.position.set(width * 0.28, height * 0.55, depth / 2 + 0.04);
  group.add(win2);

  group.userData.width = width;
  group.userData.depth = depth;
  return group;
}

function buildMarketStall() {
  const group = new THREE.Group();
  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const clothMat = mat(0xd45a3a, { roughness: 0.75 });

  const counter = voxelBox(2.8, 0.9, 1.25, woodMat);
  counter.position.y = 0.55;
  group.add(counter);

  [[-1.2, 2.05], [1.2, 2.05]].forEach(([x, y]) => {
    const post = voxelBox(0.14, y, 0.14, woodMat);
    post.position.set(x, y / 2, -0.35);
    group.add(post);
  });

  const awning = voxelBox(3.1, 0.12, 1.7, clothMat);
  awning.position.set(0, 2.08, 0.08);
  group.add(awning);

  [[-0.7, 1.12, 0.2], [0.15, 1.1, 0.2], [0.85, 1.08, 0.15]].forEach(([x, y, z]) => {
    const crate = voxelBox(0.38, 0.3, 0.34, 0xc9b56a);
    crate.position.set(x, y, z);
    group.add(crate);
  });

  return group;
}

function buildBakeryShop() {
  const group = buildVillageCottage({
    width: 5.0, depth: 4.2, height: 3.6,
    wallColor: palette.wallCream, roofColor: 0xb85a28
  });
  const sign = voxelBox(1.4, 0.45, 0.1, 0xf4e4c8);
  sign.position.set(0, 2.85, 2.2);
  group.add(sign);
  return group;
}

export function createAlarmBell(parent, position = { x: 0, z: 18.4 }, areaId = 'farm') {
  const group = new THREE.Group();
  const stoneMat = mat(palette.stoneGrey, { roughness: 0.85 });
  const bellMat = mat(0xc9a13a, { roughness: 0.35, metalness: 0.5 });

  const tower = voxelBox(1.7, 4.0, 1.7, stoneMat);
  tower.position.y = 2.0;
  group.add(tower);

  voxelStairRoof(group, { width: 1.9, depth: 1.9, baseY: 4.0, color: palette.roofSlate, layers: 2, stepH: 0.3, overhang: 0.18 });

  const bell = voxelBox(0.6, 0.65, 0.6, bellMat);
  bell.position.set(0, 4.45, 0);
  group.add(bell);

  group.userData.bell = bell;
  placeOnTerrain(group, position.x, position.z, areaId);
  parent.add(group);
  registerObstacle(group.position.x, group.position.z, 1.15, areaId);
  return group;
}

/** Portão/placa na estrada norte — portal fazenda → vila. */
export function createVillageGate(parent) {
  const group = new THREE.Group();
  group.name = 'villageGate';
  placeOnTerrain(group, VILLAGE_GATE.x, VILLAGE_GATE.z, 'farm');

  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const stoneMat = mat(palette.stoneGrey, { roughness: 0.9 });

  [-1.6, 1.6].forEach(x => {
    const post = voxelBox(0.28, 2.4, 0.28, stoneMat);
    post.position.set(x, 1.2, 0);
    group.add(post);
  });
  const beam = voxelBox(3.6, 0.28, 0.28, woodMat);
  beam.position.set(0, 2.35, 0);
  group.add(beam);

  const sign = voxelBox(1.4, 0.7, 0.12, 0xf4e4c8);
  sign.position.set(0, 1.7, 0.2);
  group.add(sign);
  const signPost = voxelBox(0.12, 1.2, 0.12, woodMat);
  signPost.position.set(0, 0.9, 0.2);
  group.add(signPost);

  parent.add(group);
  // Decoração do caminho fazenda → vila (mesmo overworld, sem portal)
  return group;
}

/** Placa na trilha leste — portal fazenda → lago (área própria). */
export function createLakeGate(parent) {
  const group = new THREE.Group();
  group.name = 'lakeGate';
  placeOnTerrain(group, LAKE_GATE.x, LAKE_GATE.z, 'farm');

  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const post = voxelBox(0.14, 1.4, 0.14, woodMat);
  post.position.y = 0.7;
  group.add(post);
  const sign = voxelBox(1.0, 0.5, 0.1, 0xf4e4c8);
  sign.position.set(0, 1.25, 0.08);
  group.add(sign);

  parent.add(group);
  group.userData.isPortal = true;
  group.userData.portalId = 'farm_to_lake';
  return group;
}

/** Placa de saída da vila → fazenda. */
export function createVillageExitSign(parent) {
  const group = new THREE.Group();
  const z = VILLAGE_PLAZA.z - 6.5;
  placeOnTerrain(group, VILLAGE_PLAZA.x, z, 'farm');
  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const post = voxelBox(0.14, 1.5, 0.14, woodMat);
  post.position.y = 0.75;
  group.add(post);
  const sign = voxelBox(1.2, 0.55, 0.1, 0xf4e4c8);
  sign.position.set(0, 1.35, 0.08);
  group.add(sign);
  parent.add(group);
  return group;
}

/** Entrada da caverna na fazenda (fachada + portal). */
export function createCaveEntrance(parent) {
  const group = new THREE.Group();
  group.name = 'caveEntrance';
  placeOnTerrain(group, CAVE_POSITION.x, CAVE_POSITION.z, 'farm');

  const rockMat = voxelMat(0x6a6560, { roughness: 0.92 });
  const mound = voxelBox(5.5, 2.8, 4.2, rockMat);
  mound.position.set(0, 1.4, -1.5);
  group.add(mound);
  const archL = voxelBox(1.2, 2.2, 1.2, rockMat);
  archL.position.set(-1.3, 1.1, 0.6);
  group.add(archL);
  const archR = voxelBox(1.2, 2.2, 1.2, rockMat);
  archR.position.set(1.3, 1.1, 0.6);
  group.add(archR);
  const lintel = voxelBox(3.8, 0.8, 1.2, rockMat);
  lintel.position.set(0, 2.4, 0.6);
  group.add(lintel);

  // Bloqueia atravessar a colina; a boca (z+) fica livre para o portal
  registerObstacle(CAVE_POSITION.x, CAVE_POSITION.z - 1.5, 2.2, 'farm');
  registerObstacle(CAVE_POSITION.x - 2.0, CAVE_POSITION.z - 1.2, 0.9, 'farm');
  registerObstacle(CAVE_POSITION.x + 2.0, CAVE_POSITION.z - 1.2, 0.9, 'farm');

  group.userData.isPortal = true;
  group.userData.portalId = 'farm_to_cave';
  parent.add(group);
  return group;
}

export function createVillage(parent) {
  beginObstacleRegistration('farm');
  const village = new THREE.Group();
  village.name = 'village';

  const plazaMat = mat(0xb8b0a0, { roughness: 0.92 });
  const plazaGroundY = getGroundHeightAt(VILLAGE_PLAZA.x, VILLAGE_PLAZA.z, 'farm');
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.hypot(x, z) > 2.3) continue;
      const tile = voxelBox(1.05, 0.1, 1.05, plazaMat);
      tile.position.set(VILLAGE_PLAZA.x + x * 1.05, plazaGroundY + 0.05, VILLAGE_PLAZA.z + z * 1.05);
      village.add(tile);
    }
  }

  const fountainBase = voxelBox(1.6, 0.5, 1.6, palette.stoneGrey);
  fountainBase.position.set(VILLAGE_PLAZA.x, plazaGroundY + 0.25, VILLAGE_PLAZA.z);
  village.add(fountainBase);
  const water = voxelBox(1.1, 0.15, 1.1, new THREE.MeshStandardMaterial({
    color: 0x5eb0d8, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.85, flatShading: true
  }));
  water.position.set(VILLAGE_PLAZA.x, plazaGroundY + 0.52, VILLAGE_PLAZA.z);
  village.add(water);
  registerObstacle(VILLAGE_PLAZA.x, VILLAGE_PLAZA.z, 0.85, 'farm');

  const benchMat = mat(palette.woodMid, { roughness: 0.85 });
  (VILLAGE_LAYOUT.benches || []).forEach(([x, z]) => {
    const bench = new THREE.Group();
    const seat = voxelBox(1.4, 0.14, 0.45, benchMat);
    seat.position.y = 0.48;
    bench.add(seat);
    const back = voxelBox(1.4, 0.5, 0.1, benchMat);
    back.position.set(0, 0.78, -0.18);
    bench.add(back);
    placeOnTerrain(bench, x, z, 'farm');
    village.add(bench);
  });

  const merchantHome = buildVillageCottage({ wallColor: 0xe8d5b5, roofColor: 0x6a3a28 });
  placeOnTerrain(merchantHome, VILLAGE_LAYOUT.merchantHome.x, VILLAGE_LAYOUT.merchantHome.z, 'farm');
  merchantHome.rotation.y = Math.PI;
  village.add(merchantHome);
  registerOrientedBox(VILLAGE_LAYOUT.merchantHome.x, VILLAGE_LAYOUT.merchantHome.z, 4.4, 3.8, Math.PI, 'farm');

  const supplierHome = buildVillageCottage({ wallColor: 0xdce8d0, roofColor: 0x4a6a38 });
  placeOnTerrain(supplierHome, VILLAGE_LAYOUT.supplierHome.x, VILLAGE_LAYOUT.supplierHome.z, 'farm');
  supplierHome.rotation.y = Math.PI;
  village.add(supplierHome);
  registerOrientedBox(VILLAGE_LAYOUT.supplierHome.x, VILLAGE_LAYOUT.supplierHome.z, 4.4, 3.8, Math.PI, 'farm');

  const govHome = buildVillageCottage({
    width: 4.6, depth: 4.0, height: 3.6,
    wallColor: 0xd8dce8, roofColor: palette.roofSlate
  });
  placeOnTerrain(govHome, VILLAGE_LAYOUT.govHome.x, VILLAGE_LAYOUT.govHome.z, 'farm');
  govHome.rotation.y = Math.PI;
  village.add(govHome);
  registerOrientedBox(VILLAGE_LAYOUT.govHome.x, VILLAGE_LAYOUT.govHome.z, 4.6, 4.0, Math.PI, 'farm');

  const bakery = buildBakeryShop();
  placeOnTerrain(bakery, VILLAGE_LAYOUT.bakery.x, VILLAGE_LAYOUT.bakery.z, 'farm');
  village.add(bakery);
  registerOrientedBox(VILLAGE_LAYOUT.bakery.x, VILLAGE_LAYOUT.bakery.z, 5.0, 4.2, 0, 'farm');

  const stall = buildMarketStall();
  placeOnTerrain(stall, VILLAGE_LAYOUT.stall.x, VILLAGE_LAYOUT.stall.z, 'farm');
  village.add(stall);
  registerOrientedBox(VILLAGE_LAYOUT.stall.x, VILLAGE_LAYOUT.stall.z, 2.6, 2.2, 0, 'farm');

  (VILLAGE_LAYOUT.extraHomes || []).forEach(home => {
    const cottage = buildVillageCottage({ wallColor: home.wall, roofColor: home.roof });
    placeOnTerrain(cottage, home.x, home.z, 'farm');
    cottage.rotation.y = home.yaw || 0;
    village.add(cottage);
    registerOrientedBox(home.x, home.z, 4.4, 3.8, home.yaw || 0, 'farm');
  });

  const lampMat = mat(palette.metalDark, { roughness: 0.5, metalness: 0.4 });
  const lampGlow = mat(0xfff0c0, { emissive: 0xffe08a, emissiveIntensity: 1.1, roughness: 0.35 });
  (VILLAGE_LAYOUT.lamps || []).forEach(([x, z]) => {
    const lamp = new THREE.Group();
    const pole = voxelBox(0.14, 2.8, 0.14, lampMat);
    pole.position.y = 1.4;
    lamp.add(pole);
    const bulb = voxelBox(0.32, 0.32, 0.32, lampGlow);
    bulb.position.y = 2.9;
    lamp.add(bulb);
    const { light } = createLantern({ color: 0xffc878, intensity: 1.65, range: 11, decay: 1.6 });
    light.position.y = 2.85;
    lamp.add(light);
    placeOnTerrain(lamp, x, z, 'farm');
    village.add(lamp);
    registerObstacle(x, z, 0.18, 'farm');
  });

  createVillageExitSign(village);
  const alarmBell = createAlarmBell(village, VILLAGE_LAYOUT.alarmBell || { x: 4.4, z: 46.2 }, 'farm');
  addVillageClutter(village);

  parent.add(village);

  return {
    group: village,
    alarmBell,
    shelters: {
      merchant: { x: VILLAGE_LAYOUT.merchantHome.x, z: VILLAGE_LAYOUT.merchantHome.z },
      supplier: { x: VILLAGE_LAYOUT.supplierHome.x, z: VILLAGE_LAYOUT.supplierHome.z },
      gov: { x: VILLAGE_LAYOUT.govHome.x, z: VILLAGE_LAYOUT.govHome.z }
    }
  };
}

export function layNpcCorpse(npc, { yaw = 0, hint = '' } = {}) {
  npc.userData.dead = true;
  npc.userData.fleeing = false;
  npc.userData.tookShelter = false;
  npc.userData.deathHint = hint || 'O corpo está frio. Não há o que fazer.';
  npc.visible = true;
  const side = Math.random() > 0.5 ? 1 : -1;
  npc.rotation.set(0.12 * side, yaw, side * Math.PI / 2);
  npc.position.y = getGroundHeightAt(npc.position.x, npc.position.z, 'farm') + 0.16;
  return npc;
}

export function createVillageCorpses(parent) {
  const palettes = [
    { shirt: 0x7a4a3a, pants: 0x3a322c, skin: 0xc8a078, accessory: null },
    { shirt: 0x4a5a6a, pants: 0x2a2e32, skin: 0xd4b08a, accessory: 'scarf' },
    { shirt: 0x6a5a38, pants: 0x3a3428, skin: 0xe0b888, accessory: 'hat' },
    { shirt: 0x5a3a48, pants: 0x2c2428, skin: 0xc4a070, accessory: null }
  ];
  const spots = VILLAGE_LAYOUT.corpseSpots || [];
  return spots.map((spot, i) => {
    const npc = buildStandingNpc(palettes[i % palettes.length]);
    placeOnTerrain(npc, spot.x, spot.z, 'farm');
    layNpcCorpse(npc, {
      yaw: spot.yaw,
      hint: 'Mais um vizinho que não sobreviveu à noite.'
    });
    npc.userData.isNpc = true;
    npc.userData.npcId = 'villager';
    parent.add(npc);
    return npc;
  });
}

function addVillageClutter(village) {
  const wood = mat(palette.woodMid, { roughness: 0.88 });
  const rust = mat(0x6a4530, { roughness: 0.9 });
  const crateSpots = VILLAGE_LAYOUT.crates || [];
  crateSpots.forEach(([x, z], i) => {
    const crate = voxelBox(0.42 + (i % 2) * 0.1, 0.32, 0.38, i % 2 ? rust : wood);
    placeOnTerrain(crate, x, z, 'farm');
    crate.position.y += 0.16;
    crate.rotation.y = i * 0.7;
    village.add(crate);
  });
  (VILLAGE_LAYOUT.planks || []).forEach(([x, z, yaw]) => {
    const plank = voxelBox(1.4, 0.08, 0.18, wood);
    placeOnTerrain(plank, x, z, 'farm');
    plank.position.y += 0.06;
    plank.rotation.set(0.15, yaw, 0.4);
    village.add(plank);
  });
}

export function createNightClutter(parent) {
  const group = new THREE.Group();
  const wood = mat(palette.woodMid, { roughness: 0.88 });
  const rust = mat(0x5a3a28, { roughness: 0.9 });
  const clutterSpots = getMap()?.nightClutter || [[-2.4, -9.2], [3.1, -10.8], [-6.2, -7.4], [6.8, -6.2], [-1.2, -0.4]];
  clutterSpots.forEach(([x, z], i) => {
    const bit = voxelBox(0.34, 0.22, 0.28, i % 2 ? rust : wood);
    placeOnTerrain(bit, x, z, 'farm');
    bit.position.y += 0.12;
    bit.rotation.y = i * 0.9;
    group.add(bit);
  });
  const lanternSpots = getMap()?.lanterns || [[-3.6, -13.2], [2.8, -14.4]];
  lanternSpots.forEach(([x, z]) => {
    const lantern = new THREE.Group();
    const pole = voxelBox(0.1, 1.6, 0.1, mat(palette.metalDark, { roughness: 0.5, metalness: 0.35 }));
    pole.position.y = 0.8;
    lantern.add(pole);
    const glow = voxelBox(0.22, 0.22, 0.22, mat(0xffe08a, { emissive: 0xffc14a, emissiveIntensity: 1.2 }));
    glow.position.y = 1.65;
    lantern.add(glow);
    const { light } = createLantern({ color: 0xffc878, intensity: 1.1, range: 7.5, decay: 1.8 });
    light.position.y = 1.6;
    lantern.add(light);
    placeOnTerrain(lantern, x, z, 'farm');
    group.add(lantern);
  });
  parent.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Decoração comprável (auto-posicionada): cada tipo tem um conjunto fixo de
// vagas ao redor da casa/caminho principal — comprar apenas ocupa a próxima
// vaga livre, sem exigir um modo de posicionamento livre pelo jogador.
// ---------------------------------------------------------------------------

const DECOR_SLOTS = {
  flowerBed: [[-2.4, -9.5], [-2.4, -10.8], [2.4, -9.5]],
  barrel: [[5.5, -10.5], [6.2, -10.0], [5.2, -9.5]],
  scarecrow: [[0, 0.5]],
  fancyFence: [[0, -4]]
};

function buildFlowerBed() {
  const group = new THREE.Group();
  const bed = voxelBox(1.0, 0.2, 1.0, 0x5a3d24);
  bed.position.y = 0.1;
  group.add(bed);
  const flowerColors = [0xe85d75, 0xf2c94c, 0xf2f2f2, 0x9b6bd8];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const r = 0.25;
    const stem = voxelBox(0.06, 0.22, 0.06, 0x4a7a2a);
    stem.position.set(Math.cos(angle) * r, 0.28, Math.sin(angle) * r);
    group.add(stem);
    const bloom = voxelBox(0.14, 0.14, 0.14, flowerColors[i % flowerColors.length]);
    bloom.position.set(Math.cos(angle) * r, 0.42, Math.sin(angle) * r);
    group.add(bloom);
  }
  return group;
}

function buildBarrel() {
  const group = new THREE.Group();
  const body = voxelBox(0.55, 0.65, 0.55, palette.woodMid);
  body.position.y = 0.32;
  group.add(body);
  [0.15, 0.35, 0.52].forEach(y => {
    const hoop = voxelBox(0.6, 0.06, 0.6, palette.metalDark);
    hoop.position.y = y;
    group.add(hoop);
  });
  return group;
}

function buildScarecrow() {
  const group = new THREE.Group();
  const post = voxelBox(0.12, 1.7, 0.12, palette.woodDark);
  post.position.y = 0.85;
  group.add(post);
  const armBeam = voxelBox(1.2, 0.1, 0.1, palette.woodDark);
  armBeam.position.y = 1.3;
  group.add(armBeam);
  const torso = voxelBox(0.45, 0.6, 0.3, 0xb5482e);
  torso.position.y = 1.1;
  group.add(torso);
  const head = voxelBox(0.32, 0.32, 0.32, 0xe0c188);
  head.position.y = 1.6;
  group.add(head);
  const hat = voxelBox(0.42, 0.12, 0.42, 0x4a3a2a);
  hat.position.y = 1.82;
  group.add(hat);
  return group;
}

function buildFancyFenceMarker() {
  const group = new THREE.Group();
  [-1.0, 1.0].forEach(x => {
    const pot = voxelBox(0.28, 0.22, 0.28, palette.woodMid);
    pot.position.set(x, 0.11, 0);
    group.add(pot);
    const bush = voxelBox(0.28, 0.28, 0.28, palette.foliageC);
    bush.position.set(x, 0.36, 0);
    group.add(bush);
  });
  return group;
}

const DECOR_BUILDERS = {
  flowerBed: buildFlowerBed,
  barrel: buildBarrel,
  scarecrow: buildScarecrow,
  fancyFence: buildFancyFenceMarker
};

export function createDecoration(scene, type, slotIndex) {
  const slots = DECOR_SLOTS[type];
  const builder = DECOR_BUILDERS[type];
  if (!slots || !builder) return null;
  const [x, z] = slots[slotIndex] || slots[0];

  const group = builder();
  placeOnTerrain(group, x, z, 'farm');
  scene.add(group);
  registerObstacle(x, z, 0.5);
  return group;
}
