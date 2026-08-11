import * as THREE from 'three';
import {
  makeGrassTexture, makeDirtTexture, makeTilledDirtTexture,
  makeWoodTexture, makeRoofTexture, makeStoneTexture
} from './textures.js';

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
  scene.background = new THREE.Color(0x8fd0ef);
  scene.fog = new THREE.FogExp2(0x8fd0ef, 0.010);
  return scene;
}

export function createSky(scene) {
  // Hemisfério de céu com gradiente vertical via shader simples,
  // muito mais barato e agradável que uma skybox texturizada.
  const uniforms = {
    topColor: { value: new THREE.Color(0x3a8fd6) },
    bottomColor: { value: new THREE.Color(0xcfeeff) },
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
  const mat = new THREE.MeshBasicMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });

  for (let i = 0; i < 14; i++) {
    const scale = 6 + Math.random() * 8;
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(scale * 2, scale), mat);
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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xbfd9ff, 0x4a6b2f, 0.5);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff2d6, 2.4);
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
  scene.add(sunLight);

  const moonLight = new THREE.DirectionalLight(0x7ea6ff, 0);
  moonLight.position.set(-30, 40, -20);
  scene.add(moonLight);

  return { ambientLight, hemiLight, sunLight, moonLight };
}

export function createGround(scene) {
  const size = 100;
  const segs = 60;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const distCenter = Math.sqrt(x * x + y * y);
    let h = 0;
    if (distCenter > 30) {
      h += (distCenter - 30) * 0.35 * (0.5 + Math.random() * 0.5);
    }
    h += (Math.sin(x * 0.15) * Math.cos(y * 0.15)) * 0.15;
    pos.setZ(i, h);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: textures.grass,
    roughness: 0.95,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
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
    const capGeo = new THREE.CircleGeometry(width / 2, 14);
    const capMat = new THREE.MeshStandardMaterial({ map: textures.dirt, roughness: 0.95 });

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
      const segMat = new THREE.MeshStandardMaterial({ map: segTex, roughness: 0.95 });

      const geo = new THREE.PlaneGeometry(length + width * 0.5, width, 1, 1);
      const mesh = new THREE.Mesh(geo, segMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -angle;
      mesh.position.set((ax + bx) / 2, 0.03, (az + bz) / 2);
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // tampa circular em cada vértice (extremidades e curvas) para fechar as junções
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

// Constrói um laço de cerca (fechado ou aberto) a partir de uma lista ordenada de
// pontos [x,z]: um poste em cada ponto, e entre cada par de pontos consecutivos,
// travessas e fios ESTICADOS com o comprimento exato do vão — assim toda peça
// horizontal encosta fisicamente no poste seguinte, em vez de segmentos soltos
// de tamanho fixo que deixam gaps visuais. Reaproveitada por createFences e
// createCorral. `closed: true` fecha o último ponto de volta ao primeiro.
function buildFenceLoop(group, points, { closed = true, postMat, wireMat } = {}) {
  const postGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.9, 6);
  const postCapGeo = new THREE.ConeGeometry(0.1, 0.1, 6);

  function addPost(x, z) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.45, z);
    post.castShadow = true;
    group.add(post);

    const cap = new THREE.Mesh(postCapGeo, postMat);
    cap.position.set(x, 0.95, z);
    group.add(cap);
  }

  // travessa horizontal esticada entre dois postes (comprimento real do vão)
  function addRail(x1, z1, x2, z2, y) {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.07), postMat);
    rail.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    rail.rotation.y = -angle;
    rail.castShadow = true;
    group.add(rail);
  }

  // fios de arame esticados entre dois postes, em 3 alturas (estilo cerca rural)
  function addWires(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const wireGeo = new THREE.CylinderGeometry(0.012, 0.012, length, 4);
    [0.75, 0.5, 0.18].forEach(h => {
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
  const postMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.85 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x8d8d82, roughness: 0.55, metalness: 0.55 });

  const [minX, maxX] = boundsX;
  const [minZ, maxZ] = boundsZ;
  const step = 1.0;

  // Um único laço fechado percorrendo todo o perímetro (em vez de 4 lados
  // independentes), para que os postes de canto pertençam a apenas um trecho
  // contínuo e as travessas/fios sempre liguem um poste ao próximo vizinho real.
  const perimeter = [];
  for (let x = minX; x < maxX; x += step) perimeter.push([x, minZ]);
  for (let z = minZ; z < maxZ; z += step) perimeter.push([maxX, z]);
  for (let x = maxX; x > minX; x -= step) perimeter.push([x, maxZ]);
  for (let z = maxZ; z > minZ; z -= step) perimeter.push([minX, z]);

  buildFenceLoop(group, perimeter, { closed: true, postMat, wireMat });

  scene.add(group);
  return group;
}

// Cerca menor e fechada para o curral de animais, com um vão sem fios/travessas
// (o "portão") centrado no lado indicado por `gateSide` ('north'|'south'|'east'|'west').
// Retorna { group, gate: {x, z, width}, bounds } para o main.js posicionar animais/porteira.
export function createCorral(scene, centerX, centerZ, width, depth, gateSide = 'south') {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0x9a7048, roughness: 0.85 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x8d8d82, roughness: 0.55, metalness: 0.55 });

  const minX = centerX - width / 2, maxX = centerX + width / 2;
  const minZ = centerZ - depth / 2, maxZ = centerZ + depth / 2;
  const step = 1.0;
  const gateWidth = Math.min(1.8, gateSide === 'north' || gateSide === 'south' ? width - 0.5 : depth - 0.5);

  // Perímetro fechado percorrido em um único sentido, sem duplicar cantos
  // (cada lado exclui seu ponto final, que é o ponto inicial do lado seguinte)
  // — mesmo esquema de createFences.
  const perimeter = [];
  for (let x = minX; x < maxX; x += step) perimeter.push([x, minZ]);
  for (let z = minZ; z < maxZ; z += step) perimeter.push([maxX, z]);
  for (let x = maxX; x > minX; x -= step) perimeter.push([x, maxZ]);
  for (let z = maxZ; z > minZ; z -= step) perimeter.push([minX, z]);

  const gateX = gateSide === 'east' ? maxX : gateSide === 'west' ? minX : centerX;
  const gateZ = gateSide === 'north' ? minZ : gateSide === 'south' ? maxZ : centerZ;

  // distância de cada ponto do perímetro ao centro do portão, ao longo do lado do portão
  function distAlongGateSide([x, z]) {
    if (gateSide === 'north' && Math.abs(z - minZ) < 1e-6) return Math.abs(x - gateX);
    if (gateSide === 'south' && Math.abs(z - maxZ) < 1e-6) return Math.abs(x - gateX);
    if (gateSide === 'east' && Math.abs(x - maxX) < 1e-6) return Math.abs(z - gateZ);
    if (gateSide === 'west' && Math.abs(x - minX) < 1e-6) return Math.abs(z - gateZ);
    return Infinity;
  }

  // remove os pontos que caem dentro do vão do portão, depois "corta e desenrola"
  // o laço no meio desse vão para virar uma polilinha ABERTA que começa e termina
  // nos dois postes que ladeiam a porteira. O ponto de corte é o mais PRÓXIMO do
  // centro do portão (em vez de exigir coincidência exata), já que o centro nem
  // sempre cai sobre um poste da grade de `step`.
  let gateVertexIdx = 0;
  let bestDist = Infinity;
  perimeter.forEach((p, i) => {
    const d = distAlongGateSide(p);
    if (d < bestDist) { bestDist = d; gateVertexIdx = i; }
  });
  const rotated = [...perimeter.slice(gateVertexIdx), ...perimeter.slice(0, gateVertexIdx)];
  const openPerimeter = rotated.filter(p => distAlongGateSide(p) >= gateWidth / 2 - 1e-6);

  buildFenceLoop(group, openPerimeter, { closed: false, postMat, wireMat });

  scene.add(group);
  return { group, gate: { x: gateX, z: gateZ, width: gateWidth, side: gateSide }, bounds: { minX, maxX, minZ, maxZ } };
}

// Tronco nu com galhos secos finos, usado nas árvores "mortas" da mata —
// reaproveita o mesmo tronco/raiz das árvores vivas, mas sem canopyClusters.
function buildDeadTree(trunkMat, branchMat) {
  const tree = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.38, 2.8, 7);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.4;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const rootGeo = new THREE.ConeGeometry(0.5, 0.5, 7);
  const root = new THREE.Mesh(rootGeo, trunkMat);
  root.position.y = 0.22;
  root.castShadow = true;
  tree.add(root);

  const branchSpecs = [
    { y: 2.5, len: 1.1, tilt: 0.9, rotY: 0.4 },
    { y: 2.9, len: 0.9, tilt: 1.1, rotY: 2.6 },
    { y: 2.2, len: 0.8, tilt: 1.3, rotY: 4.4 },
    { y: 3.3, len: 0.6, tilt: 0.7, rotY: 5.5 }
  ];
  branchSpecs.forEach(b => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, b.len, 5), branchMat);
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
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1a0500, emissive: 0xffcf3a, emissiveIntensity: 1.4, roughness: 0.4
  });
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
  const trunkMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0x8a6a4a, roughness: 0.9 });
  const deadTrunkMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0x4a4038, roughness: 0.95 });
  const leavesMats = [0x2e7d32, 0x388e3c, 0x2f6e33].map(
    c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true })
  );

  const positions = [
    [-24, -20], [24, -20], [-26, 4], [26, 8], [-22, 24], [24, 22], [0, 28],
    [-30, -8], [30, -4], [12, 30], [-12, 30], [32, 20], [-32, 16]
  ];

  // linha de olhos brilhantes que só aparecem à noite — grupo próprio para o
  // main.js alternar visibilidade junto do ciclo dia/noite, sem tocar nas árvores
  const eyesGroup = new THREE.Group();

  positions.forEach((pos, idx) => {
    // ~1 em cada 6 árvores nasce morta — dá o toque de floresta assombrada sem
    // dominar a paisagem, que continua predominantemente viva/verde
    const isDead = idx % 6 === 1;
    const tree = isDead ? buildDeadTree(deadTrunkMat, deadTrunkMat) : new THREE.Group();
    const scale = 0.85 + Math.random() * 0.5;

    if (!isDead) {
      // Tronco com leve afunilamento e uma pequena curvatura na base (raiz aparente)
      const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 2.6, 7);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.3;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      const rootGeo = new THREE.ConeGeometry(0.55, 0.5, 7);
      const root = new THREE.Mesh(rootGeo, trunkMat);
      root.position.y = 0.22;
      root.castShadow = true;
      tree.add(root);

      // Copa esculpida como pilha de icosaedros irregulares sobrepostos,
      // formando uma silhueta arredondada e orgânica (não empilhamento de cones)
      const leafMat = leavesMats[idx % leavesMats.length];
      const canopyClusters = [
        { y: 3.0, r: 1.35, x: 0, z: 0 },
        { y: 3.65, r: 1.15, x: 0.55, z: 0.2 },
        { y: 3.55, r: 1.05, x: -0.5, z: -0.25 },
        { y: 4.35, r: 1.0, x: 0.1, z: -0.35 },
        { y: 4.5, r: 0.85, x: -0.3, z: 0.4 }
      ];
      canopyClusters.forEach(c => {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(c.r, 1), leafMat);
        leaf.position.set(c.x, c.y, c.z);
        leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        leaf.castShadow = true;
        tree.add(leaf);
      });
    }

    tree.position.set(pos[0], 0, pos[1]);
    tree.scale.setScalar(scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);

    // um par de olhos espreitando perto de ~1 em cada 3 árvores, virado para o
    // centro da fazenda (de onde o jogador observa)
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

export function createWindmill(scene) {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0x8a6a4a, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.roof, color: 0x777777, roughness: 0.55 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.55, flatShading: true });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.7 });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 6.4, 8), woodMat);
  tower.position.y = 3.2;
  tower.castShadow = true;
  group.add(tower);

  // faixas de reforço horizontais para quebrar a monotonia do cilindro liso
  [1.6, 3.2, 4.8].forEach(y => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5 + (6.4 - y) * 0.02, 0.05, 6, 8), hubMat);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  });

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.0, 8), roofMat);
  cap.position.y = 6.9;
  cap.castShadow = true;
  group.add(cap);

  const hub = new THREE.Group();
  hub.position.set(0, 6.4, 0.68);

  const hubCore = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 8), hubMat);
  hubCore.rotation.x = Math.PI / 2;
  hub.add(hubCore);

  // pá afunilada: base larga junto ao cubo, ponta estreita — feita com Shape extrudado
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.28, 0);
  bladeShape.lineTo(0.28, 0);
  bladeShape.lineTo(0.1, 2.5);
  bladeShape.lineTo(-0.1, 2.5);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.08, bevelEnabled: false });
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

  group.position.set(12, 0, -2.5);
  scene.add(group);
  return { group, hub };
}

export function createHouse(scene, level) {
  const group = new THREE.Group();
  group.position.set(0, 0, -9.5);
  scene.add(group);
  buildHouse(group, level);
  return group;
}

export function buildHouse(group, level) {
  while (group.children.length) group.remove(group.children[0]);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfaf3df, roughness: 0.75 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.roof, roughness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8f5, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

  const width = level === 1 ? 6 : 9;
  const depth = level === 1 ? 5 : 7;
  const height = level === 1 ? 3.5 : 4.6;

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Telhado de duas águas real (perfil triangular extrudado ao longo da profundidade),
  // mais crível que uma pirâmide de 4 faces. O shape fica no plano XY (X=largura, Y=altura)
  // e o extrude corre em +Z, que já é o eixo de profundidade da casa — sem rotações extras.
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

  // Frontões triangulares (gable ends) fechando as pontas do telhado
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
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stone, roughness: 0.9 });
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
    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.87, 1.07, 0.1), new THREE.MeshStandardMaterial({ color: 0x2c3a2e, roughness: 0.9 }));
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

    // floreira de madeira com flores baixas sob a janela
    const boxMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.85 });
    const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.26), boxMat);
    flowerBox.position.set(wx, height * 0.5 - 0.78, depth / 2 + 0.22);
    flowerBox.castShadow = true;
    group.add(flowerBox);
    const flowerColors = [0xe0546b, 0xf2c94c, 0xffffff];
    for (let i = 0; i < 5; i++) {
      const fx = wx - 0.36 + i * 0.18;
      const stem = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x4a8f3a, flatShading: true }));
      stem.position.set(fx, height * 0.5 - 0.6, depth / 2 + 0.24);
      group.add(stem);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], flatShading: true }));
      bloom.position.set(fx, height * 0.5 - 0.52, depth / 2 + 0.24);
      group.add(bloom);
    }
  });

  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.02, 0.08), doorFrameMat);
  doorFrame.position.set(width / 2 - 1.1, 1.01, depth / 2 + 0.02);
  group.add(doorFrame);

  const doorMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0x8a5a3a, roughness: 0.8 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.1), doorMat);
  door.position.set(width / 2 - 1.1, 0.95, depth / 2 + 0.07);
  group.add(door);

  const knobMat = new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.35, metalness: 0.6 });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), knobMat);
  knob.position.set(width / 2 - 1.42, 0.92, depth / 2 + 0.14);
  group.add(knob);

  const porchDepth = 2.4;
  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(width + 1.2, 0.2, porchDepth), woodMat);
  porchFloor.position.set(0, 0.1, depth / 2 + porchDepth / 2);
  porchFloor.castShadow = true;
  porchFloor.receiveShadow = true;
  group.add(porchFloor);

  // Telhado da varanda com leve caimento (perfil em cunha), não mais uma caixa plana
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
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, height * 0.68, 8), woodMat);
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

  // Corrimão com trilhos superior/inferior e balaustres verticais entre os pilares,
  // em vez de uma única tábua lisa — leitura mais artesanal, estilo fazenda real.
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

  // Vaso extra e banco lateral, dando à varanda uma sensação mais vivida/aconchegante
  const potMat = new THREE.MeshStandardMaterial({ color: 0x9a5a3a, roughness: 0.85 });
  const potX = -width / 2 - 0.4;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 8), potMat);
  pot.position.set(potX, 0.26, depth / 2 + 0.4);
  pot.castShadow = true;
  group.add(pot);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x4a8f3a, flatShading: true, roughness: 0.85 });
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), bushMat);
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

  // Lampião pendurado no pilar mais próximo da porta: único ponto de luz "seguro"
  // perto da casa à noite — aceso no escuro, apagado de dia (ligado pelo main.js
  // via group.userData.lantern.light, seguindo o mesmo padrão do sleepIndicator).
  const lanternGroup = new THREE.Group();
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.5 });
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
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 6), lanternGlassMat);
  glass.position.set(0.3, -0.12, 0);
  lanternGroup.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 6), lanternMat);
  cap.position.set(0.3, -0.02, 0);
  lanternGroup.add(cap);
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

  const npcShirtMat = new THREE.MeshStandardMaterial({ color: 0x3f7cbf, flatShading: true, roughness: 0.75 });
  const npcOverallMat = new THREE.MeshStandardMaterial({ color: 0x35507a, flatShading: true, roughness: 0.8 });
  const npcSkinMat = new THREE.MeshStandardMaterial({ color: 0xf3c6a0, flatShading: true, roughness: 0.65 });
  const npcHatMat = new THREE.MeshStandardMaterial({ color: 0xe0b03a, flatShading: true, roughness: 0.7 });
  const npcHatBandMat = new THREE.MeshStandardMaterial({ color: 0xb8842a, flatShading: true, roughness: 0.7 });
  const npcBootMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, flatShading: true, roughness: 0.85 });
  const npcButtonMat = new THREE.MeshStandardMaterial({ color: 0xdccb8a, flatShading: true, roughness: 0.5 });

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

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), npcSkinMat);
  head.position.y = 0.84;
  npcPivot.add(head);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.08), npcSkinMat);
  nose.position.set(0, 0.82, 0.2);
  npcPivot.add(nose);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2b2118, flatShading: true, roughness: 0.4 });
  [-0.09, 0.09].forEach(x => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), eyeMat);
    eye.position.set(x, 0.88, 0.19);
    npcPivot.add(eye);
  });

  const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3d, flatShading: true, roughness: 0.7 });
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), mustacheMat);
  mustache.position.set(0, 0.775, 0.195);
  npcPivot.add(mustache);

  [-0.19, 0.19].forEach(x => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), npcSkinMat);
    ear.position.set(x, 0.84, 0);
    npcPivot.add(ear);
  });

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 10), npcHatMat);
  hatBrim.position.y = 0.99;
  npcPivot.add(hatBrim);

  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.26, 8), npcHatMat);
  hat.position.y = 1.14;
  npcPivot.add(hat);

  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 8), npcHatBandMat);
  hatBand.position.y = 1.03;
  npcPivot.add(hatBand);

  const handGeo = new THREE.SphereGeometry(0.075, 8, 8);
  const shoulderGeo = new THREE.SphereGeometry(0.1, 8, 8);

  function buildArm(x) {
    // ombro arredondado preenche a junção torso→braço, evitando o corte abrupto de um cilindro fino saindo direto da caixa do torso
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

  const bootGeo = new THREE.BoxGeometry(0.16, 0.12, 0.26);
  [-0.15, 0.15].forEach(x => {
    const boot = new THREE.Mesh(bootGeo, npcBootMat);
    boot.position.set(x, 0.06, 0.28);
    npcPivot.add(boot);
  });

  chairGroup.userData.pivot = npcPivot;
  return chairGroup;
}

export function createCar(scene) {
  const group = new THREE.Group();
  group.position.set(-4.2, 0, -6.3);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  return group;
}

export function buildCar(group, visible) {
  while (group.children.length) group.remove(group.children[0]);
  if (!visible) return;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.35, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8f5, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.35, metalness: 0.6 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.4, metalness: 0.5 });

  // Corpo principal com o capô e a traseira mais baixos que a cintura da cabine,
  // construído como perfil lateral extrudado — dá a silhueta de carro real (não um bloco).
  // O perfil é desenhado no plano XY (X = comprimento, Y = altura) e extrudado em Z (largura);
  // rotateY(90°) então mapeia X_perfil -> -Z_mundo, então perfil em +X (capô) termina em -Z do mundo.
  const profile = new THREE.Shape();
  profile.moveTo(-2.2, 0.35);     // traseira, altura do para-choque
  profile.lineTo(-2.2, 0.62);     // traseira sobe até a cintura
  profile.lineTo(-1.15, 1.05);    // vidro traseiro inclinado até o teto
  profile.lineTo(0.75, 1.05);     // teto
  profile.lineTo(1.55, 0.62);     // parabrisa inclinado até o capô
  profile.lineTo(2.2, 0.5);       // capô
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

  // Cabine de vidro seguindo o mesmo ângulo do perfil (parabrisa e traseira inclinados, não um cubo reto)
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

  // Capô do perfil (+X) cai em Z=-2.2 do mundo depois da rotação; para-choque frontal acompanha.
  const bumperGeo = new THREE.BoxGeometry(2.34, 0.28, 0.22);
  const bumperF = new THREE.Mesh(bumperGeo, trimMat);
  bumperF.position.set(0, 0.42, -2.15);
  bumperF.castShadow = true;
  group.add(bumperF);
  const bumperB = new THREE.Mesh(bumperGeo, trimMat);
  bumperB.position.set(0, 0.42, 2.15);
  bumperB.castShadow = true;
  group.add(bumperB);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
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

  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff8d0, emissive: 0xfff2a0, emissiveIntensity: 0.6 });
  [[0.72, 0.5, -2.18], [-0.72, 0.5, -2.18]].forEach(pos => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(...pos);
    group.add(hl);
  });

  const taillightMat = new THREE.MeshStandardMaterial({ color: 0xb32020, emissive: 0x8a1414, emissiveIntensity: 0.4 });
  [[0.75, 0.55, 2.18], [-0.75, 0.55, 2.18]].forEach(pos => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), taillightMat);
    tl.position.set(...pos);
    group.add(tl);
  });
}

export function createBarn(scene) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0xb23b2e, roughness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.roof, roughness: 0.6, color: 0x555555 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.85 });

  const width = 7;
  const depth = 6;
  const wallHeight = 4.2;

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), wallMat);
  base.position.y = wallHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Telhado de duas águas (mesmo perfil usado na casa) em vez da pirâmide de 4 faces original
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
  const ventMat = darkWoodMat;
  [1, -1].forEach(side => {
    const vent = new THREE.Group();
    const barGeo = new THREE.BoxGeometry(1.6, 0.09, 0.06);
    const bar1 = new THREE.Mesh(barGeo, ventMat);
    bar1.rotation.z = Math.PI / 4;
    vent.add(bar1);
    const bar2 = new THREE.Mesh(barGeo, ventMat);
    bar2.rotation.z = -Math.PI / 4;
    vent.add(bar2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 16), ventMat);
    vent.add(ring);
    vent.position.set(0, wallHeight + 1.0, side * (depth / 2 - 0.02) + side * 0.01);
    if (side < 0) vent.rotation.y = Math.PI;
    group.add(vent);
  });

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.1, 0.16), trimMat);
  doorFrame.position.set(0, 1.55, depth / 2 + 0.02);
  doorFrame.castShadow = true;
  group.add(doorFrame);

  // Portas de celeiro em duas folhas com painéis diagonais, mais convincente que uma prancha lisa
  const doorPanelMat = new THREE.MeshStandardMaterial({ map: textures.wood, color: 0x8a5a3a, roughness: 0.8 });
  [-1, 1].forEach(side => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.9, 0.1), doorPanelMat);
    leaf.position.set(side * 0.6, 1.5, depth / 2 + 0.09);
    leaf.castShadow = true;
    group.add(leaf);

    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.03), darkWoodMat);
    brace.position.set(side * 0.6, 1.5, depth / 2 + 0.15);
    brace.rotation.z = side * 0.55;
    group.add(brace);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.4 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.05), handleMat);
    handle.position.set(side * 0.15, 1.3, depth / 2 + 0.16);
    group.add(handle);
  });

  const loftFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.1), trimMat);
  loftFrame.position.set(0, 3.4, depth / 2 + 0.02);
  group.add(loftFrame);
  const loft = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.08), doorPanelMat);
  loft.position.set(0, 3.4, depth / 2 + 0.07);
  group.add(loft);

  group.position.set(12, 0, -7.2);
  group.rotation.y = -0.3;
  scene.add(group);
  return group;
}

export function createSilo(scene) {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ map: textures.stone, color: 0xc8ccd0, roughness: 0.5, metalness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x8a2c22, roughness: 0.45, metalness: 0.5 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a2c22, roughness: 0.5 });

  const baseRingGeo = new THREE.CylinderGeometry(1.48, 1.55, 0.35, 16);
  const baseRing = new THREE.Mesh(baseRingGeo, trimMat);
  baseRing.position.y = 0.18;
  baseRing.castShadow = true;
  baseRing.receiveShadow = true;
  group.add(baseRing);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5.4, 16), metalMat);
  body.position.y = 3.05;
  body.castShadow = true;
  group.add(body);

  // Aneis de reforço horizontais, característicos de silos metálicos, quebram a monotonia do tubo liso
  [1.4, 2.6, 3.8, 5.0].forEach(y => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.43, 1.43, 0.08, 16), trimMat);
    band.position.y = y;
    group.add(band);
  });

  // Aro de transição corpo→topo, evita a interseção abrupta cilindro/cone
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.4, 0.3, 16), trimMat);
  collar.position.y = 5.85;
  collar.castShadow = true;
  group.add(collar);

  const top = new THREE.Mesh(new THREE.ConeGeometry(1.52, 1.5, 16), roofMat);
  top.position.y = 6.75;
  top.castShadow = true;
  group.add(top);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), trimMat);
  cap.position.y = 7.5;
  group.add(cap);

  const ladderMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.4 });
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

  group.position.set(12.5, 0, -11.3);
  scene.add(group);
  return group;
}
