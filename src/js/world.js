import * as THREE from 'three';
import {
  makeGrassTexture, makeDirtTexture, makeTilledDirtTexture,
  makeWoodTexture, makeRoofTexture, makeStoneTexture
} from './textures.js';

// ---------------------------------------------------------------------------
// Direção de arte — Low Poly rural estilizado.
// Uma única paleta compartilhada por todos os objetos da cena garante que
// casa, celeiro, silo, moinho, cercas, árvores e veículo leiam como parte do
// mesmo universo visual. flatShading fica ligado por padrão em toda a
// vegetação/orgânicos para reforçar a leitura de facetas Low Poly; superfícies
// arquitetônicas (madeira, pedra, metal) usam as texturas proceduraisexistentes
// para não perder o acabamento já validado no projeto.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Colisão — registro simples de obstáculos estáticos (posição XZ + raio de
// exclusão). Cada create* de objeto sólido (construções, árvores, rochas,
// silo, moinho) registra sua área ocupada aqui via registerObstacle(); animais
// soltos usam avoidObstacles() para não atravessar esses volumes ao vaguear.
// ---------------------------------------------------------------------------
const obstacles = [];

function registerObstacle(x, z, radius) {
  obstacles.push({ x, z, radius });
}

export function getObstacles() {
  return obstacles;
}

// Empurra (x, z) para fora de qualquer obstáculo cujo raio + margem invada,
// deslocando ao longo da linha centro-obstáculo → ponto. Usada pela IA de
// animais para não atravessar construções/árvores/rochas ao vaguear.
export function avoidObstacles(x, z, margin = 0.3) {
  for (const o of obstacles) {
    const dx = x - o.x;
    const dz = z - o.z;
    const minDist = o.radius + margin;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist && dist > 0.0001) {
      const push = minDist / dist;
      x = o.x + dx * push;
      z = o.z + dz * push;
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
textures.grass.repeat.set(18, 18);
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
  scene.background = new THREE.Color(0x6ec2ef);
  // Névoa bem mais sutil de dia — a versão anterior lavava o contraste de
  // toda a cena a poucos metros de distância da câmera padrão.
  scene.fog = new THREE.FogExp2(0x9fd8f0, 0.0035);
  return scene;
}

export function createSky(scene) {
  const uniforms = {
    topColor: { value: new THREE.Color(0x1f7fe0) },
    bottomColor: { value: new THREE.Color(0xa9e2ff) },
    offset: { value: 20 },
    exponent: { value: 0.6 }
  };
  const skyGeo = new THREE.SphereGeometry(300, 24, 16);
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
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  return uniforms;
}

export function createClouds(scene) {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });

  for (let i = 0; i < 14; i++) {
    const scale = 6 + Math.random() * 8;
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(scale * 2, scale), cloudMat);
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 70;
    cloud.position.set(Math.cos(angle) * dist, 28 + Math.random() * 14, Math.sin(angle) * dist);
    cloud.rotation.y = Math.random() * Math.PI * 2;
    cloud.userData.driftSpeed = 0.3 + Math.random() * 0.4;
    group.add(cloud);
  }

  scene.add(group);
  return group;
}

export function createLights(scene) {
  // Ambient/hemisférico um pouco mais fortes que antes para preencher as
  // sombras com luz colorida do céu/chão em vez de ficarem quase pretas,
  // mantendo o sol como a principal fonte de volume e sombra projetada.
  const ambientLight = new THREE.AmbientLight(0xdfe8ff, 0.42);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xcfe8ff, 0x6a8a46, 0.55);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff3d6, 3.4);
  sunLight.position.set(30, 40, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 140;
  const d = 40;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0015;
  sunLight.shadow.radius = 1.8;
  scene.add(sunLight);

  // Luz de preenchimento fria e fraca, oposta ao sol: suaviza o lado escuro
  // dos volumes sem apagar as sombras projetadas.
  const fillLight = new THREE.DirectionalLight(0xaecdff, 0.35);
  fillLight.position.set(-25, 18, -18);
  scene.add(fillLight);

  const moonLight = new THREE.DirectionalLight(0x9fbaff, 0);
  moonLight.position.set(-30, 40, -20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 140;
  moonLight.shadow.camera.left = -d;
  moonLight.shadow.camera.right = d;
  moonLight.shadow.camera.top = d;
  moonLight.shadow.camera.bottom = -d;
  moonLight.shadow.bias = -0.0015;
  moonLight.shadow.radius = 2;
  scene.add(moonLight);

  return { ambientLight, hemiLight, sunLight, moonLight, fillLight };
}

export function createGround(scene) {
  const size = 60;
  const segs = 48;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = (Math.sin(x * 0.15) * Math.cos(y * 0.15)) * 0.15;
    pos.setZ(i, h);
  }
  geo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: textures.grass,
    color: new THREE.Color(0xffffff),
    roughness: 0.95,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Colar circular de grama sob a base das montanhas — cobre o vão entre a
  // borda quadrada do campo jogável e o anel de picos, para o terreno verde
  // ler como contínuo até onde a cordilheira nasce, como nas referências.
  const collarMat = new THREE.MeshStandardMaterial({ color: palette.grassGround, roughness: 0.95 });
  const collar = new THREE.Mesh(new THREE.RingGeometry(size / 2 - 2, 55, 48), collarMat);
  collar.rotation.x = -Math.PI / 2;
  collar.position.y = -0.05;
  collar.receiveShadow = true;
  scene.add(collar);

  createMountains(scene);
  createRocks(scene);

  ground.userData.baseCollarColor = palette.grassGround;
  ground.userData.collarMat = collarMat;
  return ground;
}

// Cordilheira Low Poly ao redor do campo jogável: cones facetados (poucos
// segmentos radiais, sem suavização de normais) em cor sólida contrastante —
// nas referências as montanhas nunca usam a mesma textura pintada da grama,
// leem como blocos geométricos distintos vistos de longe.
function createMountains(scene) {
  const group = new THREE.Group();
  const colors = [palette.mountainRock, palette.mountainRockLight];
  const ringRadius = 34;
  const count = 26;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const dist = ringRadius + Math.random() * 14;
    const height = 9 + Math.random() * 14;
    const radius = 5 + Math.random() * 5;
    const geo = new THREE.ConeGeometry(radius, height, 5 + (i % 3));
    const peakMat = mat(colors[i % colors.length], { roughness: 0.9 });
    const peak = new THREE.Mesh(geo, peakMat);
    peak.position.set(Math.cos(angle) * dist, height / 2 - 0.6, Math.sin(angle) * dist);
    peak.rotation.y = Math.random() * Math.PI * 2;
    peak.castShadow = true;
    peak.receiveShadow = true;
    group.add(peak);
  }

  scene.add(group);
  return group;
}

// Pedras soltas espalhadas pelo campo — icosaedros facetados em cluster (uma
// rocha principal + 1-2 fragmentos menores encostados), como nas referências
// de moodboard. Sem essas, o chão de grama fica "vazio" perto de cercas/casas.
function buildRockCluster(rockMat, rockMatLight) {
  const group = new THREE.Group();
  const mainRadius = 0.22 + Math.random() * 0.22;
  const main = new THREE.Mesh(new THREE.IcosahedronGeometry(mainRadius, 0), Math.random() > 0.5 ? rockMat : rockMatLight);
  main.scale.set(1, 0.65 + Math.random() * 0.2, 1);
  main.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  main.position.y = mainRadius * 0.4;
  main.castShadow = true;
  main.receiveShadow = true;
  group.add(main);

  const fragCount = Math.random() > 0.4 ? 1 : 2;
  for (let i = 0; i < fragCount; i++) {
    const r = mainRadius * (0.35 + Math.random() * 0.25);
    const angle = Math.random() * Math.PI * 2;
    const frag = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), Math.random() > 0.5 ? rockMat : rockMatLight);
    frag.scale.set(1, 0.6 + Math.random() * 0.2, 1);
    frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    frag.position.set(Math.cos(angle) * mainRadius * 0.85, r * 0.4, Math.sin(angle) * mainRadius * 0.85);
    frag.castShadow = true;
    frag.receiveShadow = true;
    group.add(frag);
  }

  return group;
}

function createRocks(scene) {
  const group = new THREE.Group();
  const rockMat = mat(palette.rockGrey, { roughness: 0.9 });
  const rockMatLight = mat(palette.rockGreyLight, { roughness: 0.9 });

  const positions = [
    [-17.5, -6], [17.5, -3], [-15, 8], [16, 12], [-9, 20], [10, 22],
    [-19, 2], [8, -13], [-6, -13.5], [20, -14], [-20, -14], [4, 24]
  ];

  positions.forEach(([x, z]) => {
    const cluster = buildRockCluster(rockMat, rockMatLight);
    const scale = 0.8 + Math.random() * 0.6;
    const px = x + (Math.random() - 0.5) * 2;
    const pz = z + (Math.random() - 0.5) * 2;
    cluster.position.set(px, 0, pz);
    cluster.rotation.y = Math.random() * Math.PI * 2;
    cluster.scale.setScalar(scale);
    group.add(cluster);
    registerObstacle(px, pz, 0.44 * scale);
  });

  scene.add(group);
  return group;
}

// `routes`: array de { points: [[x,z], ...], width? } — cada rota é uma polyline
// (2+ pontos) que liga pontos de interesse com trechos retos e curvas nos vértices
// intermediários, formando uma rede de caminhos coerente (hub na casa, ramais mais
// estreitos para dependências secundárias).
export function createPaths(scene, routes) {
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
      mesh.position.set((ax + bx) / 2, 0.03, (az + bz) / 2);
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    pts.forEach(([px, pz]) => {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.rotation.x = -Math.PI / 2;
      cap.position.set(px, 0.03, pz);
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
function buildFenceLoop(group, points, { closed = true, postMat, capMat, wireMat } = {}) {
  const postGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.9, 6);
  const postCapGeo = new THREE.ConeGeometry(0.11, 0.14, 6);

  function addPost(x, z) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.45, z);
    post.rotation.y = Math.random() * Math.PI;
    post.castShadow = true;
    group.add(post);

    const cap = new THREE.Mesh(postCapGeo, capMat);
    cap.position.set(x, 0.97, z);
    group.add(cap);
  }

  function addRail(x1, z1, x2, z2, y) {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.06), postMat);
    rail.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    rail.rotation.y = -angle;
    rail.castShadow = true;
    group.add(rail);
  }

  function addWires(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const wireGeo = new THREE.CylinderGeometry(0.011, 0.011, length, 4);
    [0.76, 0.5, 0.2].forEach(h => {
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set((x1 + x2) / 2, h, (z1 + z2) / 2);
      wire.rotation.order = 'YXZ';
      wire.rotation.y = -angle;
      wire.rotation.x = Math.PI / 2;
      group.add(wire);
    });
  }

  const n = points.length;
  const segCount = closed ? n : n - 1;

  points.forEach(p => addPost(p[0], p[1]));

  for (let i = 0; i < segCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    addRail(a[0], a[1], b[0], b[1], 0.62);
    addRail(a[0], a[1], b[0], b[1], 0.32);
    addWires(a[0], a[1], b[0], b[1]);
  }
}

export function createFences(scene, boundsX, boundsZ) {
  const group = new THREE.Group();
  const postMat = texMat(textures.wood, { color: palette.woodMid, roughness: 0.85 });
  const capMat = texMat(textures.wood, { color: palette.woodDark, roughness: 0.85 });
  const wireMat = mat(0x8d8d82, { roughness: 0.55, metalness: 0.55, flatShading: false });

  const [minX, maxX] = boundsX;
  const [minZ, maxZ] = boundsZ;
  const step = 1.0;

  const perimeter = [];
  for (let x = minX; x < maxX; x += step) perimeter.push([x, minZ]);
  for (let z = minZ; z < maxZ; z += step) perimeter.push([maxX, z]);
  for (let x = maxX; x > minX; x -= step) perimeter.push([x, maxZ]);
  for (let z = maxZ; z > minZ; z -= step) perimeter.push([minX, z]);

  buildFenceLoop(group, perimeter, { closed: true, postMat, capMat, wireMat });

  scene.add(group);
  return group;
}

// Cerca menor e fechada para o curral de animais, com um vão sem fios/travessas
// (o "portão") centrado no lado indicado por `gateSide` ('north'|'south'|'east'|'west').
// Retorna { group, gate: {x, z, width}, bounds } para o main.js posicionar animais/porteira.
export function createCorral(scene, centerX, centerZ, width, depth, gateSide = 'south') {
  const group = new THREE.Group();
  const postMat = texMat(textures.wood, { color: palette.woodLight, roughness: 0.85 });
  const capMat = texMat(textures.wood, { color: palette.woodDark, roughness: 0.85 });
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

  buildFenceLoop(group, openPerimeter, { closed: false, postMat, capMat, wireMat });

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
  core.castShadow = true;
  group.add(core);

  const lobeCount = 3;
  for (let i = 0; i < lobeCount; i++) {
    const angle = (i / lobeCount) * Math.PI * 2 + Math.random() * 0.6;
    const r = baseRadius * (0.55 + Math.random() * 0.15);
    const lobe = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat);
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
  topLobe.position.y = baseRadius * 0.8;
  topLobe.castShadow = true;
  group.add(topLobe);

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
  const trunkMat = texMat(textures.wood, { color: palette.woodMid, roughness: 0.9 });
  const deadTrunkMat = texMat(textures.wood, { color: 0x4a4038, roughness: 0.95 });
  const leavesMats = [palette.foliageA, palette.foliageB, palette.foliageC].map(c => mat(c, { roughness: 0.85 }));

  const positions = [
    [-24, -20], [24, -20], [-26, 4], [26, 8], [-22, 24], [24, 22], [0, 28],
    [-30, -8], [30, -4], [12, 30], [-12, 30], [32, 20], [-32, 16]
  ];

  const eyesGroup = new THREE.Group();

  positions.forEach((pos, idx) => {
    const isDead = idx % 6 === 1;
    const scale = 0.85 + Math.random() * 0.5;
    let tree;

    if (isDead) {
      tree = buildDeadTree(deadTrunkMat);
    } else {
      tree = new THREE.Group();
      tree.add(buildTrunk(trunkMat, 2.6, 0.42, 0.22));

      const leafMat = leavesMats[idx % leavesMats.length];
      const canopy = buildCanopy(leafMat, 1.15);
      canopy.position.y = 3.05;
      tree.add(canopy);
    }

    tree.position.set(pos[0], 0, pos[1]);
    tree.scale.setScalar(scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
    registerObstacle(pos[0], pos[1], 1.15 * scale);

    if (idx % 3 === 0) {
      const angleToCenter = Math.atan2(-pos[1], -pos[0]) + Math.PI / 2;
      const eyes = buildLurkingEyes(pos[0] * 0.9, 1.1 + Math.random() * 0.6, pos[1] * 0.9, angleToCenter);
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
  const woodMat = texMat(textures.wood, { color: palette.woodMid, roughness: 0.85 });
  const roofMat = texMat(textures.roof, { color: palette.roofSlate, roughness: 0.55 });
  const bladeMat = mat(0xf0e6cc, { roughness: 0.55 });
  const hubMat = mat(palette.woodDark, { roughness: 0.7 });

  // Torre facetada octogonal com leve afunilamento, mais "talhada" que um cilindro liso
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.85, 6.4, 8), woodMat);
  tower.position.y = 3.2;
  tower.castShadow = true;
  group.add(tower);

  [1.6, 3.2, 4.8].forEach(y => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5 + (6.4 - y) * 0.02, 0.05, 5, 8), hubMat);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  });

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.0, 8), roofMat);
  cap.position.y = 6.9;
  cap.castShadow = true;
  group.add(cap);

  const hub = new THREE.Group();
  hub.position.set(0, 6.4, 0.68);

  const hubCore = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.4, 8), hubMat);
  hubCore.rotation.x = Math.PI / 2;
  hub.add(hubCore);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.26, 0);
  bladeShape.lineTo(0.26, 0);
  bladeShape.lineTo(0.09, 2.5);
  bladeShape.lineTo(-0.09, 2.5);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  bladeGeo.center();
  bladeGeo.translate(0, 1.25, 0);

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.castShadow = true;
    const pivot = new THREE.Group();
    pivot.rotation.z = (Math.PI / 2) * i;
    pivot.add(blade);
    hub.add(pivot);
  }
  group.add(hub);

  group.position.set(19, 0, -4.5);
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.9);
  return { group, hub };
}

// ---------------------------------------------------------------------------
// Casa
// ---------------------------------------------------------------------------

export function createHouse(scene, level) {
  const group = new THREE.Group();
  group.position.set(0, 0, -9.5);
  scene.add(group);
  buildHouse(group, level);
  // Raio fixo no tamanho máximo (nível 2) mesmo quando a casa ainda está no
  // nível 1 — ela pode crescer via upgrade, e outros objetos (NPCs, rochas,
  // animais) já são posicionados com essa margem de segurança.
  registerObstacle(group.position.x, group.position.z, 5.9);
  return group;
}

export function buildHouse(group, level) {
  while (group.children.length) group.remove(group.children[0]);

  const wallMat = mat(palette.wallCream, { roughness: 0.78 });
  const roofMat = texMat(textures.roof, { color: palette.roofHouse, roughness: 0.6 });
  const woodMat = texMat(textures.wood, { color: palette.woodLight, roughness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8f5, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
  const trimMat = mat(palette.trimWhite, { roughness: 0.6 });

  const width = level === 1 ? 6 : 9;
  const depth = level === 1 ? 5 : 7;
  const height = level === 1 ? 3.5 : 4.6;

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Telhado de duas águas real (perfil triangular extrudado ao longo da profundidade)
  const roofOverhang = 0.5;
  const roofRun = width / 2 + roofOverhang;
  const roofRise = width * 0.34;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-roofRun, 0);
  roofShape.lineTo(0, roofRise);
  roofShape.lineTo(roofRun, 0);
  roofShape.lineTo(-roofRun, 0);
  const roofDepth = depth + roofOverhang * 2;
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: roofDepth, bevelEnabled: false });
  roofGeo.translate(0, 0, -roofDepth / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = height;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Frontões triangulares fechando as pontas do telhado
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-width / 2, 0);
  gableShape.lineTo(0, roofRise);
  gableShape.lineTo(width / 2, 0);
  gableShape.lineTo(-width / 2, 0);
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  [depth / 2 - 0.02, -depth / 2 + 0.02].forEach(gz => {
    const gable = new THREE.Mesh(gableGeo, wallMat);
    gable.position.set(0, height, gz);
    if (gz < 0) gable.rotation.y = Math.PI;
    gable.castShadow = true;
    group.add(gable);
  });

  // Chaminé de pedra atravessando a água do telhado, com boca de fumaça no topo
  const stoneMat = texMat(textures.stone, { roughness: 0.9 });
  const chimneyX = -width * 0.22;
  const chimneySlope = roofRise / roofRun;
  const chimneyRoofY = height + roofRise - Math.abs(chimneyX) * chimneySlope;
  const chimneyHeight = 1.5;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, chimneyHeight, 0.55), stoneMat);
  chimney.position.set(chimneyX, chimneyRoofY + chimneyHeight / 2 - 0.15, depth * 0.22);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), stoneMat);
  chimneyCap.position.set(chimneyX, chimneyRoofY + chimneyHeight - 0.1, depth * 0.22);
  group.add(chimneyCap);

  const windowPositions = level === 1
    ? [[-1.4, depth / 2 + 0.03], [1.4, depth / 2 + 0.03]]
    : [[-2.6, depth / 2 + 0.03], [0, depth / 2 + 0.03], [2.6, depth / 2 + 0.03]];

  windowPositions.forEach(([wx]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.14), trimMat);
    frame.position.set(wx, height * 0.5, depth / 2 + 0.02);
    frame.castShadow = true;
    group.add(frame);
    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.87, 1.07, 0.1), mat(0x2c3a2e, { roughness: 0.9 }));
    recess.position.set(wx, height * 0.5, depth / 2 + 0.04);
    group.add(recess);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.98, 0.05), glassMat);
    glass.position.set(wx, height * 0.5, depth / 2 + 0.1);
    group.add(glass);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 0.08), trimMat);
    crossV.position.set(wx, height * 0.5, depth / 2 + 0.11);
    group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.08), trimMat);
    crossH.position.set(wx, height * 0.5, depth / 2 + 0.11);
    group.add(crossH);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.2), trimMat);
    sill.position.set(wx, height * 0.5 - 0.66, depth / 2 + 0.1);
    group.add(sill);

    const boxMat = texMat(textures.wood, { color: palette.woodLight, roughness: 0.85 });
    const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.26), boxMat);
    flowerBox.position.set(wx, height * 0.5 - 0.78, depth / 2 + 0.22);
    flowerBox.castShadow = true;
    group.add(flowerBox);
    const flowerColors = [0xe0546b, 0xf2c94c, 0xffffff];
    for (let i = 0; i < 5; i++) {
      const fx = wx - 0.36 + i * 0.18;
      const stem = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), mat(0x4a8f3a));
      stem.position.set(fx, height * 0.5 - 0.6, depth / 2 + 0.24);
      group.add(stem);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), mat(flowerColors[i % flowerColors.length]));
      bloom.position.set(fx, height * 0.5 - 0.52, depth / 2 + 0.24);
      group.add(bloom);
    }
  });

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.02, 0.08), mat(palette.trimWhite, { roughness: 0.6 }));
  doorFrame.position.set(width / 2 - 1.1, 1.01, depth / 2 + 0.02);
  group.add(doorFrame);

  const doorMat = texMat(textures.wood, { color: 0x8a5a3a, roughness: 0.8 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.1), doorMat);
  door.position.set(width / 2 - 1.1, 0.95, depth / 2 + 0.07);
  group.add(door);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat(0xd8b23a, { roughness: 0.35, metalness: 0.6 }));
  knob.position.set(width / 2 - 1.42, 0.92, depth / 2 + 0.14);
  group.add(knob);

  const porchDepth = 2.4;
  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(width + 1.2, 0.2, porchDepth), woodMat);
  porchFloor.position.set(0, 0.1, depth / 2 + porchDepth / 2);
  porchFloor.castShadow = true;
  porchFloor.receiveShadow = true;
  group.add(porchFloor);

  // Telhado da varanda com leve caimento (perfil em cunha)
  const porchRoofShape = new THREE.Shape();
  const porchRoofRun = porchDepth + 0.4;
  porchRoofShape.moveTo(0, 0.55);
  porchRoofShape.lineTo(porchRoofRun, 0);
  porchRoofShape.lineTo(porchRoofRun, -0.12);
  porchRoofShape.lineTo(0, 0.4);
  porchRoofShape.closePath();
  const porchRoofGeo = new THREE.ExtrudeGeometry(porchRoofShape, { depth: width + 1.2, bevelEnabled: false });
  porchRoofGeo.rotateY(Math.PI / 2);
  porchRoofGeo.translate(-(width + 1.2) / 2, height * 0.7, depth / 2 - 0.3);
  const porchRoof = new THREE.Mesh(porchRoofGeo, roofMat);
  porchRoof.castShadow = true;
  group.add(porchRoof);

  const pillarPositions = [-width / 2 - 0.4, -width / 6, width / 6, width / 2 + 0.4];
  const porchFrontZ = depth / 2 + porchDepth - 0.15;
  pillarPositions.forEach(px => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, height * 0.68, 8), woodMat);
    pillar.position.set(px, height * 0.35, porchFrontZ);
    pillar.castShadow = true;
    group.add(pillar);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), woodMat);
    capital.position.set(px, height * 0.69, porchFrontZ);
    group.add(capital);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), woodMat);
    pedestal.position.set(px, height * 0.01, porchFrontZ);
    group.add(pedestal);
  });

  // Corrimão com trilhos superior/inferior e balaustres verticais
  const railZ = depth / 2 + porchDepth - 0.05;
  const railTopGeo = new THREE.BoxGeometry(width + 1.0, 0.07, 0.07);
  const railTop = new THREE.Mesh(railTopGeo, woodMat);
  railTop.position.set(0, 0.62, railZ);
  group.add(railTop);
  const railBottom = new THREE.Mesh(railTopGeo, woodMat);
  railBottom.position.set(0, 0.2, railZ);
  group.add(railBottom);

  const balusterGeo = new THREE.BoxGeometry(0.05, 0.42, 0.05);
  const balusterSpacing = 0.32;
  const balusterCount = Math.floor((width + 1.0) / balusterSpacing);
  for (let i = 0; i <= balusterCount; i++) {
    const bx = -((width + 1.0) / 2) + i * balusterSpacing;
    const baluster = new THREE.Mesh(balusterGeo, woodMat);
    baluster.position.set(bx, 0.41, railZ);
    group.add(baluster);
  }

  // Vaso e banco lateral
  const potMat = mat(0x9a5a3a, { roughness: 0.85 });
  const potX = -width / 2 - 0.4;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 8), potMat);
  pot.position.set(potX, 0.26, depth / 2 + 0.4);
  pot.castShadow = true;
  group.add(pot);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(0x4a8f3a, { roughness: 0.85 }));
  bush.position.set(potX, 0.58, depth / 2 + 0.4);
  bush.castShadow = true;
  group.add(bush);

  const benchX = -width / 6;
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.42), woodMat);
  benchSeat.position.set(benchX, 0.42, depth / 2 + 0.35);
  benchSeat.castShadow = true;
  group.add(benchSeat);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.06), woodMat);
  benchBack.position.set(benchX, 0.66, depth / 2 + 0.15);
  group.add(benchBack);
  [-0.48, 0.48].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.38), woodMat);
    leg.position.set(benchX + lx, 0.21, depth / 2 + 0.35);
    group.add(leg);
  });

  // Lampião pendurado no pilar mais próximo da porta — aceso no escuro, apagado de
  // dia (ligado pelo main.js via group.userData.lantern.light).
  const lanternGroup = new THREE.Group();
  const lanternMat = mat(0x2a2a2a, { roughness: 0.6, metalness: 0.5 });
  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0x3a2f10, emissive: 0xffb347, emissiveIntensity: 0, roughness: 0.4, transparent: true, opacity: 0.9
  });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), lanternMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.15, 0, 0);
  lanternGroup.add(arm);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 6, 1, true), lanternMat);
  cage.position.set(0.3, -0.12, 0);
  lanternGroup.add(cage);
  const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 6), lanternGlassMat);
  lanternGlass.position.set(0.3, -0.12, 0);
  lanternGroup.add(lanternGlass);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 6), lanternMat);
  lanternCap.position.set(0.3, -0.02, 0);
  lanternGroup.add(lanternCap);
  const lanternLight = new THREE.PointLight(0xffb347, 0, 5, 2);
  lanternLight.position.set(0.3, -0.12, 0);
  lanternGroup.add(lanternLight);
  lanternGroup.position.set(pillarPositions[1] + 0.05, height * 0.62, porchFrontZ);
  group.add(lanternGroup);
  group.userData.lantern = { light: lanternLight, glassMat: lanternGlassMat };

  const npcGroup = buildRockingChairNpc(woodMat);
  npcGroup.position.set(width / 2 - 1.6, 0.2, depth / 2 + porchDepth - 0.9);
  group.add(npcGroup);
  group.userData.npc = npcGroup;

  const sleepGroup = buildSleepIndicator();
  sleepGroup.position.set(width / 2 - 1.6, height * 0.95, depth / 2 - 0.4);
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

  const rockerGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 12, Math.PI * 0.7);
  const rockerL = new THREE.Mesh(rockerGeo, woodMat);
  rockerL.rotation.z = Math.PI * 0.15;
  rockerL.position.set(-0.28, 0.15, 0);
  chairGroup.add(rockerL);
  const rockerR = rockerL.clone();
  rockerR.position.x = 0.28;
  chairGroup.add(rockerR);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.55), woodMat);
  seat.position.y = 0.55;
  chairGroup.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.07), woodMat);
  back.position.set(0, 0.9, -0.24);
  back.rotation.x = -0.15;
  chairGroup.add(back);

  [-0.26, 0.26].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), woodMat);
    leg.position.set(x, 0.35, 0.2);
    chairGroup.add(leg);
  });

  const npcShirtMat = mat(0x3f7cbf, { roughness: 0.75 });
  const npcOverallMat = mat(0x35507a, { roughness: 0.8 });
  const npcSkinMat = mat(0xf3c6a0, { roughness: 0.65 });
  const npcHatMat = mat(0xe0b03a, { roughness: 0.7 });
  const npcHatBandMat = mat(0xb8842a, { roughness: 0.7 });
  const npcBootMat = mat(0x4a3520, { roughness: 0.85 });
  const npcButtonMat = mat(0xdccb8a, { roughness: 0.5 });

  const npcPivot = new THREE.Group();
  npcPivot.position.set(0, 0.58, -0.05);
  chairGroup.add(npcPivot);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.42), npcShirtMat);
  torso.position.y = 0.35;
  npcPivot.add(torso);

  const overalls = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.44), npcOverallMat);
  overalls.position.y = 0.16;
  npcPivot.add(overalls);
  [-0.15, 0.15].forEach(x => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.06), npcOverallMat);
    strap.position.set(x, 0.5, -0.19);
    npcPivot.add(strap);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), npcButtonMat);
    button.position.set(x, 0.34, -0.2);
    npcPivot.add(button);
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.08, 8), npcSkinMat);
  neck.position.y = 0.64;
  npcPivot.add(neck);

  // Cabeça em pivô próprio (base do pescoço) para poder virar/assentir sem
  // deslocar o resto do busto — antes a cabeça era fixa ao torso.
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.7, 0);
  npcPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), npcSkinMat);
  head.position.y = 0.14;
  headPivot.add(head);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.08), npcSkinMat);
  nose.position.set(0, 0.12, 0.2);
  headPivot.add(nose);

  const eyeMat = mat(0x2b2118, { roughness: 0.4 });
  [-0.09, 0.09].forEach(x => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), eyeMat);
    eye.position.set(x, 0.18, 0.19);
    headPivot.add(eye);
  });

  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), mat(0x8a6b3d, { roughness: 0.7 }));
  mustache.position.set(0, 0.075, 0.195);
  headPivot.add(mustache);

  [-0.19, 0.19].forEach(x => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), npcSkinMat);
    ear.position.set(x, 0.14, 0);
    headPivot.add(ear);
  });

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 10), npcHatMat);
  hatBrim.position.y = 0.29;
  headPivot.add(hatBrim);

  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.26, 8), npcHatMat);
  hat.position.y = 0.44;
  headPivot.add(hat);

  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 8), npcHatBandMat);
  hatBand.position.y = 0.33;
  headPivot.add(hatBand);

  const handGeo = new THREE.SphereGeometry(0.075, 8, 8);
  const shoulderGeo = new THREE.SphereGeometry(0.1, 8, 8);

  function buildArm(x) {
    const shoulder = new THREE.Mesh(shoulderGeo, npcShirtMat);
    shoulder.position.set(x * 0.85, 0.58, 0.02);
    npcPivot.add(shoulder);

    const pivot = new THREE.Group();
    pivot.position.set(x, 0.52, 0.05);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), npcShirtMat);
    arm.position.y = -0.17;
    pivot.add(arm);
    const hand = new THREE.Mesh(handGeo, npcSkinMat);
    hand.position.y = -0.38;
    pivot.add(hand);
    pivot.rotation.x = -0.3;
    return pivot;
  }

  const armL = buildArm(-0.31);
  npcPivot.add(armL);
  const armR = buildArm(0.31);
  npcPivot.add(armR);
  npcPivot.userData.waveArm = armR;
  npcPivot.userData.restArm = armL;
  npcPivot.userData.headPivot = headPivot;

  const bootGeo = new THREE.BoxGeometry(0.16, 0.12, 0.26);
  [-0.15, 0.15].forEach(x => {
    const boot = new THREE.Mesh(bootGeo, npcBootMat);
    boot.position.set(x, 0.06, 0.28);
    npcPivot.add(boot);
  });

  chairGroup.userData.pivot = npcPivot;
  return chairGroup;
}

// ---------------------------------------------------------------------------
// Carro
// ---------------------------------------------------------------------------

export function createCar(scene) {
  const group = new THREE.Group();
  group.position.set(6.2, 0, -6.0);
  group.rotation.y = Math.PI;
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 2.2);
  return group;
}

export function buildCar(group, visible) {
  while (group.children.length) group.remove(group.children[0]);
  if (!visible) return;

  const bodyMat = mat(0x2e7d32, { roughness: 0.35, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8f5, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 });
  const wheelMat = mat(0x1a1a1a, { roughness: 0.9 });
  const rimMat = mat(0xb8b8b8, { roughness: 0.35, metalness: 0.6 });
  const trimMat = mat(0xd8d8d8, { roughness: 0.4, metalness: 0.5 });

  // Corpo principal com capô e traseira mais baixos que a cintura da cabine,
  // construído como perfil lateral extrudado — silhueta de carro real, não um bloco.
  const profile = new THREE.Shape();
  profile.moveTo(-2.2, 0.35);
  profile.lineTo(-2.2, 0.62);
  profile.lineTo(-1.15, 1.05);
  profile.lineTo(0.75, 1.05);
  profile.lineTo(1.55, 0.62);
  profile.lineTo(2.2, 0.5);
  profile.lineTo(2.2, 0.32);
  profile.lineTo(-2.2, 0.32);
  profile.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(profile, { depth: 1.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
  bodyGeo.translate(0, 0, -0.95);
  bodyGeo.rotateY(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.42;
  body.castShadow = true;
  group.add(body);

  const glassProfile = new THREE.Shape();
  glassProfile.moveTo(-1.05, 0);
  glassProfile.lineTo(-0.95, 0.42);
  glassProfile.lineTo(0.65, 0.42);
  glassProfile.lineTo(1.35, 0);
  glassProfile.closePath();
  const glassGeo = new THREE.ExtrudeGeometry(glassProfile, { depth: 1.75, bevelEnabled: false });
  glassGeo.translate(0, 0, -0.875);
  glassGeo.rotateY(Math.PI / 2);
  const cab = new THREE.Mesh(glassGeo, glassMat);
  cab.position.y = 0.62;
  cab.castShadow = true;
  group.add(cab);

  const bumperGeo = new THREE.BoxGeometry(2.34, 0.28, 0.22);
  const bumperF = new THREE.Mesh(bumperGeo, trimMat);
  bumperF.position.set(0, 0.42, -2.15);
  bumperF.castShadow = true;
  group.add(bumperF);
  const bumperB = new THREE.Mesh(bumperGeo, trimMat);
  bumperB.position.set(0, 0.42, 2.15);
  bumperB.castShadow = true;
  group.add(bumperB);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8);
  [[1.12, 0.42, 1.35], [-1.12, 0.42, 1.35], [1.12, 0.42, -1.35], [-1.12, 0.42, -1.35]].forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    wheel.castShadow = true;
    group.add(wheel);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(...pos);
    group.add(rim);
  });

  const headlightMat = mat(0xfff8d0, { emissive: 0xfff2a0, emissiveIntensity: 0.6 });
  [[0.72, 0.5, -2.18], [-0.72, 0.5, -2.18]].forEach(pos => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(...pos);
    group.add(hl);
  });

  const taillightMat = mat(0xb32020, { emissive: 0x8a1414, emissiveIntensity: 0.4 });
  [[0.75, 0.55, 2.18], [-0.75, 0.55, 2.18]].forEach(pos => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), taillightMat);
    tl.position.set(...pos);
    group.add(tl);
  });
}

// ---------------------------------------------------------------------------
// Celeiro
// ---------------------------------------------------------------------------

export function createBarn(scene) {
  const group = new THREE.Group();
  const wallMat = texMat(textures.wood, { color: palette.wallBarnRed, roughness: 0.8 });
  const trimMat = mat(palette.trimWhite, { roughness: 0.6 });
  const roofMat = texMat(textures.roof, { roughness: 0.6, color: palette.roofSlate });
  const darkWoodMat = mat(palette.woodDark, { roughness: 0.85 });

  const width = 7;
  const depth = 6;
  const wallHeight = 4.2;

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), wallMat);
  base.position.y = wallHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const roofOverhang = 0.6;
  const roofRun = width / 2 + roofOverhang;
  const roofRise = 2.6;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-roofRun, 0);
  roofShape.lineTo(0, roofRise);
  roofShape.lineTo(roofRun, 0);
  roofShape.lineTo(-roofRun, 0);
  const roofDepth = depth + roofOverhang * 2;
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: roofDepth, bevelEnabled: false });
  roofGeo.translate(0, 0, -roofDepth / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = wallHeight;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-width / 2, 0);
  gableShape.lineTo(0, roofRise);
  gableShape.lineTo(width / 2, 0);
  gableShape.lineTo(-width / 2, 0);
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  [depth / 2 - 0.02, -depth / 2 + 0.02].forEach(gz => {
    const gable = new THREE.Mesh(gableGeo, wallMat);
    gable.position.set(0, wallHeight, gz);
    if (gz < 0) gable.rotation.y = Math.PI;
    gable.castShadow = true;
    group.add(gable);
  });

  // Ventilação em treliça X sobre o frontão, marca registrada de celeiros
  [1, -1].forEach(side => {
    const vent = new THREE.Group();
    const barGeo = new THREE.BoxGeometry(1.6, 0.09, 0.06);
    const bar1 = new THREE.Mesh(barGeo, darkWoodMat);
    bar1.rotation.z = Math.PI / 4;
    vent.add(bar1);
    const bar2 = new THREE.Mesh(barGeo, darkWoodMat);
    bar2.rotation.z = -Math.PI / 4;
    vent.add(bar2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 16), darkWoodMat);
    vent.add(ring);
    vent.position.set(0, wallHeight + 1.0, side * (depth / 2 - 0.02) + side * 0.01);
    if (side < 0) vent.rotation.y = Math.PI;
    group.add(vent);
  });

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.1, 0.16), trimMat);
  doorFrame.position.set(0, 1.55, depth / 2 + 0.02);
  doorFrame.castShadow = true;
  group.add(doorFrame);

  const doorPanelMat = texMat(textures.wood, { color: 0x8a5a3a, roughness: 0.8 });
  [-1, 1].forEach(side => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.9, 0.1), doorPanelMat);
    leaf.position.set(side * 0.6, 1.5, depth / 2 + 0.09);
    leaf.castShadow = true;
    group.add(leaf);

    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.03), darkWoodMat);
    brace.position.set(side * 0.6, 1.5, depth / 2 + 0.15);
    brace.rotation.z = side * 0.55;
    group.add(brace);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.05), mat(0x2a2a2a, { roughness: 0.5, metalness: 0.4 }));
    handle.position.set(side * 0.15, 1.3, depth / 2 + 0.16);
    group.add(handle);
  });

  const loftFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.1), trimMat);
  loftFrame.position.set(0, 3.4, depth / 2 + 0.02);
  group.add(loftFrame);
  const loft = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.08), doorPanelMat);
  loft.position.set(0, 3.4, depth / 2 + 0.07);
  group.add(loft);

  group.position.set(14.5, 0, -9.0);
  group.rotation.y = -0.3;
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 4.6);
  return group;
}

// ---------------------------------------------------------------------------
// Silo
// ---------------------------------------------------------------------------

export function createSilo(scene) {
  const group = new THREE.Group();
  const metalMat = texMat(textures.stone, { color: palette.metalLight, roughness: 0.5, metalness: 0.4 });
  const trimMat = mat(0x8a2c22, { roughness: 0.45, metalness: 0.5 });
  const roofMat = mat(0x8a2c22, { roughness: 0.5 });

  const baseRingGeo = new THREE.CylinderGeometry(1.48, 1.55, 0.35, 14);
  const baseRing = new THREE.Mesh(baseRingGeo, trimMat);
  baseRing.position.y = 0.18;
  baseRing.castShadow = true;
  baseRing.receiveShadow = true;
  group.add(baseRing);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5.4, 14), metalMat);
  body.position.y = 3.05;
  body.castShadow = true;
  group.add(body);

  [1.4, 2.6, 3.8, 5.0].forEach(y => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.43, 1.43, 0.08, 14), trimMat);
    band.position.y = y;
    group.add(band);
  });

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.4, 0.3, 14), trimMat);
  collar.position.y = 5.85;
  collar.castShadow = true;
  group.add(collar);

  const top = new THREE.Mesh(new THREE.ConeGeometry(1.52, 1.5, 14), roofMat);
  top.position.y = 6.75;
  top.castShadow = true;
  group.add(top);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), trimMat);
  cap.position.y = 7.5;
  group.add(cap);

  const ladderMat = mat(0x333333, { roughness: 0.6, metalness: 0.4 });
  const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 5.4, 6);
  [-0.18, 0.18].forEach(x => {
    const rail = new THREE.Mesh(railGeo, ladderMat);
    rail.position.set(x, 3.05, 1.42);
    group.add(rail);
  });
  for (let i = 0; i < 10; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), ladderMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.6 + i * 0.5, 1.42);
    group.add(rung);
  }

  group.position.set(18.5, 0, -16.0);
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 1.55);
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
  const group = new THREE.Group();
  const shirtMat = mat(shirt, { roughness: 0.75 });
  const pantsMat = mat(pants, { roughness: 0.8 });
  const skinMat = mat(skin, { roughness: 0.65 });
  const bootMat = mat(0x4a3520, { roughness: 0.85 });

  const legGeo = new THREE.BoxGeometry(0.16, 0.5, 0.18);
  [-0.13, 0.13].forEach(x => {
    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.set(x, 0.25, 0);
    leg.castShadow = true;
    group.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.24), bootMat);
    boot.position.set(x, 0.05, 0.02);
    group.add(boot);
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.32), shirtMat);
  torso.position.y = 0.79;
  torso.castShadow = true;
  group.add(torso);

  const armGeo = new THREE.BoxGeometry(0.13, 0.42, 0.13);
  const handGeo = new THREE.SphereGeometry(0.075, 8, 8);
  [-0.3, 0.3].forEach(x => {
    const arm = new THREE.Mesh(armGeo, shirtMat);
    arm.position.set(x, 0.62, 0);
    arm.castShadow = true;
    group.add(arm);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(x, 0.39, 0);
    group.add(hand);
  });

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.2, 0);
  group.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
  headPivot.add(head);

  const eyeMat = mat(0x2b2118, { roughness: 0.4 });
  [-0.08, 0.08].forEach(x => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.03), eyeMat);
    eye.position.set(x, 0.03, 0.17);
    headPivot.add(eye);
  });

  if (accessory === 'hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 10), mat(0xd8a23a, { roughness: 0.7 }));
    brim.position.y = 0.22;
    headPivot.add(brim);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.22, 8), mat(0xd8a23a, { roughness: 0.7 }));
    cap.position.y = 0.34;
    headPivot.add(cap);
  } else if (accessory === 'scarf') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 6, 10), mat(0xb23a4a, { roughness: 0.8 }));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = -0.1;
    headPivot.add(scarf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.05), mat(0xb23a4a, { roughness: 0.8 }));
    tail.position.set(0.12, -0.32, 0.14);
    tail.rotation.z = 0.2;
    headPivot.add(tail);
  }

  group.userData.headPivot = headPivot;
  group.userData.bobPhase = Math.random() * Math.PI * 2;
  return group;
}

// Mercador (compra colheitas/produtos, entrega pedidos especiais) — fica perto
// do celeiro, com um cesto de vime ao lado para reforçar a leitura de "comprador".
export function createMerchantNpc(scene) {
  const npc = buildStandingNpc({ shirt: 0x3f7cbf, pants: 0x35507a, skin: 0xdba374, accessory: 'hat' });

  const basketMat = mat(0x9a6a3a, { roughness: 0.85 });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.28, 8, 1, true), basketMat);
  basket.position.set(0.45, 0.18, 0.1);
  npc.add(basket);
  const basketBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), basketMat);
  basketBase.position.set(0.45, 0.05, 0.1);
  npc.add(basketBase);

  npc.position.set(12.5, 0, -5.8);
  npc.rotation.y = Math.PI * 0.65;
  npc.userData.isNpc = true;
  npc.userData.npcId = 'merchant';
  scene.add(npc);
  registerObstacle(npc.position.x, npc.position.z, 0.4);
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
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-0.5, 0.12, z * 1.1);
    npc.add(wheel);
  });
  const sackMat = mat(0xc9b56a, { roughness: 0.9 });
  [[-0.42, 0.42, 0.05], [-0.58, 0.4, -0.05]].forEach(([x, y, z]) => {
    const sack = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), sackMat);
    sack.position.set(x, y, z);
    npc.add(sack);
  });

  npc.position.set(-2.4, 0, -3.4);
  npc.rotation.y = Math.PI * 0.15;
  npc.userData.isNpc = true;
  npc.userData.npcId = 'supplier';
  scene.add(npc);
  registerObstacle(npc.position.x, npc.position.z, 0.5);
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

  npc.position.set(8.6, 0, -3.6);
  npc.rotation.y = Math.PI * 0.25;
  npc.userData.isNpc = true;
  npc.userData.npcId = 'gov';
  scene.add(npc);
  registerObstacle(npc.position.x, npc.position.z, 0.3);
  return npc;
}

// ---------------------------------------------------------------------------
// Poço (upgrade: aumenta a capacidade máxima de água)
// ---------------------------------------------------------------------------

export function createWell(scene) {
  const group = new THREE.Group();
  const stoneMat = texMat(textures.stone, { roughness: 0.9 });
  const woodMat = texMat(textures.wood, { color: palette.woodMid, roughness: 0.85 });
  const roofMat = texMat(textures.roof, { color: palette.roofSlate, roughness: 0.6 });
  const bucketMat = mat(0x5a4530, { roughness: 0.8 });

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.6, 12), stoneMat);
  ring.position.y = 0.3;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 6, 12), stoneMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.62;
  group.add(rim);

  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6);
  [-0.65, 0.65].forEach(x => {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(x, 1.0, 0);
    post.castShadow = true;
    group.add(post);
  });

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), woodMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, 1.72, 0);
  group.add(beam);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.5, 8), roofMat);
  roof.position.y = 2.05;
  roof.castShadow = true;
  group.add(roof);

  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5), mat(0xc9b56a));
  rope.position.set(0, 1.3, 0);
  group.add(rope);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.16, 8), bucketMat);
  bucket.position.set(0, 0.9, 0);
  bucket.castShadow = true;
  group.add(bucket);

  group.position.set(-6.5, 0, -3.2);
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.9);
  return group;
}

// Poço artesiano (upgrade autorizado pelo governo): base mais larga e alta,
// com torre de perfuração metálica no lugar do telhadinho de madeira do poço comum.
export function createArtesianWell(scene) {
  const group = new THREE.Group();
  const stoneMat = texMat(textures.stone, { roughness: 0.9 });
  const metalMat = mat(palette.metalMid, { roughness: 0.4, metalness: 0.6 });
  const metalDarkMat = mat(palette.metalDark, { roughness: 0.5, metalness: 0.5 });
  const pipeMat = mat(0x3a5a7a, { roughness: 0.5, metalness: 0.4 });

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.7, 14), stoneMat);
  ring.position.y = 0.35;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.09, 6, 14), stoneMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.72;
  group.add(rim);

  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10), pipeMat);
  pipe.position.y = 1.5;
  pipe.castShadow = true;
  group.add(pipe);
  const pipeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10), metalDarkMat);
  pipeCap.position.y = 2.32;
  group.add(pipeCap);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6);
  const legSpecs = [
    [0.75, 0, 0], [-0.75, 0, 0], [0, 0, 0.75], [0, 0, -0.75]
  ];
  legSpecs.forEach(([x, , z]) => {
    const leg = new THREE.Mesh(legGeo, metalMat);
    leg.position.set(x * 0.55, 1.9, z * 0.55);
    const lean = Math.atan2(x || z, 2.6);
    if (x !== 0) leg.rotation.z = -lean * (x > 0 ? 1 : -1);
    if (z !== 0) leg.rotation.x = lean * (z > 0 ? 1 : -1);
    leg.castShadow = true;
    group.add(leg);
  });

  [2.4, 3.0, 3.6].forEach(y => {
    const brace = new THREE.Mesh(new THREE.TorusGeometry(0.55 - (y - 2.4) * 0.35, 0.03, 5, 10), metalDarkMat);
    brace.position.y = y;
    brace.rotation.x = Math.PI / 2;
    group.add(brace);
  });

  const towerTop = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), metalDarkMat);
  towerTop.position.y = 4.0;
  towerTop.castShadow = true;
  group.add(towerTop);

  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 12), metalDarkMat);
  valve.position.set(0, 1.0, 0.95);
  group.add(valve);

  group.position.set(-10.6, 0, -1.6);
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 1.0);
  return group;
}

// ---------------------------------------------------------------------------
// Sino de alarme (clicável): fica perto da casa; ao tocar, chama os NPCs
// para correrem para dentro de casa antes que o perigo noturno os alcance.
// ---------------------------------------------------------------------------

export function createAlarmBell(scene) {
  const group = new THREE.Group();
  const woodMat = texMat(textures.wood, { color: palette.woodDark, roughness: 0.85 });
  const metalMat = mat(palette.metalMid, { roughness: 0.4, metalness: 0.6 });
  const bellMat = mat(0xc9a13a, { roughness: 0.35, metalness: 0.7 });

  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8);
  [-0.55, 0.55].forEach(x => {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(x, 1.1, 0);
    post.castShadow = true;
    group.add(post);
  });

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), woodMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, 2.2, 0);
  group.add(beam);

  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), metalMat);
  yoke.position.set(0, 2.05, 0);
  group.add(yoke);

  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 12, 1, true), bellMat);
  bell.position.set(0, 1.7, 0);
  bell.castShadow = true;
  group.add(bell);

  const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 12), bellMat);
  bellRim.rotation.x = Math.PI / 2;
  bellRim.position.set(0, 1.46, 0);
  group.add(bellRim);

  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), metalMat);
  clapper.position.set(0, 1.35, 0);
  group.add(clapper);

  const pullRope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), mat(0xc9b56a));
  pullRope.position.set(0, 0.95, 0.28);
  pullRope.rotation.x = 0.15;
  group.add(pullRope);

  group.userData.isAlarmBell = true;
  group.userData.bell = bell;
  group.position.set(9.2, 0, -5.4);
  scene.add(group);
  registerObstacle(group.position.x, group.position.z, 0.6);
  return group;
}
