import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { registerObstaclePublic, BASEMENT_POSITION, BASEMENT_EXIT_SPAWN } from './world.js';
import { createLantern } from './lighting.js';

export const BASEMENT_INTERACT_RANGE = 1.6;

const LORE_NOTES = [
  {
    id: 'bilhete_rasgado',
    title: 'Bilhete rasgado',
    text: 'Dia 12. Os rádios pararam de responder essa manhã. Decidimos nos esconder aqui embaixo até as coisas se calmarem.'
  },
  {
    id: 'anotacao_radio',
    title: 'Anotação no rádio',
    text: 'A frequência de emergência muda todo dia ao anoitecer. Na maior parte do tempo só dá estática — mas ainda vale escutar.'
  },
  {
    id: 'mapa_riscado',
    title: 'Mapa riscado',
    text: 'Um X perto do lago. Outro na estrada, onde caiu o avião. Escrito ao lado, com letra apressada: "não ir sozinho".'
  }
];

let loreNoteEntries = [];

export function createBasement(parent) {
  const group = new THREE.Group();

  const wallMat = voxelMat(0x4a4436, { roughness: 0.85 });
  const floorMat = voxelMat(0x2e2a22, { roughness: 0.9 });
  const beamMat = voxelMat(0x3a2a1c, { roughness: 0.8 });

  const width = 6;
  const height = 2.6;
  const depth = 6;

  const floor = voxelBox(width, 0.2, depth, floorMat);
  floor.position.set(0, 0.1, 0);
  group.add(floor);

  const ceiling = voxelBox(width, 0.2, depth, beamMat);
  ceiling.position.set(0, height, 0);
  group.add(ceiling);

  const backWall = voxelBox(width, height, 0.2, wallMat);
  backWall.position.set(0, height / 2, -depth / 2);
  group.add(backWall);

  const leftWall = voxelBox(0.2, height, depth, wallMat);
  leftWall.position.set(-width / 2, height / 2, 0);
  group.add(leftWall);

  const rightWall = voxelBox(0.2, height, depth, wallMat);
  rightWall.position.set(width / 2, height / 2, 0);
  group.add(rightWall);

  const frontWallLeft = voxelBox(width / 2 - 0.7, height, 0.2, wallMat);
  frontWallLeft.position.set(-(width / 4 + 0.35), height / 2, depth / 2);
  group.add(frontWallLeft);

  const frontWallRight = voxelBox(width / 2 - 0.7, height, 0.2, wallMat);
  frontWallRight.position.set(width / 4 + 0.35, height / 2, depth / 2);
  group.add(frontWallRight);

  const lanternGlassMat = voxelMat(0x3a2f10, {
    emissive: 0xff9020, emissiveIntensity: 1.4, roughness: 0.4, transparent: true, opacity: 0.9
  });
  const lantern = voxelBox(0.2, 0.26, 0.2, lanternGlassMat);
  lantern.position.set(0, height - 0.35, -depth / 2 + 0.5);
  group.add(lantern);
  const { light: lanternLight } = createLantern({ color: 0xffb45a, intensity: 1.4, range: 8, decay: 1.8 });
  lanternLight.position.copy(lantern.position);
  group.add(lanternLight);

  const crateMat = voxelMat(0x5a4530, { roughness: 0.85 });
  [[-1.9, -1.8], [-1.5, -1.8]].forEach(([x, z], i) => {
    const crate = voxelBox(0.6, 0.5 + i * 0.3, 0.6, crateMat);
    crate.position.set(x, (0.5 + i * 0.3) / 2, z);
    group.add(crate);
    registerObstaclePublic(BASEMENT_POSITION.x + x, BASEMENT_POSITION.z + z, 0.4, 'basement');
  });

  const radioMat = voxelMat(0x2a2a2a, { roughness: 0.6, metalness: 0.3 });
  const radio = voxelBox(0.4, 0.28, 0.24, radioMat);
  radio.position.set(1.7, 0.7, -depth / 2 + 0.3);
  group.add(radio);
  const antennaMat = voxelMat(0x888888, { roughness: 0.4, metalness: 0.6 });
  const antenna = voxelBox(0.03, 0.5, 0.03, antennaMat);
  antenna.position.set(1.85, 1.1, -depth / 2 + 0.3);
  group.add(antenna);

  const noteMat = voxelMat(0xe8d8b0, { roughness: 0.9 });
  loreNoteEntries = [];
  const notePositions = [
    { x: -2.0, y: 0.9, z: -2.7 },
    { x: 1.6, y: 1.0, z: -2.6 },
    { x: 0, y: 0.65, z: -2.8 }
  ];
  LORE_NOTES.forEach((def, i) => {
    const pos = notePositions[i];
    const mesh = voxelBox(0.32, 0.22, 0.04, noteMat);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.userData.isLoreNote = true;
    mesh.userData.noteId = def.id;
    group.add(mesh);
    loreNoteEntries.push({ mesh, def });
  });

  group.userData.exitWorld = { ...BASEMENT_EXIT_SPAWN };
  group.position.set(BASEMENT_POSITION.x, 0, BASEMENT_POSITION.z);
  parent.add(group);

  return { group };
}

export function nearestLoreNote(playerPos, range = BASEMENT_INTERACT_RANGE) {
  let best = null;
  let bestD = range;
  for (const entry of loreNoteEntries) {
    const worldPos = new THREE.Vector3();
    entry.mesh.getWorldPosition(worldPos);
    const d = Math.hypot(playerPos.x - worldPos.x, playerPos.z - worldPos.z);
    if (d < bestD) {
      bestD = d;
      best = entry.def;
    }
  }
  return best;
}

export function getLoreNotes() {
  return loreNoteEntries;
}

export function showLoreNote(def) {
  const el = document.getElementById('lore-note-overlay');
  const title = document.getElementById('lore-note-title');
  const body = document.getElementById('lore-note-body');
  if (!el || !title || !body) return;
  title.textContent = def.title;
  body.textContent = def.text;
  el.classList.remove('hidden');
}

export function hideLoreNote() {
  document.getElementById('lore-note-overlay')?.classList.add('hidden');
}

export function isLoreNoteOpen() {
  const el = document.getElementById('lore-note-overlay');
  return !!el && !el.classList.contains('hidden');
}
