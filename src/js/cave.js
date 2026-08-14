import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import {
  CAVE_POSITION, CAVE_EXIT_SPAWN, registerObstaclePublic, beginObstacleRegistration
} from './world.js';

export const CAVE_INTERACT_RANGE = 2.4;
export const MINE_ENERGY_COST = 3;
export const MINE_COOLDOWN_MS = 12000;

export const MATERIAL_SELL = { Pedra: 4, Minerio: 12, Carvao: 8 };

const NODE_DEFS = [
  { id: 'ore1', type: 'Minerio', offset: [-1.2, 0.4, -2.2], color: 0xb87333 },
  { id: 'ore2', type: 'Minerio', offset: [1.0, 0.4, -3.0], color: 0xb87333 },
  { id: 'stone1', type: 'Pedra', offset: [-0.8, 0.35, -4.2], color: 0x8a8a8a },
  { id: 'stone2', type: 'Pedra', offset: [1.4, 0.35, -4.8], color: 0x8a8a8a },
  { id: 'coal1', type: 'Carvao', offset: [0.2, 0.4, -5.6], color: 0x2a2a2a },
  { id: 'coal2', type: 'Carvao', offset: [-1.5, 0.35, -5.2], color: 0x2a2a2a }
];

let caveNodes = [];

/** Interior da caverna (instância própria). Fachada fica em createCaveEntrance na fazenda. */
export function createCave(parent) {
  beginObstacleRegistration('cave');
  const group = new THREE.Group();
  group.position.set(CAVE_POSITION.x, 0, CAVE_POSITION.z);
  group.name = 'cave';

  const rockMat = voxelMat(0x6a6560, { roughness: 0.92 });
  const darkMat = voxelMat(0x3a3835, { roughness: 0.95 });
  const groundMat = voxelMat(0x4a4540, { roughness: 0.95 });
  const glowMat = voxelMat(0xffb45a, { emissive: 0xff9020, emissiveIntensity: 0.55, roughness: 0.5 });

  // Interior ampliado (chão + paredes + teto + fundo)
  const floor = voxelBox(5.2, 0.2, 8.0, groundMat);
  floor.position.set(0, 0.05, -2.5);
  group.add(floor);

  const wallL = voxelBox(0.7, 2.6, 8.0, darkMat);
  wallL.position.set(-2.4, 1.3, -2.5);
  group.add(wallL);
  const wallR = voxelBox(0.7, 2.6, 8.0, darkMat);
  wallR.position.set(2.4, 1.3, -2.5);
  group.add(wallR);
  const back = voxelBox(5.6, 2.6, 0.7, darkMat);
  back.position.set(0, 1.3, -6.4);
  group.add(back);
  const ceiling = voxelBox(5.6, 0.55, 8.0, darkMat);
  ceiling.position.set(0, 2.7, -2.5);
  group.add(ceiling);

  // Boca interna (arco visto de dentro)
  const archL = voxelBox(1.1, 2.2, 1.0, rockMat);
  archL.position.set(-1.4, 1.1, 1.2);
  group.add(archL);
  const archR = voxelBox(1.1, 2.2, 1.0, rockMat);
  archR.position.set(1.4, 1.1, 1.2);
  group.add(archR);
  const lintel = voxelBox(4.0, 0.7, 1.0, rockMat);
  lintel.position.set(0, 2.35, 1.2);
  group.add(lintel);

  // Tochas
  [[-2.0, -1.0], [2.0, -1.0], [-2.0, -4.5], [2.0, -4.5]].forEach(([x, z]) => {
    const torch = voxelBox(0.14, 0.5, 0.14, 0x5a3a20);
    torch.position.set(x, 1.4, z);
    group.add(torch);
    const flame = voxelBox(0.18, 0.22, 0.18, glowMat);
    flame.position.set(x, 1.75, z);
    group.add(flame);
  });

  // Obstáculos do interior
  registerObstaclePublic(CAVE_POSITION.x - 2.4, CAVE_POSITION.z - 2.5, 0.9, 'cave');
  registerObstaclePublic(CAVE_POSITION.x + 2.4, CAVE_POSITION.z - 2.5, 0.9, 'cave');
  registerObstaclePublic(CAVE_POSITION.x, CAVE_POSITION.z - 6.4, 1.4, 'cave');
  registerObstaclePublic(CAVE_POSITION.x - 1.4, CAVE_POSITION.z + 1.2, 0.7, 'cave');
  registerObstaclePublic(CAVE_POSITION.x + 1.4, CAVE_POSITION.z + 1.2, 0.7, 'cave');

  // Placa de saída perto da boca
  const exitPost = voxelBox(0.12, 1.2, 0.12, 0x6b4428);
  exitPost.position.set(1.6, 0.6, 0.6);
  group.add(exitPost);
  const exitSign = voxelBox(0.7, 0.35, 0.08, 0xf4e4c8);
  exitSign.position.set(1.6, 1.2, 0.68);
  group.add(exitSign);
  group.userData.exitWorld = { ...CAVE_EXIT_SPAWN };

  caveNodes = [];
  NODE_DEFS.forEach(def => {
    const node = new THREE.Group();
    const crystal = voxelBox(0.45, 0.55, 0.45, def.color);
    crystal.position.y = 0.28;
    node.add(crystal);
    const base = voxelBox(0.55, 0.15, 0.55, 0x5a5550);
    base.position.y = 0.08;
    node.add(base);
    node.position.set(def.offset[0], def.offset[1], def.offset[2]);
    node.userData.isMineNode = true;
    node.userData.materialType = def.type;
    node.userData.nodeId = def.id;
    node.userData.ready = true;
    node.userData.cooldownUntil = 0;
    group.add(node);
    caveNodes.push(node);
  });

  parent.add(group);
  beginObstacleRegistration('farm');
  return { group, nodes: caveNodes };
}

export function getCaveNodes() {
  return caveNodes;
}

export function nearestMineNode(pos, range = CAVE_INTERACT_RANGE) {
  let best = null;
  let bestD = range;
  const origin = CAVE_POSITION;
  for (const node of caveNodes) {
    if (!node.userData.ready) continue;
    const wx = origin.x + node.position.x;
    const wz = origin.z + node.position.z;
    const d = Math.hypot(pos.x - wx, pos.z - wz);
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}

export function tryMineNode(state, node, now = Date.now()) {
  if (!node?.userData?.isMineNode) return { ok: false, reason: 'invalid' };
  if (!node.userData.ready || now < (node.userData.cooldownUntil || 0)) {
    return { ok: false, reason: 'cooldown' };
  }
  if (state.energy < MINE_ENERGY_COST) return { ok: false, reason: 'energy' };

  const type = node.userData.materialType;
  if (!state.materials) state.materials = { Pedra: 0, Minerio: 0, Carvao: 0 };
  state.materials[type] = (state.materials[type] || 0) + 1;
  state.energy -= MINE_ENERGY_COST;

  node.userData.ready = false;
  node.userData.cooldownUntil = now + MINE_COOLDOWN_MS;
  node.visible = false;

  return { ok: true, type };
}

export function updateCaveNodes(now = Date.now()) {
  for (const node of caveNodes) {
    if (!node.userData.ready && now >= (node.userData.cooldownUntil || 0)) {
      node.userData.ready = true;
      node.visible = true;
    }
  }
}
