import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { registerObstaclePublic, BASEMENT_POSITION, BASEMENT_EXIT_SPAWN } from './world.js';

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
let overlayEl = null;

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
  const lanternLight = new THREE.PointLight(0xffb45a, 1.4, 8, 1.8);
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

function ensureOverlayEl() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.id = 'lore-note-overlay';
  Object.assign(overlayEl.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '300',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5, 6, 10, 0.72)',
    pointerEvents: 'none'
  });
  const card = document.createElement('div');
  card.id = 'lore-note-card';
  Object.assign(card.style, {
    maxWidth: '420px',
    padding: '22px 26px',
    borderRadius: '10px',
    background: '#1a160f',
    border: '1px solid #4a3a22',
    color: '#e8d8b0',
    fontFamily: 'inherit',
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
  });
  const title = document.createElement('h3');
  title.id = 'lore-note-title';
  Object.assign(title.style, { margin: '0 0 10px', fontSize: '16px', letterSpacing: '0.02em' });
  const body = document.createElement('p');
  body.id = 'lore-note-body';
  Object.assign(body.style, { margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' });
  const hint = document.createElement('span');
  hint.textContent = 'E ou ESC para fechar';
  Object.assign(hint.style, { fontSize: '11px', opacity: '0.6' });
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(hint);
  overlayEl.appendChild(card);
  document.body.appendChild(overlayEl);
  return overlayEl;
}

export function showLoreNote(def) {
  const el = ensureOverlayEl();
  el.querySelector('#lore-note-title').textContent = def.title;
  el.querySelector('#lore-note-body').textContent = def.text;
  el.style.display = 'flex';
  el.style.pointerEvents = 'auto';
}

export function hideLoreNote() {
  if (!overlayEl) return;
  overlayEl.style.display = 'none';
  overlayEl.style.pointerEvents = 'none';
}

export function isLoreNoteOpen() {
  return !!overlayEl && overlayEl.style.display === 'flex';
}
