import * as THREE from 'three';
import { voxelBox, voxelStairRoof, voxelMat } from '../voxel.js';
import { buildLowPolyHumanoid } from '../characters.js';
import { getGroundHeightAt } from '../terrain/heightmap.js';
import { getMap } from '../mapLoader.js';
import { createLantern } from '../lighting.js';
import { registerObstacle, registerOrientedBox, beginObstacleRegistration } from '../terrain/obstacles.js';
import { palette, textures, mat, texMat, wallTexture, FARM_TERRAIN_TOP_Y, placeOnTerrain } from './sceneObjects.js';

// Posições/layout consumidos só aqui — os "públicos" continuam em world.js.
const VILLAGE_PLAZA_REF = { x: 0, z: 42 };
const VILLAGE_GATE_REF = { x: 0, z: 28 };
const LAKE_GATE_REF = { x: 24, z: 8 };
const CAVE_POSITION_REF = { x: -24, z: 8 };
const WELL_POSITION_REF = { x: -6.5, z: -7.5 };
const ARTESIAN_WELL_POSITION_REF = { x: -10.5, z: -6.0 };
const VILLAGE_LAYOUT_REF = {
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

  const stand = VILLAGE_LAYOUT_REF.merchantStand;
  placeOnTerrain(npc, stand.x, stand.z, 'farm');
  faceToward(npc, VILLAGE_PLAZA_REF.x, VILLAGE_PLAZA_REF.z);
  npc.userData.isNpc = true;
  npc.userData.npcId = 'merchant';
  npc.userData.standPosition = { x: stand.x, z: stand.z };
  npc.userData.homeShelter = { x: VILLAGE_LAYOUT_REF.merchantHome.x, z: VILLAGE_LAYOUT_REF.merchantHome.z };
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

  const stand = VILLAGE_LAYOUT_REF.supplierStand;
  placeOnTerrain(npc, stand.x, stand.z, 'farm');
  faceToward(npc, VILLAGE_PLAZA_REF.x, VILLAGE_PLAZA_REF.z);
  npc.userData.isNpc = true;
  npc.userData.npcId = 'supplier';
  npc.userData.standPosition = { x: stand.x, z: stand.z };
  npc.userData.homeShelter = { x: VILLAGE_LAYOUT_REF.supplierHome.x, z: VILLAGE_LAYOUT_REF.supplierHome.z };
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

  const stand = VILLAGE_LAYOUT_REF.govStand;
  placeOnTerrain(npc, stand.x, stand.z, 'farm');
  faceToward(npc, VILLAGE_PLAZA_REF.x, VILLAGE_PLAZA_REF.z);
  npc.userData.isNpc = true;
  npc.userData.npcId = 'gov';
  npc.userData.standPosition = { x: stand.x, z: stand.z };
  npc.userData.homeShelter = { x: VILLAGE_LAYOUT_REF.govHome.x, z: VILLAGE_LAYOUT_REF.govHome.z };
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

  placeOnTerrain(group, WELL_POSITION_REF.x, WELL_POSITION_REF.z, 'farm');
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

  placeOnTerrain(group, ARTESIAN_WELL_POSITION_REF.x, ARTESIAN_WELL_POSITION_REF.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.95);
  return group;
}


function buildVillageCottage({ width = 4.4, depth = 3.8, height = 3.4, wallColor, roofColor }) {
  const group = new THREE.Group();
  const wallMat = texMat(wallTexture(textures.stone, width * 0.3, height * 0.3), { color: wallColor, roughness: 0.82 });
  const woodMat = mat(palette.woodMid, { roughness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffd89a, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92, flatShading: true,
    emissive: 0xffb24a, emissiveIntensity: 0.7
  });

  const plinthMat = texMat(wallTexture(textures.stone, width * 0.35, 0.35), { color: palette.stoneGrey, roughness: 0.88 });
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
    map: wallTexture(textures.roof, width * 0.5, depth * 0.5),
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
    wallColor: palette.wallBakery, roofColor: palette.roofBakery
  });
  const sign = voxelBox(1.4, 0.45, 0.1, palette.woodLight);
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
  placeOnTerrain(group, VILLAGE_GATE_REF.x, VILLAGE_GATE_REF.z, 'farm');

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
  placeOnTerrain(group, LAKE_GATE_REF.x, LAKE_GATE_REF.z, 'farm');

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
  const z = VILLAGE_PLAZA_REF.z - 6.5;
  placeOnTerrain(group, VILLAGE_PLAZA_REF.x, z, 'farm');
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
  placeOnTerrain(group, CAVE_POSITION_REF.x, CAVE_POSITION_REF.z, 'farm');

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
  registerObstacle(CAVE_POSITION_REF.x, CAVE_POSITION_REF.z - 1.5, 2.2, 'farm');
  registerObstacle(CAVE_POSITION_REF.x - 2.0, CAVE_POSITION_REF.z - 1.2, 0.9, 'farm');
  registerObstacle(CAVE_POSITION_REF.x + 2.0, CAVE_POSITION_REF.z - 1.2, 0.9, 'farm');

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
  const plazaGroundY = getGroundHeightAt(VILLAGE_PLAZA_REF.x, VILLAGE_PLAZA_REF.z, 'farm');
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.hypot(x, z) > 2.3) continue;
      const tile = voxelBox(1.05, 0.1, 1.05, plazaMat);
      tile.position.set(VILLAGE_PLAZA_REF.x + x * 1.05, plazaGroundY + 0.05, VILLAGE_PLAZA_REF.z + z * 1.05);
      village.add(tile);
    }
  }

  const fountainBase = voxelBox(1.6, 0.5, 1.6, palette.stoneGrey);
  fountainBase.position.set(VILLAGE_PLAZA_REF.x, plazaGroundY + 0.25, VILLAGE_PLAZA_REF.z);
  village.add(fountainBase);
  const water = voxelBox(1.1, 0.15, 1.1, new THREE.MeshStandardMaterial({
    color: 0x5eb0d8, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.85, flatShading: true
  }));
  water.position.set(VILLAGE_PLAZA_REF.x, plazaGroundY + 0.52, VILLAGE_PLAZA_REF.z);
  village.add(water);
  registerObstacle(VILLAGE_PLAZA_REF.x, VILLAGE_PLAZA_REF.z, 0.85, 'farm');

  const benchMat = mat(palette.woodMid, { roughness: 0.85 });
  (VILLAGE_LAYOUT_REF.benches || []).forEach(([x, z]) => {
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

  const merchantHome = buildVillageCottage({ wallColor: palette.wallMerchant, roofColor: palette.roofMerchant });
  placeOnTerrain(merchantHome, VILLAGE_LAYOUT_REF.merchantHome.x, VILLAGE_LAYOUT_REF.merchantHome.z, 'farm');
  merchantHome.rotation.y = Math.PI;
  village.add(merchantHome);
  registerOrientedBox(VILLAGE_LAYOUT_REF.merchantHome.x, VILLAGE_LAYOUT_REF.merchantHome.z, 4.4, 3.8, Math.PI, 'farm');

  const supplierHome = buildVillageCottage({ wallColor: palette.wallSupplier, roofColor: palette.roofSupplier });
  placeOnTerrain(supplierHome, VILLAGE_LAYOUT_REF.supplierHome.x, VILLAGE_LAYOUT_REF.supplierHome.z, 'farm');
  supplierHome.rotation.y = Math.PI;
  village.add(supplierHome);
  registerOrientedBox(VILLAGE_LAYOUT_REF.supplierHome.x, VILLAGE_LAYOUT_REF.supplierHome.z, 4.4, 3.8, Math.PI, 'farm');

  const govHome = buildVillageCottage({
    width: 4.6, depth: 4.0, height: 3.6,
    wallColor: palette.wallGov, roofColor: palette.roofGov
  });
  placeOnTerrain(govHome, VILLAGE_LAYOUT_REF.govHome.x, VILLAGE_LAYOUT_REF.govHome.z, 'farm');
  govHome.rotation.y = Math.PI;
  village.add(govHome);
  registerOrientedBox(VILLAGE_LAYOUT_REF.govHome.x, VILLAGE_LAYOUT_REF.govHome.z, 4.6, 4.0, Math.PI, 'farm');

  const bakery = buildBakeryShop();
  placeOnTerrain(bakery, VILLAGE_LAYOUT_REF.bakery.x, VILLAGE_LAYOUT_REF.bakery.z, 'farm');
  village.add(bakery);
  registerOrientedBox(VILLAGE_LAYOUT_REF.bakery.x, VILLAGE_LAYOUT_REF.bakery.z, 5.0, 4.2, 0, 'farm');

  const stall = buildMarketStall();
  placeOnTerrain(stall, VILLAGE_LAYOUT_REF.stall.x, VILLAGE_LAYOUT_REF.stall.z, 'farm');
  village.add(stall);
  registerOrientedBox(VILLAGE_LAYOUT_REF.stall.x, VILLAGE_LAYOUT_REF.stall.z, 2.6, 2.2, 0, 'farm');

  (VILLAGE_LAYOUT_REF.extraHomes || []).forEach(home => {
    const cottage = buildVillageCottage({ wallColor: home.wall, roofColor: home.roof });
    placeOnTerrain(cottage, home.x, home.z, 'farm');
    cottage.rotation.y = home.yaw || 0;
    village.add(cottage);
    registerOrientedBox(home.x, home.z, 4.4, 3.8, home.yaw || 0, 'farm');
  });

  const lampMat = mat(palette.metalDark, { roughness: 0.5, metalness: 0.4 });
  const lampGlow = mat(0xfff0c0, { emissive: 0xffe08a, emissiveIntensity: 1.1, roughness: 0.35 });
  (VILLAGE_LAYOUT_REF.lamps || []).forEach(([x, z]) => {
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
  const alarmBell = createAlarmBell(village, VILLAGE_LAYOUT_REF.alarmBell || { x: 4.4, z: 46.2 }, 'farm');
  addVillageClutter(village);

  parent.add(village);

  return {
    group: village,
    alarmBell,
    shelters: {
      merchant: { x: VILLAGE_LAYOUT_REF.merchantHome.x, z: VILLAGE_LAYOUT_REF.merchantHome.z },
      supplier: { x: VILLAGE_LAYOUT_REF.supplierHome.x, z: VILLAGE_LAYOUT_REF.supplierHome.z },
      gov: { x: VILLAGE_LAYOUT_REF.govHome.x, z: VILLAGE_LAYOUT_REF.govHome.z }
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
  const spots = VILLAGE_LAYOUT_REF.corpseSpots || [];
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
  const crateSpots = VILLAGE_LAYOUT_REF.crates || [];
  crateSpots.forEach(([x, z], i) => {
    const crate = voxelBox(0.42 + (i % 2) * 0.1, 0.32, 0.38, i % 2 ? rust : wood);
    placeOnTerrain(crate, x, z, 'farm');
    crate.position.y += 0.16;
    crate.rotation.y = i * 0.7;
    village.add(crate);
  });
  (VILLAGE_LAYOUT_REF.planks || []).forEach(([x, z, yaw]) => {
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

export const DECOR_SLOTS = {
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
