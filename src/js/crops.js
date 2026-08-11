import * as THREE from 'three';
import { makeTilledDirtTexture } from './textures.js';

const tilledTexture = makeTilledDirtTexture();
tilledTexture.repeat.set(1, 1);

const plotMat = new THREE.MeshStandardMaterial({ map: tilledTexture, roughness: 0.95 });
const wetPlotMat = new THREE.MeshStandardMaterial({ map: tilledTexture, roughness: 0.6, color: 0x9fa9c2 });

export function rebuildFarmPlots(scene, farmPlots, farmLevel) {
  farmPlots.forEach(p => scene.remove(p));
  farmPlots.length = 0;

  let rows = 3, cols = 4;
  if (farmLevel === 2) { rows = 4; cols = 5; }
  if (farmLevel === 3) { rows = 5; cols = 6; }

  const spacing = 2.3;
  const startX = -((cols - 1) * spacing) / 2;
  const startZ = -1.0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const group = new THREE.Group();
      const x = startX + c * spacing;
      const z = startZ + r * spacing;
      group.position.set(x, 0.05, z);

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

const stageBuilders = {
  Cenoura: [
    () => coneStage(0.18, 0.3, 0x8bc34a),
    () => coneStage(0.28, 0.55, 0x689f38),
    () => rootVeggie(0.28, 0xff7b00, 0.55)
  ],
  Milho: [
    () => coneStage(0.16, 0.35, 0x9ccc65),
    () => cylinderStalk(0.7, 0x7cb342),
    () => cornStage()
  ],
  Abóbora: [
    () => coneStage(0.2, 0.3, 0x8bc34a),
    () => cylinderStalk(0.5, 0x689f38),
    () => pumpkinStage()
  ]
};

function coneStage(radius, height, color) {
  // Broto: 2-3 folhas cotiledonares finas em leque, em vez de 1 cone único simétrico
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
  const leafCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < leafCount; i++) {
    const leafHeight = height * (0.85 + Math.random() * 0.3);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.55, leafHeight, 5), mat);
    leaf.position.y = leafHeight / 2;
    const angle = (i / leafCount) * Math.PI * 2 + Math.random() * 0.4;
    leaf.rotation.z = Math.cos(angle) * 0.18;
    leaf.rotation.x = Math.sin(angle) * 0.18;
    leaf.position.x = Math.sin(angle) * radius * 0.3;
    leaf.position.z = Math.cos(angle) * radius * 0.3;
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function cylinderStalk(height, color, leafCount = 4) {
  const group = new THREE.Group();
  // talo com leve afunilamento para o topo, em vez de um cilindro perfeitamente reto
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, height, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  stalk.position.y = height / 2;
  stalk.castShadow = true;
  group.add(stalk);
  // folhas em alturas crescentes ao longo do talo, maiores nas mais baixas
  for (let i = 0; i < leafCount; i++) {
    const t = i / Math.max(leafCount - 1, 1);
    const leafGroup = new THREE.Group();
    const leafSize = 0.45 * (1 - t * 0.35);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, leafSize, 4), new THREE.MeshStandardMaterial({ color, flatShading: true }));
    leaf.position.y = leafSize / 2;
    leafGroup.add(leaf);
    leafGroup.position.set(0, height * (0.35 + t * 0.4), 0);
    leafGroup.rotation.y = i * 2.1;
    leafGroup.rotation.z = Math.PI / 2.8;
    group.add(leafGroup);
  }
  return group;
}

function rootVeggie(height, color, stalkHeight) {
  // Folhagem verde visível por cima do solo, com a raiz laranja apontando para baixo
  // (enterrada), em vez do cone flutuando de cabeça para baixo acima do talo.
  const group = new THREE.Group();
  const stalk = cylinderStalk(stalkHeight * 0.6, 0x689f38, 5);
  stalk.position.y = 0.08;
  group.add(stalk);
  const rootMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true });
  const root = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 8), rootMat);
  root.position.y = -0.1;
  root.rotation.x = Math.PI;
  root.castShadow = true;
  group.add(root);

  // Sulcos: pequenos torus rasos ao redor da raiz para textura realista
  [0.02, -0.08, -0.18].forEach(y => {
    const grooveRadius = 0.19 - Math.abs(y + 0.08) * 0.35;
    const groove = new THREE.Mesh(new THREE.TorusGeometry(Math.max(grooveRadius, 0.05), 0.012, 5, 8), rootMat);
    groove.position.y = y;
    groove.rotation.x = Math.PI / 2;
    group.add(groove);
  });

  const rootTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0xffcf8a, roughness: 0.6 }));
  rootTip.position.y = -0.34;
  rootTip.rotation.x = Math.PI;
  group.add(rootTip);
  return group;
}

function cornStage() {
  // Espiga alinhada ao talo (não destacada em ângulo arbitrário) e talo principal mais alto que os laterais
  const group = new THREE.Group();
  const mainStalk = cylinderStalk(1.3, 0x7cb342, 5);
  group.add(mainStalk);

  const earMat = new THREE.MeshStandardMaterial({ color: 0xf0d048, roughness: 0.5 });
  const huskMat = new THREE.MeshStandardMaterial({ color: 0x6ba13a, roughness: 0.75, flatShading: true });
  const silkMat = new THREE.MeshStandardMaterial({ color: 0xd8c878, roughness: 0.6 });

  const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.42, 8), earMat);
  ear.position.set(0.11, 0.72, 0.06);
  ear.rotation.z = 0.18;
  ear.castShadow = true;
  group.add(ear);
  const husk = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), huskMat);
  husk.position.set(0.115, 0.5, 0.062);
  husk.rotation.z = Math.PI + 0.18;
  group.add(husk);

  // Cabelo da espiga: filamentos finos saindo da ponta
  for (let i = 0; i < 4; i++) {
    const silk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), silkMat);
    silk.position.set(0.155 + i * 0.008, 0.93, 0.06 + (i - 1.5) * 0.015);
    silk.rotation.z = 0.3 + i * 0.08;
    group.add(silk);
  }

  // Segunda espiga menor, mais baixa no talo
  const ear2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.28, 8), earMat);
  ear2.position.set(-0.1, 0.45, -0.05);
  ear2.rotation.z = -0.22;
  ear2.castShadow = true;
  group.add(ear2);
  const husk2 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8), huskMat);
  husk2.position.set(-0.105, 0.31, -0.052);
  husk2.rotation.z = Math.PI - 0.22;
  group.add(husk2);

  return group;
}

function pumpkinStage() {
  // Abóbora assentada diretamente no solo (rasteira), com a rama saindo pro lado — não empoleirada no topo de um talo vertical
  const group = new THREE.Group();
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x689f38, roughness: 0.8 });
  const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 6), vineMat);
  vine.rotation.z = Math.PI / 2.3;
  vine.position.set(-0.22, 0.1, 0);
  vine.castShadow = true;
  group.add(vine);

  // 2-3 folhas grandes distribuídas ao longo da rama
  [[-0.42, 0.14, 0, 0.18], [-0.28, 0.13, 0.16, 0.13], [-0.15, 0.12, -0.14, 0.11]].forEach(([x, y, z, r]) => {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(r, 0.05, 5), vineMat);
    leaf.position.set(x, y, z);
    leaf.rotation.x = Math.PI / 2;
    leaf.rotation.z = Math.random() * Math.PI;
    group.add(leaf);
  });

  const pumpkinColor = Math.random() > 0.5 ? 0xef7f1a : 0xf2a028;
  const pumpkinMat = new THREE.MeshStandardMaterial({ color: pumpkinColor, roughness: 0.55, flatShading: true });

  const pumpkin = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), pumpkinMat);
  pumpkin.position.y = 0.24;
  pumpkin.scale.set(1, 0.82, 1);
  pumpkin.castShadow = true;
  group.add(pumpkin);

  // Gomos: faixas finas de cilindro curvado ao redor da abóbora principal
  const gomoMat = new THREE.MeshStandardMaterial({ color: pumpkinColor, roughness: 0.5, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const gomo = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), gomoMat);
    gomo.position.set(Math.sin(angle) * 0.28, 0.24, Math.cos(angle) * 0.28);
    gomo.rotation.z = Math.PI / 2;
    gomo.rotation.y = -angle;
    group.add(gomo);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.14, 6), vineMat);
  stem.position.y = 0.46;
  group.add(stem);

  // 1-2 abóboras menores adicionais ao longo da rama
  const smallCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < smallCount; i++) {
    const small = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + Math.random() * 0.05, 1), pumpkinMat);
    small.position.set(-0.3 - i * 0.16, 0.11, (i % 2 === 0 ? 1 : -1) * 0.08);
    small.scale.set(1, 0.82, 1);
    small.castShadow = true;
    group.add(small);
  }

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

const weedMat = new THREE.MeshStandardMaterial({ color: 0x3d4a24, flatShading: true, roughness: 0.9 });

function buildWeedMesh() {
  const group = new THREE.Group();
  const tuftCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < tuftCount; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.05, 0.22 + Math.random() * 0.12, 5), weedMat);
    const angle = (i / tuftCount) * Math.PI * 2 + Math.random() * 0.6;
    const r = 0.12 + Math.random() * 0.15;
    tuft.position.set(Math.cos(angle) * r, 0.12, Math.sin(angle) * r);
    tuft.rotation.z = (Math.random() - 0.5) * 0.4;
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
