import * as THREE from 'three';

let nextAnimalId = 1;

const chickenPalettes = [
  { body: 0xf5f0e0, wing: 0xe8dfc0 },
  { body: 0xa85a3a, wing: 0x8a4526 },
  { body: 0x2b2822, wing: 0xf5f0e0 }
];

function buildChicken() {
  const group = new THREE.Group();
  const palette = chickenPalettes[Math.floor(Math.random() * chickenPalettes.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color: palette.body, flatShading: true, roughness: 0.8 });
  const wingMat = new THREE.MeshStandardMaterial({ color: palette.wing, flatShading: true, roughness: 0.8 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xe8a83a, flatShading: true, roughness: 0.6 });
  const combMat = new THREE.MeshStandardMaterial({ color: 0xc9403a, flatShading: true, roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xd8a23a, roughness: 0.7 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 0.4 });

  const jitter = () => (Math.random() - 0.5) * 0.06;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bodyMat);
  body.scale.set(1.15, 0.95, 1.3);
  body.position.y = 0.22;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bodyMat);
  head.scale.set(1, 0.95, 1.05);
  head.position.set(0, 0.36, 0.17);
  head.rotation.y = jitter();
  head.castShadow = true;
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.35, 0.27);
  group.add(beak);

  [-0.06, 0.06].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat);
    eye.position.set(x, 0.39, 0.23);
    group.add(eye);
  });

  // Crista serrilhada: fileira de pequenos cones em vez de um único cone
  [-0.03, 0, 0.035].forEach((z, i) => {
    const comb = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05 + (i === 1 ? 0.025 : 0), 5), combMat);
    comb.position.set(0, 0.445 + (i === 1 ? 0.012 : 0), 0.17 + z);
    group.add(comb);
  });

  // Asas: pares de esferas achatadas nas laterais do corpo
  [-0.15, 0.15].forEach(x => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), wingMat);
    wing.scale.set(0.6, 1.0, 1.35);
    wing.position.set(x, 0.22, -0.02);
    wing.rotation.z = x > 0 ? -0.15 : 0.15;
    wing.castShadow = true;
    group.add(wing);
  });

  // Cauda em leque: 3 penas finas em ângulos diferentes em vez de 1 cone único
  [-0.28, 0, 0.28].forEach(angle => {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 4), bodyMat);
    tail.rotation.x = Math.PI * 0.65;
    tail.rotation.z = angle;
    tail.position.set(Math.sin(angle) * 0.03, 0.32 + Math.abs(angle) * 0.03, -0.24);
    group.add(tail);
  });

  [-0.05, 0.05].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 5), legMat);
    leg.position.set(x, 0.07, 0.02);
    group.add(leg);

    // Pés: pequenos dedos em leque na base da perna
    [-0.35, 0, 0.35].forEach(toeAngle => {
      const toe = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 4), legMat);
      toe.rotation.x = Math.PI / 2;
      toe.rotation.z = toeAngle;
      toe.position.set(x + Math.sin(toeAngle) * 0.02, 0.005, 0.02 + Math.cos(toeAngle) * 0.02);
      group.add(toe);
    });
  });

  group.userData.legHeight = 0.22;
  return group;
}

const cowPalettes = [
  { hide: 0xf2ede0, spot: 0x35302a },  // caramelo malhada (atual)
  { hide: 0xf5f2ec, spot: 0x1c1a16 },  // Holstein preto-e-branco
  { hide: 0x8a5a3a, spot: 0x8a5a3a }   // Jersey marrom uniforme (sem contraste de mancha)
];

function buildCow() {
  const group = new THREE.Group();
  const palette = cowPalettes[Math.floor(Math.random() * cowPalettes.length)];
  const hideMat = new THREE.MeshStandardMaterial({ color: palette.hide, flatShading: true, roughness: 0.85 });
  const spotMat = new THREE.MeshStandardMaterial({ color: palette.spot, flatShading: true, roughness: 0.85 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xd8cba0, roughness: 0.6 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0xdcb8a8, flatShading: true, roughness: 0.7 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 0.6 });
  const udderMat = new THREE.MeshStandardMaterial({ color: 0xe8b8a8, roughness: 0.6 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x1c1512, roughness: 0.5 });

  const jitter = (r) => (Math.random() - 0.5) * r;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.5), hideMat);
  body.position.y = 0.55;
  body.rotation.y = jitter(0.06);
  body.castShadow = true;
  group.add(body);

  // 4-6 manchas com posições/raios variados, incluindo cabeça e perna
  const spotSpecs = [
    [0.2, 0.62, 0.2, 0.22], [-0.15, 0.5, -0.15, 0.18], [0.05, 0.68, -0.1, 0.15],
    [0, 0.6, 0.32, 0.09], [0.32, 0.28, 0.15, 0.08]
  ];
  if (Math.random() > 0.4) spotSpecs.push([-0.28, 0.62, -0.28, 0.13]);
  spotSpecs.forEach(([x, y, z, r]) => {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), spotMat);
    spot.position.set(x + jitter(0.04), y, z + jitter(0.04));
    spot.scale.set(1, 0.6, 1);
    group.add(spot);
  });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.3), hideMat);
  head.position.set(0, 0.62, 0.36);
  head.rotation.x = jitter(0.04);
  head.castShadow = true;
  group.add(head);

  // Orelhas: cones achatados nas laterais da cabeça
  [-0.17, 0.17].forEach(x => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.05, 5), hideMat);
    ear.rotation.z = Math.PI / 2;
    ear.rotation.y = x > 0 ? -0.5 : 0.5;
    ear.position.set(x, 0.66, 0.3);
    group.add(ear);
  });

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.1), snoutMat);
  snout.position.set(0, 0.54, 0.5);
  group.add(snout);

  // Narinas
  [-0.05, 0.05].forEach(x => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), noseMat);
    nostril.position.set(x, 0.54, 0.55);
    group.add(nostril);
  });

  [-0.1, 0.1].forEach(x => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 5), hornMat);
    horn.position.set(x, 0.78, 0.32);
    group.add(horn);
  });

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
  const hoofGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.07, 6);
  [[0.32, 0.2], [-0.32, 0.2], [0.32, -0.18], [-0.32, -0.18]].forEach(([x, z]) => {
    const legScale = 1 + jitter(0.06);
    const leg = new THREE.Mesh(legGeo, hideMat);
    leg.position.set(x, 0.25, z);
    leg.scale.x = leg.scale.z = legScale;
    leg.castShadow = true;
    group.add(leg);

    const hoof = new THREE.Mesh(hoofGeo, hoofMat);
    hoof.position.set(x, 0.035, z);
    group.add(hoof);
  });

  // Úbere: 4 pequenas esferas sob o ventre entre as pernas traseiras
  [[-0.08, -0.06], [0.08, -0.06], [-0.06, -0.12], [0.06, -0.12]].forEach(([x, z]) => {
    const teat = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), udderMat);
    teat.position.set(x, 0.26, z);
    group.add(teat);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), hideMat);
  tail.rotation.x = Math.PI * 0.15;
  tail.position.set(0, 0.5, -0.28);
  group.add(tail);

  // Borla escura na ponta da cauda
  const tailTuft = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), hoofMat);
  tailTuft.scale.set(1, 1.3, 1);
  tailTuft.position.set(0, 0.33, -0.41);
  group.add(tailTuft);

  group.userData.legHeight = 0;
  return group;
}

function buildWolf() {
  const group = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0x2b2822, flatShading: true, roughness: 0.85 });
  const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x1a1712, flatShading: true, roughness: 0.85 });
  const fangMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1a0500, emissive: 0xffcf3a, emissiveIntensity: 1.6, roughness: 0.4
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.32), furMat);
  body.position.y = 0.4;
  body.castShadow = true;
  group.add(body);

  // Crista dorsal: fileira de pelos eriçados ao longo da espinha
  for (let i = 0; i < 6; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), darkFurMat);
    tuft.position.set(0, 0.6, 0.32 - i * 0.13);
    group.add(tuft);
  }

  // Peito/barbela: protuberância sob o pescoço
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), furMat);
  chest.scale.set(1, 0.8, 0.7);
  chest.position.set(0, 0.36, 0.45);
  group.add(chest);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.3), furMat);
  head.position.set(0, 0.48, 0.5);
  head.castShadow = true;
  group.add(head);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 6), furMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.44, 0.68);
  group.add(snout);

  // Presas: pequenos cones voltados para baixo nas laterais da boca
  [-0.06, 0.06].forEach(x => {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 4), fangMat);
    fang.rotation.x = Math.PI;
    fang.position.set(x, 0.37, 0.66);
    group.add(fang);
  });

  [-0.07, 0.07].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    eye.position.set(x, 0.52, 0.6);
    group.add(eye);

    // Orelhas mais trianguladas/eretas, anguladas para fora
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 5), furMat);
    ear.rotation.z = x > 0 ? -0.2 : 0.2;
    ear.position.set(x * 1.6, 0.67, 0.42);
    group.add(ear);
  });

  // Pernas em 2 segmentos (coxa + canela) com angulação, pose mais animalesca
  [[0.32, 0.1], [-0.32, 0.1], [0.32, -0.12], [-0.32, -0.12]].forEach(([x, z]) => {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.22, 5), furMat);
    thigh.position.set(x, 0.32, z);
    thigh.rotation.x = z > 0 ? 0.12 : -0.12;
    group.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.03, 0.2, 5), furMat);
    shin.position.set(x, 0.11, z + (z > 0 ? 0.03 : -0.03));
    group.add(shin);
  });

  // Cauda em 2 segmentos, ponta escura
  const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), furMat);
  tailBase.rotation.x = Math.PI * 0.55;
  tailBase.position.set(0, 0.44, -0.42);
  group.add(tailBase);

  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 6), darkFurMat);
  tailTip.rotation.x = Math.PI * 0.62;
  tailTip.position.set(0, 0.33, -0.62);
  group.add(tailTip);

  group.visible = false;
  return group;
}

// Cria um animal (galinha/vaca): mesh + estado de jogo em userData, adicionado
// dentro do curral. `isOutside` começa false — o jogador solta manualmente ou o
// ciclo dia/noite solta ao amanhecer.
export function spawnAnimal(scene, type, config, corralBounds) {
  const mesh = type === 'Galinha' ? buildChicken() : buildCow();
  const cx = (corralBounds.minX + corralBounds.maxX) / 2;
  const cz = (corralBounds.minZ + corralBounds.maxZ) / 2;
  mesh.position.set(cx + (Math.random() - 0.5) * 1.5, 0, cz + (Math.random() - 0.5) * 1.5);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.userData.isAnimal = true;
  scene.add(mesh);

  const animal = {
    id: nextAnimalId++,
    type,
    mesh,
    product: config.product,
    productTimer: 0,
    productTime: config.productTime,
    productReady: false,
    isOutside: false,
    wanderTarget: null,
    wanderPause: 0
  };
  mesh.userData.animalRef = animal;
  return animal;
}

// Move o animal em direção a um alvo aleatório dentro dos limites atuais (curral
// à noite, área externa liberada de dia), com pausas ocasionais — mesmo espírito
// leve de update por delta já usado no drift das nuvens (world.js:createClouds).
export function updateAnimalAI(animal, delta, bounds) {
  const mesh = animal.mesh;
  const speed = animal.type === 'Vaca' ? 0.5 : 0.9;

  if (animal.wanderPause > 0) {
    animal.wanderPause -= delta;
    return;
  }

  if (!animal.wanderTarget) {
    animal.wanderTarget = {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
    };
  }

  const dx = animal.wanderTarget.x - mesh.position.x;
  const dz = animal.wanderTarget.z - mesh.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 0.2) {
    animal.wanderTarget = null;
    animal.wanderPause = 1.5 + Math.random() * 3;
    return;
  }

  const step = Math.min(dist, speed * delta);
  mesh.position.x += (dx / dist) * step;
  mesh.position.z += (dz / dist) * step;
  mesh.rotation.y = Math.atan2(dx, dz);
}

export function removeAnimal(scene, animals, animal) {
  scene.remove(animal.mesh);
  const idx = animals.indexOf(animal);
  if (idx >= 0) animals.splice(idx, 1);
}

export function createWolfMesh(scene) {
  const wolf = buildWolf();
  scene.add(wolf);
  return wolf;
}

// Posiciona o lobo rondando fora da cerca principal, numa órbita lenta —
// só é chamado quando ele está visível (há animal solto à noite).
export function updateWolfPatrol(wolf, delta, time) {
  const radius = 17 + Math.sin(time * 0.15) * 2;
  const angle = time * 0.12;
  wolf.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius - 3);
  wolf.rotation.y = angle + Math.PI / 2;
}
