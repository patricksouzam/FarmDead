import * as THREE from 'three';
import {
  makeGrassTexture, makeDirtTexture, makeTilledDirtTexture,
  makeWoodTexture, makeRoofTexture, makeStoneTexture
} from '../textures.js';
import { buildLowPolyHumanoid } from '../characters.js';
import { voxelBox, voxelStairRoof, buildVoxelTree, buildVoxelCloud, voxelMat } from '../voxel.js';
import { createTerrainForArea } from '../terrain/terrainMesh.js';
import { getGroundHeightAt, FARM_BASE_HEIGHT } from '../terrain/heightmap.js';
import { getMap } from '../mapLoader.js';
import { createLantern } from '../lighting.js';
import { registerObstacle, registerOrientedBox, PLAY_BOUNDS } from '../terrain/obstacles.js';

// Altura andável do terreno plano da fazenda — MESMA convenção de
// getGroundHeightAt/placeOnTerrain (FARM_BASE_HEIGHT + 1, topo do bloco +1,
// não FARM_BASE_HEIGHT puro). Usada onde é mais direto somar um valor fixo
// em vez de chamar placeOnTerrain (ex.: offsets relativos dentro de
// buildFenceLoop, ou o collar decorativo).
export const FARM_TERRAIN_TOP_Y = FARM_BASE_HEIGHT + 1;

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

// Posições de referência da fazenda usadas só dentro deste módulo (montanhas,
// grama, caminhos) — as posições "públicas" de landmarks continuam em world.js.
const CAVE_POSITION_REF = { x: -24, z: 8 };
const LAKE_GATE_REF = { x: 24, z: 8 };
const WINDMILL_POSITION_REF = { x: 20, z: -8 };
const HOUSE_POSITION_REF = { x: 0, z: -12 };
const BARN_POSITION_REF = { x: 14, z: -12 };
const SILO_POSITION_REF = { x: 18, z: -16 };
const CAR_POSITION_REF = { x: 5.5, z: -9.5 };

export const textures = {
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

// Construções: tons dessaturados/terrosos (reboco, madeira, telha velha) em vez
// de cor primária viva — cada casa da vila usa a paleta do seu morador.
export const palette = {
  wallCream: 0xd8cbaa,
  wallBarnRed: 0xa8442f,
  trimWhite: 0xe8e2d4,
  roofSlate: 0x545d5f,
  roofBarn: 0x5c3226,
  roofHouse: 0x8a4632,
  woodLight: 0x9b7a52,
  woodMid: 0x7a5a3c,
  woodDark: 0x453322,
  metalDark: 0x2c2c2c,
  metalMid: 0x9aa0a6,
  metalLight: 0xd8dde2,
  stoneGrey: 0x9b968c,
  foliageA: 0x4fa32f,
  foliageB: 0x3c8a28,
  foliageC: 0x69c243,
  grassGround: 0x5cb03e,
  mountainRock: 0x7d5a72,
  mountainRockLight: 0x9673a3,
  rockGrey: 0x9a9690,
  rockGreyLight: 0xb5b0a8,
  // Casas da vila — uma paleta por morador em vez de hex soltos nas chamadas.
  wallMerchant: 0xc9b192,
  roofMerchant: 0x5c4130,
  wallSupplier: 0xb9c0a8,
  roofSupplier: 0x4a5638,
  wallGov: 0xb8bcc2,
  roofGov: 0x545d5f,
  wallBakery: 0xd8cbaa,
  roofBakery: 0x7a4a2c
};

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.02, ...opts });
}
export function texMat(map, opts = {}) {
  return new THREE.MeshStandardMaterial({ map, flatShading: true, roughness: 0.78, ...opts });
}

/** Clone de textura com repeat próprio — para paredes/telhados de tamanhos distintos sem afetar o tile global do terreno. */
export function wallTexture(source, repeatX, repeatY) {
  const tex = source.clone();
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
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

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5eb8ef);
  // Névoa sutil — mantém horizonte soft sem lavar o contraste voxel.
  scene.fog = new THREE.FogExp2(0x080c12, 0.028);
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

export { createLighting as createLights } from '../lighting.js';

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
    if (Math.hypot(x - CAVE_POSITION_REF.x, z - CAVE_POSITION_REF.z) < 6) continue;
    if (Math.hypot(x - LAKE_GATE_REF.x, z - LAKE_GATE_REF.z) < 6) continue;
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

  placeOnTerrain(group, WINDMILL_POSITION_REF.x, WINDMILL_POSITION_REF.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.85);
  return { group, hub };
}

// ---------------------------------------------------------------------------
// Casa
// ---------------------------------------------------------------------------

export function createHouse(scene, level) {
  const group = new THREE.Group();
  placeOnTerrain(group, HOUSE_POSITION_REF.x, HOUSE_POSITION_REF.z, 'farm');
  scene.add(group);
  buildHouse(group, level);
  const w = group.userData.width || 5.2;
  const d = group.userData.depth || 4.4;
  registerOrientedBox(group.position.x, group.position.z, w, d, 0, 'farm');
  return group;
}

export function buildHouse(group, level) {
  while (group.children.length) group.remove(group.children[0]);

  const wallMat = texMat(wallTexture(textures.stone, 1.4, 1.1), { color: palette.wallCream, roughness: 0.82 });
  const woodMat = texMat(wallTexture(textures.wood, 1, 1.6), { color: palette.woodLight, roughness: 0.85 });
  const trimMat = mat(palette.trimWhite, { roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffd89a, roughness: 0.28, metalness: 0.08, transparent: true, opacity: 0.9, flatShading: true,
    emissive: 0xffc878, emissiveIntensity: 0.55
  });

  const width = level === 1 ? 5.2 : 6.6;
  const depth = level === 1 ? 4.4 : 5.4;
  const height = level === 1 ? 3.6 : 4.4;

  const plinthMat = texMat(wallTexture(textures.stone, 1.6, 0.4), { color: palette.stoneGrey, roughness: 0.88 });
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
    map: wallTexture(textures.roof, 2.4, 2),
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
    color: palette.roofHouse, map: wallTexture(textures.roof, 1.2, 1), layers: 2, stepH: 0.22, overhang: 0.16
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

  const door = voxelBox(0.95, 2.1, 0.1, palette.woodDark);
  door.position.set(width / 2 - 1.05, 1.05, depth / 2 + 0.05);
  group.add(door);
  const knob = voxelBox(0.08, 0.08, 0.08, palette.metalMid);
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
    map: wallTexture(textures.roof, 2.4, 1),
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
  placeOnTerrain(group, CAR_POSITION_REF.x, CAR_POSITION_REF.z, 'farm');
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

  placeOnTerrain(group, BARN_POSITION_REF.x, BARN_POSITION_REF.z, 'farm');
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

  placeOnTerrain(group, SILO_POSITION_REF.x, SILO_POSITION_REF.z, 'farm');
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 1.45);
  return group;
}
