import * as THREE from 'three';
import { makeTilledDirtTexture } from './textures.js';
import { getGroundHeightAt } from './world.js';
import { getMap } from './mapLoader.js';

const tilledTexture = makeTilledDirtTexture();
tilledTexture.repeat.set(1, 1);

const plotMat = new THREE.MeshStandardMaterial({ map: tilledTexture, roughness: 0.95 });
const wetPlotMat = new THREE.MeshStandardMaterial({ map: tilledTexture, roughness: 0.6, color: 0x9fa9c2 });

export function rebuildFarmPlots(scene, farmPlots, farmLevel) {
  farmPlots.forEach(p => scene.remove(p));
  farmPlots.length = 0;

  let rows = 4, cols = 5;
  if (farmLevel === 2) { rows = 5; cols = 6; }
  if (farmLevel === 3) { rows = 6; cols = 7; }

  const origin = getMap()?.plotOrigin || {};
  const spacing = origin.spacing ?? 2.3;
  const startX = -((cols - 1) * spacing) / 2;
  const startZ = origin.startZ ?? -2.0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const group = new THREE.Group();
      const x = startX + c * spacing;
      const z = startZ + r * spacing;
      const groundY = getGroundHeightAt(x, z, 'farm');
      group.position.set(x, groundY + 0.05, z);

      const plotMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.9), plotMat.clone());
      plotMesh.castShadow = true;
      plotMesh.receiveShadow = true;
      group.add(plotMesh);
      group.userData.plotMesh = plotMesh;

      const borderMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
      const border = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.06, 2.05), borderMat);
      border.position.y = -0.06;
      group.add(border);

      group.userData.isPlot = true;
      group.userData.row = r;
      group.userData.col = c;
      group.userData.hasCrop = false;
      group.userData.cropRef = null;
      group.userData.hasWeed = false;
      group.userData.weedRef = null;

      scene.add(group);
      farmPlots.push(group);
    }
  }
}

export function createCropMesh(seedType, growthTime) {
  const group = new THREE.Group();
  group.position.set(0, 0.15, 0);

  group.userData = {
    status: 'growing',
    seedType,
    growthDuration: growthTime,
    watered: false,
    growthProgress: 0,
    stage: -1
  };

  return group;
}

function cropMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...opts });
}

const stageBuilders = {
  Cenoura: [
    () => seedlingStage(0.18, 0.28, 0x8bc34a),
    () => leafyTuftStage(0.28, 0.55, 0x689f38),
    () => rootVeggie(0.28, 0xff7b00, 0.55)
  ],
  Milho: [
    () => seedlingStage(0.16, 0.32, 0x9ccc65),
    () => cylinderStalk(0.7, 0x7cb342),
    () => cornStage()
  ],
  Abóbora: [
    () => seedlingStage(0.2, 0.26, 0x8bc34a),
    () => cylinderStalk(0.5, 0x689f38),
    () => pumpkinStage()
  ],
  Trigo: [
    () => seedlingStage(0.14, 0.22, 0xb5cc5a),
    () => cylinderStalk(0.45, 0xc9b64a, 3),
    () => wheatStage()
  ],
  Beterraba: [
    () => seedlingStage(0.17, 0.24, 0x7bb04a),
    () => leafyTuftStage(0.26, 0.4, 0x8a4a9a),
    () => beetVeggie()
  ]
};

// Estágio de broto: par de folhas cotiledonares em cunha (facetas planas, não
// cones simétricos) abrindo em V a partir de um caulículo fino — leitura clara
// de "planta recém-germinada" mesmo em poucos polígonos.
function seedlingStage(radius, height, color) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.06, height * 0.45, 0.06), cropMat(0x6b8f3a));
  stem.position.y = height * 0.22;
  stem.castShadow = true;
  group.add(stem);
  [-0.12, 0.12].forEach((x, i) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.9, 0.05, radius * 0.45), cropMat(color));
    leaf.position.set(x, height * 0.4, 0);
    leaf.rotation.z = i === 0 ? 0.4 : -0.4;
    leaf.castShadow = true;
    group.add(leaf);
  });
  return group;
}

function leafyTuftStage(radius, height, color) {
  const group = new THREE.Group();
  const mat = cropMat(color);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, height * 0.7, radius * 0.5), mat);
    const angle = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * radius * 0.25, height * 0.35, Math.sin(angle) * radius * 0.25);
    leaf.rotation.y = angle;
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function cylinderStalk(height, color, leafCount = 4) {
  const group = new THREE.Group();
  const stalkMat = cropMat(color);
  const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), stalkMat);
  stalk.position.y = height / 2;
  stalk.castShadow = true;
  group.add(stalk);
  for (let i = 0; i < leafCount; i++) {
    const t = i / Math.max(leafCount - 1, 1);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.14), stalkMat);
    leaf.position.set(0.16, height * (0.3 + t * 0.45), 0);
    leaf.rotation.y = i * 1.2;
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function rootVeggie(height, color, stalkHeight) {
  const group = new THREE.Group();
  const stalk = cylinderStalk(stalkHeight * 0.55, 0x689f38, 4);
  stalk.position.y = 0.08;
  group.add(stalk);
  const root = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.28), cropMat(color, { roughness: 0.5 }));
  root.position.y = -0.05;
  root.castShadow = true;
  group.add(root);
  return group;
}

function cornStage() {
  const group = new THREE.Group();
  const stalkOffsets = [[0, 0], [-0.18, 0.16], [0.15, -0.17]];
  stalkOffsets.forEach(([ox, oz], i) => {
    const height = 1.9 - i * 0.15;
    const stalk = cylinderStalk(height, 0x7cb342, 4);
    stalk.position.set(ox, 0, oz);
    stalk.rotation.y = i * 1.9;
    group.add(stalk);
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.16), cropMat(0xf0d048, { roughness: 0.5 }));
    ear.position.set(ox + 0.14, height * 0.7, oz);
    ear.castShadow = true;
    group.add(ear);
  });
  return group;
}

function pumpkinStage() {
  const group = new THREE.Group();
  const vine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), cropMat(0x689f38));
  vine.position.y = 0.08;
  group.add(vine);
  const pumpkin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.45), cropMat(0xe07020, { roughness: 0.55 }));
  pumpkin.position.y = 0.28;
  pumpkin.castShadow = true;
  group.add(pumpkin);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), cropMat(0x4a6a28));
  stem.position.y = 0.52;
  group.add(stem);
  return group;
}

function wheatStage() {
  const group = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), cropMat(0xc9b64a));
    stalk.position.set((i - 2) * 0.1, 0.28, (i % 2) * 0.06);
    stalk.castShadow = true;
    group.add(stalk);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), cropMat(0xe0c860));
    head.position.set((i - 2) * 0.1, 0.6, (i % 2) * 0.06);
    group.add(head);
  }
  return group;
}

function beetVeggie() {
  const group = new THREE.Group();
  const leaves = leafyTuftStage(0.22, 0.35, 0x8a4a9a);
  leaves.position.y = 0.1;
  group.add(leaves);
  const beet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), cropMat(0x8b1a3a, { roughness: 0.55 }));
  beet.position.y = 0.05;
  beet.castShadow = true;
  group.add(beet);
  return group;
}

export function updateCropVisualState(crop) {
  const stageIndex = crop.userData.status === 'ready' ? 2
    : crop.userData.growthProgress >= crop.userData.growthDuration * 0.45 ? 1 : 0;

  if (stageIndex === crop.userData.stage) return;
  crop.userData.stage = stageIndex;

  while (crop.children.length) crop.remove(crop.children[0]);
  const builder = stageBuilders[crop.userData.seedType][stageIndex];
  crop.add(builder());
}

export function setPlotWetVisual(plot, wet) {
  plot.userData.plotMesh.material = wet ? wetPlotMat : plotMat;
}

const needsWaterMat = cropMat(0xe0ac42, { roughness: 0.55, emissive: 0xc98a28, emissiveIntensity: 0.35 });

export function setPlotNeedsWaterHint(plot, needs) {
  if (!plot) return;
  if (plot.userData.needsWaterHint) {
    plot.remove(plot.userData.needsWaterHint);
    plot.userData.needsWaterHint = null;
  }
  if (!needs) return;
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 4), needsWaterMat);
  marker.position.set(0, 0.85, 0);
  marker.rotation.x = Math.PI;
  marker.castShadow = false;
  plot.add(marker);
  plot.userData.needsWaterHint = marker;
}

const weedMat = cropMat(0x3d4a24, { roughness: 0.9 });

function buildWeedMesh() {
  const group = new THREE.Group();
  const tuftCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < tuftCount; i++) {
    const bladeLength = 0.2 + Math.random() * 0.14;
    const tuft = new THREE.Mesh(leafBladeGeometry(bladeLength, bladeLength * 0.32), weedMat);
    const angle = (i / tuftCount) * Math.PI * 2 + Math.random() * 0.6;
    const r = 0.1 + Math.random() * 0.14;
    tuft.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r);
    tuft.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    tuft.rotation.z = angle;
    tuft.castShadow = true;
    group.add(tuft);
  }
  return group;
}

// Chance de nascer erva daninha num plot vazio ou com plantação ainda crescendo
// (não em plots já prontos para colher, para não punir quem está com a colheita
// atrasada por outro motivo). Chamado periodicamente pelo main.js, não todo frame.
export function maybeSpawnWeed(plot) {
  if (plot.userData.hasWeed) return;
  if (plot.userData.hasCrop && plot.userData.cropRef.userData.status === 'ready') return;

  const weed = buildWeedMesh();
  plot.add(weed);
  plot.userData.hasWeed = true;
  plot.userData.weedRef = weed;
}

export function removeWeed(plot) {
  if (!plot.userData.hasWeed) return false;
  plot.remove(plot.userData.weedRef);
  plot.userData.hasWeed = false;
  plot.userData.weedRef = null;
  return true;
}
