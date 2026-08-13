import * as THREE from 'three';
import { makeTilledDirtTexture } from './textures.js';

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
  const mat = cropMat(color);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, height * 0.5, 5), cropMat(0x6b8f3a));
  stem.position.y = height * 0.25;
  stem.castShadow = true;
  group.add(stem);

  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.lineTo(radius * 0.5, height * 0.35);
  leafShape.lineTo(0, height * 0.75);
  leafShape.lineTo(-radius * 0.35, height * 0.3);
  leafShape.closePath();
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.015, bevelEnabled: false });
  leafGeo.translate(0, 0, -0.0075);

  [-0.4, 0.4].forEach((tilt, i) => {
    const leaf = new THREE.Mesh(leafGeo, mat);
    leaf.position.set(0, height * 0.4, 0);
    leaf.rotation.y = i === 0 ? 0 : Math.PI * 0.55;
    leaf.rotation.z = tilt;
    leaf.castShadow = true;
    group.add(leaf);
  });

  return group;
}

// Touceira de folhas full-grown (sem raiz visível ainda): 5-6 lâminas em leque
// saindo de um ponto central rente ao solo — usada como estágio intermediário
// de raízes como a cenoura, antes de a parte comestível aparecer.
function leafyTuftStage(radius, height, color) {
  const group = new THREE.Group();
  const mat = cropMat(color);
  const leafCount = 5 + Math.floor(Math.random() * 2);
  for (let i = 0; i < leafCount; i++) {
    const leafHeight = height * (0.8 + Math.random() * 0.35);
    const leaf = new THREE.Mesh(leafBladeGeometry(leafHeight, radius * 0.85), mat);
    const angle = (i / leafCount) * Math.PI * 2 + Math.random() * 0.3;
    leaf.rotation.y = angle;
    leaf.rotation.x = -0.35 - Math.random() * 0.15;
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

// Talo com leve afunilamento e folhas em cunha achatada (Shape extrudado) presas
// em alturas crescentes — substitui os cones de revolução simétricos por folhas
// com uma face de frente e verso reconhecível, mais próximas de um asset modelado.
function leafBladeGeometry(length, width) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width * 0.5, length * 0.4, width * 0.15, length);
  shape.quadraticCurveTo(0, length * 1.04, -width * 0.15, length);
  shape.quadraticCurveTo(-width * 0.5, length * 0.4, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
  geo.translate(0, 0, -0.006);
  return geo;
}

function cylinderStalk(height, color, leafCount = 4) {
  const group = new THREE.Group();
  const stalkMat = cropMat(color);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.075, height, 6), stalkMat);
  stalk.position.y = height / 2;
  stalk.castShadow = true;
  group.add(stalk);

  for (let i = 0; i < leafCount; i++) {
    const t = i / Math.max(leafCount - 1, 1);
    const leafGroup = new THREE.Group();
    const leafLength = 0.42 * (1 - t * 0.35);
    const leaf = new THREE.Mesh(leafBladeGeometry(leafLength, leafLength * 0.42), stalkMat);
    leafGroup.add(leaf);
    leafGroup.position.set(0, height * (0.32 + t * 0.42), 0);
    leafGroup.rotation.y = i * 2.1;
    leafGroup.rotation.z = Math.PI / 2.6;
    group.add(leafGroup);
  }
  return group;
}

// Folhagem verde visível por cima do solo, com a raiz laranja facetada apontando
// para baixo (enterrada) — anéis de crescimento sugeridos por leve afunilamento
// em degraus em vez de sulcos toroidais sobrepostos.
function rootVeggie(height, color, stalkHeight) {
  const group = new THREE.Group();
  const stalk = cylinderStalk(stalkHeight * 0.6, 0x689f38, 5);
  stalk.position.y = 0.08;
  group.add(stalk);

  const rootMat = cropMat(color, { roughness: 0.5 });
  const root = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.4, 7), rootMat);
  root.position.y = -0.1;
  root.rotation.x = Math.PI;
  root.castShadow = true;
  group.add(root);

  // Segmentos facetados de raio decrescente para sugerir os anéis da cenoura
  [0.02, -0.07, -0.16].forEach((y, i) => {
    const segRadius = 0.15 - i * 0.035;
    const segment = new THREE.Mesh(new THREE.CylinderGeometry(segRadius, segRadius * 0.85, 0.03, 7), rootMat);
    segment.position.y = y;
    group.add(segment);
  });

  const rootTip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 6), cropMat(0xffcf8a, { roughness: 0.6 }));
  rootTip.position.y = -0.33;
  rootTip.rotation.x = Math.PI;
  group.add(rootTip);
  return group;
}

function cornStage() {
  const group = new THREE.Group();
  const mainStalk = cylinderStalk(1.3, 0x7cb342, 5);
  group.add(mainStalk);

  const earMat = cropMat(0xf0d048, { roughness: 0.5 });
  const huskMat = cropMat(0x6ba13a, { roughness: 0.75 });
  const silkMat = cropMat(0xd8c878, { roughness: 0.6, flatShading: false });

  function buildEar(x, y, z, rot, scale) {
    const earGroup = new THREE.Group();
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.11 * scale, 0.42 * scale, 7), earMat);
    earGroup.add(ear);
    const husk = new THREE.Mesh(new THREE.ConeGeometry(0.1 * scale, 0.2 * scale, 7), huskMat);
    husk.position.y = -0.31 * scale;
    earGroup.add(husk);
    earGroup.position.set(x, y, z);
    earGroup.rotation.z = rot;
    earGroup.castShadow = true;
    return earGroup;
  }

  const ear = buildEar(0.11, 0.72, 0.06, 0.18, 1);
  group.add(ear);
  const ear2 = buildEar(-0.1, 0.45, -0.05, -0.22, 0.68);
  group.add(ear2);

  for (let i = 0; i < 4; i++) {
    const silk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), silkMat);
    silk.position.set(0.155 + i * 0.008, 0.93, 0.06 + (i - 1.5) * 0.015);
    silk.rotation.z = 0.3 + i * 0.08;
    group.add(silk);
  }

  return group;
}

// Abóbora assentada diretamente no solo (rasteira), com a rama saindo pro lado.
// Corpo principal em icosaedro facetado com gomos sugeridos por faixas planas
// (não cilindros curvados atravessando o volume), silhueta mais limpa.
function pumpkinStage() {
  const group = new THREE.Group();
  const vineMat = cropMat(0x689f38);
  const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 6), vineMat);
  vine.rotation.z = Math.PI / 2.3;
  vine.position.set(-0.22, 0.1, 0);
  vine.castShadow = true;
  group.add(vine);

  [[-0.42, 0.14, 0, 0.16], [-0.28, 0.13, 0.16, 0.12], [-0.15, 0.12, -0.14, 0.1]].forEach(([x, y, z, r]) => {
    const leaf = new THREE.Mesh(leafBladeGeometry(r, r * 0.9), vineMat);
    leaf.position.set(x, y, z);
    leaf.rotation.x = -Math.PI / 2;
    leaf.rotation.z = Math.random() * Math.PI;
    group.add(leaf);
  });

  const pumpkinColor = Math.random() > 0.5 ? 0xef7f1a : 0xf2a028;
  const pumpkinMat = cropMat(pumpkinColor, { roughness: 0.55 });

  const pumpkin = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), pumpkinMat);
  pumpkin.position.y = 0.24;
  pumpkin.scale.set(1, 0.82, 1);
  pumpkin.castShadow = true;
  group.add(pumpkin);

  // Gomos sugeridos por triângulos achatados colados à superfície, em vez de
  // cilindros atravessando o volume — leem como nervuras sem furar a malha.
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.62, 3), pumpkinMat);
    ridge.rotation.x = Math.PI / 2;
    ridge.rotation.z = angle;
    ridge.position.set(Math.sin(angle) * 0.05, 0.24, Math.cos(angle) * 0.05);
    ridge.scale.set(0.5, 1, 0.18);
    group.add(ridge);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.14, 6), vineMat);
  stem.position.y = 0.46;
  group.add(stem);

  const smallCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < smallCount; i++) {
    const small = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + Math.random() * 0.05, 1), pumpkinMat);
    small.position.set(-0.3 - i * 0.16, 0.11, (i % 2 === 0 ? 1 : -1) * 0.08);
    small.scale.set(1, 0.82, 1);
    small.castShadow = true;
    group.add(small);
  }

  return group;
}

// Espiga de trigo: talo fino com uma fileira de grãos facetados (cones curtos
// alternados) ao redor do topo, terminando numa aresta afunilada — leitura de
// "espiga" sem geometria de revolução suave.
function wheatStage() {
  const group = new THREE.Group();
  const stalk = cylinderStalk(0.75, 0xc9b64a, 3);
  group.add(stalk);

  const grainMat = cropMat(0xe0c848, { roughness: 0.6 });
  const earGroup = new THREE.Group();
  earGroup.position.y = 0.75;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const side = i % 2 === 0 ? 1 : -1;
    const grain = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 5), grainMat);
    grain.position.set(side * 0.045, t * 0.42, 0);
    grain.rotation.z = side * 0.55;
    earGroup.add(grain);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), grainMat);
  tip.position.y = 0.5;
  earGroup.add(tip);
  group.add(earGroup);

  return group;
}

// Beterraba: raiz esférica facetada roxo-avermelhada meio enterrada, com
// folhagem de nervuras vermelhas saindo do topo — reaproveita leafBladeGeometry
// mas com talos tingidos, para diferenciar da cenoura (raiz cônica laranja).
function beetVeggie() {
  const group = new THREE.Group();
  const leafMat = cropMat(0x7bb04a);
  const veinMat = cropMat(0xa8304a, { roughness: 0.6 });

  const leafCount = 5;
  for (let i = 0; i < leafCount; i++) {
    const leafHeight = 0.3 + Math.random() * 0.12;
    const leaf = new THREE.Mesh(leafBladeGeometry(leafHeight, leafHeight * 0.45), leafMat);
    const angle = (i / leafCount) * Math.PI * 2;
    leaf.position.y = 0.06;
    leaf.rotation.y = angle;
    leaf.rotation.x = -0.45;
    leaf.castShadow = true;
    group.add(leaf);

    const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, leafHeight * 0.6, 4), veinMat);
    vein.position.set(Math.sin(angle) * 0.05, 0.08, Math.cos(angle) * 0.05);
    vein.rotation.x = -0.45;
    vein.rotation.y = angle;
    group.add(vein);
  }

  const rootMat = cropMat(0x8a2050, { roughness: 0.5 });
  const root = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), rootMat);
  root.position.y = -0.02;
  root.scale.set(1, 0.9, 1);
  root.castShadow = true;
  group.add(root);

  const rootTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 5), rootMat);
  rootTip.position.y = -0.22;
  rootTip.rotation.x = Math.PI;
  group.add(rootTip);

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
