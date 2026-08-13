import * as THREE from 'three';
import { avoidObstacles } from './world.js';

let nextAnimalId = 1;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.68, ...opts });
}

// Trote de quadrúpede: dianteira-esquerda + traseira-direita em fase, o par
// oposto em contrafase — usado pela vaca (andar) e pelo lobo (patrulha).
function applyQuadrupedStride(legPivots, stride, amount) {
  legPivots[0].rotation.x = stride * amount;
  legPivots[3].rotation.x = stride * amount;
  legPivots[1].rotation.x = -stride * amount;
  legPivots[2].rotation.x = -stride * amount;
}

// ---------------------------------------------------------------------------
// Galinha — corpo em octaedro alongado (facetado, silhueta de "gota" clara),
// em vez da esfera lisa original. Pernas, cabeça e cauda ficam em pivôs
// próprios (origem na articulação) para permitir animação procedural real
// de caminhada/bicada em vez de o corpo inteiro apenas deslizar no chão.
// ---------------------------------------------------------------------------

const chickenPalettes = [
  { body: 0xf5f0e0, wing: 0xe8dfc0 },
  { body: 0xa85a3a, wing: 0x8a4526 },
  { body: 0x2b2822, wing: 0xf5f0e0 }
];

function buildChicken() {
  const group = new THREE.Group();
  const palette = chickenPalettes[Math.floor(Math.random() * chickenPalettes.length)];
  const bodyMat = mat(palette.body);
  const wingMat = mat(palette.wing);
  const beakMat = mat(0xe8a83a, { roughness: 0.5 });
  const combMat = mat(0xc9403a, { roughness: 0.6 });
  const legMat = mat(0xd8a23a, { flatShading: false, roughness: 0.6 });
  const eyeMat = mat(0x1a1712, { roughness: 0.3 });
  const eyeHighlightMat = mat(0xffffff, { roughness: 0.2, flatShading: false });

  const jitter = () => (Math.random() - 0.5) * 0.06;

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.24;
  group.add(bodyPivot);

  // Corpo: octaedro esticado — 8 facetas nítidas formam um volume de "gota"
  // em pé, silhueta muito mais reconhecível que uma esfera de baixa resolução.
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), bodyMat);
  body.scale.set(1.05, 1.25, 1.5);
  body.rotation.y = Math.PI / 4;
  body.castShadow = true;
  bodyPivot.add(body);

  // Pescoço/cabeça em pivô próprio na base do pescoço, para poder bicar e
  // olhar de lado sem deformar o resto do corpo.
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.13, 0.14);
  bodyPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), bodyMat);
  head.scale.set(1, 1.05, 1.1);
  head.position.set(0, 0.01, 0.04);
  head.rotation.y = Math.PI / 4 + jitter();
  head.castShadow = true;
  headPivot.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 5), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0, 0.15);
  headPivot.add(beak);

  [-0.06, 0.06].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat);
    eye.position.set(x, 0.04, 0.1);
    headPivot.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 4), eyeHighlightMat);
    glint.position.set(x - 0.005, 0.045, 0.112);
    headPivot.add(glint);
  });

  // Barbela dupla sob o bico
  [-0.03, 0.03].forEach(x => {
    const wattle = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 5), combMat);
    wattle.rotation.x = Math.PI;
    wattle.position.set(x, -0.06, 0.11);
    headPivot.add(wattle);
  });

  // Crista serrilhada: fileira de pequenos cones
  [-0.03, 0, 0.035].forEach((z, i) => {
    const comb = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05 + (i === 1 ? 0.025 : 0), 5), combMat);
    comb.position.set(0, 0.1 + (i === 1 ? 0.012 : 0), 0.04 + z);
    headPivot.add(comb);
  });

  // Asas em pivô (ombro) para poder bater levemente ao caminhar
  const wingPivots = [-0.16, 0.16].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.24, -0.03);
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 4), wingMat);
    wing.rotation.z = Math.PI / 2 + (x > 0 ? -0.25 : 0.25);
    wing.rotation.y = Math.PI / 4;
    wing.scale.set(1, 1, 0.55);
    wing.position.set(x > 0 ? 0.08 : -0.08, 0, 0);
    wing.castShadow = true;
    pivot.add(wing);
    bodyPivot.add(pivot);
    return pivot;
  });

  // Cauda em leque num pivô próprio, para poder abanar
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.26, -0.2);
  bodyPivot.add(tailPivot);
  [-0.28, 0, 0.28].forEach(angle => {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 4), bodyMat);
    tail.rotation.x = Math.PI * 0.62;
    tail.rotation.z = angle;
    tail.position.set(Math.sin(angle) * 0.03, 0.08 + Math.abs(angle) * 0.03, -0.06);
    tailPivot.add(tail);
  });

  // Pernas: pivô no quadril (altura do corpo) contendo a perna + pés, para
  // que a rotação do pivô mova a perna toda como uma unidade articulada.
  const legPivots = [-0.05, 0.05].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.14, 0.02);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 5), legMat);
    leg.position.y = -0.07;
    pivot.add(leg);

    [-0.35, 0, 0.35].forEach(toeAngle => {
      const toe = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 4), legMat);
      toe.rotation.x = Math.PI / 2;
      toe.rotation.z = toeAngle;
      toe.position.set(Math.sin(toeAngle) * 0.02, -0.135, Math.cos(toeAngle) * 0.02);
      pivot.add(toe);
    });
    bodyPivot.add(pivot);
    return pivot;
  });

  group.userData.legHeight = 0.22;
  group.userData.rig = {
    bodyPivot, headPivot, tailPivot, wingPivots, legPivots,
    bobPhase: Math.random() * Math.PI * 2,
    peckTimer: 1 + Math.random() * 3
  };
  return group;
}

// ---------------------------------------------------------------------------
// Vaca — corpo em prisma facetado com bevel (Shape extrudado), volume mais
// esculpido do que uma caixa simples. Cabeça, cauda e pernas em pivôs
// articulados para caminhada e balanço de cauda reais.
// ---------------------------------------------------------------------------

const cowPalettes = [
  { hide: 0xf2ede0, spot: 0x35302a },
  { hide: 0xf5f2ec, spot: 0x1c1a16 },
  { hide: 0x8a5a3a, spot: 0x8a5a3a }
];

function buildCowBodyGeometry() {
  const profile = new THREE.Shape();
  profile.moveTo(-0.42, -0.27);
  profile.lineTo(-0.44, 0.1);
  profile.lineTo(-0.36, 0.25);
  profile.lineTo(-0.1, 0.29);
  profile.lineTo(0.22, 0.28);
  profile.lineTo(0.4, 0.16);
  profile.lineTo(0.42, -0.1);
  profile.lineTo(0.4, -0.27);
  profile.closePath();
  const geo = new THREE.ExtrudeGeometry(profile, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  geo.translate(0, 0, -0.25);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildCow() {
  const group = new THREE.Group();
  const palette = cowPalettes[Math.floor(Math.random() * cowPalettes.length)];
  const hideMat = mat(palette.hide, { roughness: 0.75 });
  const spotMat = mat(palette.spot, { roughness: 0.75 });
  const hornMat = mat(0xd8cba0, { flatShading: false, roughness: 0.5 });
  const snoutMat = mat(0xdcb8a8, { roughness: 0.6 });
  const hoofMat = mat(0x2a231c, { flatShading: false, roughness: 0.5 });
  const udderMat = mat(0xe8b8a8, { flatShading: false, roughness: 0.5 });
  const noseMat = mat(0x1c1512, { flatShading: false, roughness: 0.4 });

  const jitter = (r) => (Math.random() - 0.5) * r;

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.55;
  group.add(bodyPivot);

  const body = new THREE.Mesh(buildCowBodyGeometry(), hideMat);
  body.rotation.y = jitter(0.06);
  body.castShadow = true;
  bodyPivot.add(body);

  const spotSpecs = [
    [0.2, 0.07, 0.2, 0.22], [-0.15, -0.05, -0.15, 0.18], [0.05, 0.13, -0.1, 0.15],
    [0, 0.05, 0.32, 0.09], [0.32, -0.27, 0.15, 0.08]
  ];
  if (Math.random() > 0.4) spotSpecs.push([-0.28, 0.07, -0.28, 0.13]);
  spotSpecs.forEach(([x, y, z, r]) => {
    const spot = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), spotMat);
    spot.position.set(x + jitter(0.04), y, z + jitter(0.04));
    spot.scale.set(1, 0.55, 1);
    bodyPivot.add(spot);
  });

  // Cabeça/pescoço em pivô próprio (base do pescoço) para balançar ao pastar/andar
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.07, 0.31);
  bodyPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.3), hideMat);
  head.position.set(0, 0, 0.05);
  head.rotation.x = jitter(0.04);
  head.castShadow = true;
  headPivot.add(head);

  [-0.17, 0.17].forEach(x => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.05, 5), hideMat);
    ear.rotation.z = Math.PI / 2;
    ear.rotation.y = x > 0 ? -0.5 : 0.5;
    ear.position.set(x, 0.04, -0.01);
    headPivot.add(ear);
  });

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.1), snoutMat);
  snout.position.set(0, -0.08, 0.19);
  headPivot.add(snout);

  [-0.05, 0.05].forEach(x => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), noseMat);
    nostril.position.set(x, -0.08, 0.24);
    headPivot.add(nostril);
  });

  const cowEyeMat = mat(0x1c1512, { flatShading: false, roughness: 0.3 });
  const cowEyeGlintMat = mat(0xffffff, { flatShading: false, roughness: 0.2 });
  [-0.145, 0.145].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), cowEyeMat);
    eye.position.set(x, 0.04, 0.13);
    headPivot.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.009, 4, 4), cowEyeGlintMat);
    glint.position.set(x - (x > 0 ? 0.01 : -0.01), 0.05, 0.15);
    headPivot.add(glint);
  });

  [-0.1, 0.1].forEach(x => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 5), hornMat);
    horn.position.set(x, 0.16, 0.01);
    headPivot.add(horn);
  });

  // Sino de couro pendurado no pescoço — leitura rural clássica à distância
  const bellStrapMat = mat(0x6b4527, { roughness: 0.85 });
  const bellMat = mat(0xb8935a, { flatShading: false, roughness: 0.4, metalness: 0.5 });
  const bellStrap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.24), bellStrapMat);
  bellStrap.position.set(0, 0.02, 0.17);
  headPivot.add(bellStrap);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.07, 8), bellMat);
  bell.position.set(0, -0.06, 0.19);
  headPivot.add(bell);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
  const hoofGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.07, 6);
  const legPivots = [[0.32, 0.2], [-0.32, 0.2], [0.32, -0.18], [-0.32, -0.18]].map(([x, z]) => {
    const legScale = 1 + jitter(0.06);
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    bodyPivot.add(pivot);

    const leg = new THREE.Mesh(legGeo, hideMat);
    leg.position.y = -0.25;
    leg.scale.x = leg.scale.z = legScale;
    leg.castShadow = true;
    pivot.add(leg);

    const hoof = new THREE.Mesh(hoofGeo, hoofMat);
    hoof.position.y = -0.5;
    pivot.add(hoof);
    return pivot;
  });

  [[-0.08, -0.06], [0.08, -0.06], [-0.06, -0.12], [0.06, -0.12]].forEach(([x, z]) => {
    const teat = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), udderMat);
    teat.position.set(x, -0.29, z);
    bodyPivot.add(teat);
  });

  // Cauda em pivô no quadril, com a haste + borla penduradas abaixo do pivô
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.1, -0.29);
  bodyPivot.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), hideMat);
  tail.rotation.x = Math.PI * 0.15;
  tail.position.set(0, -0.17, -0.02);
  tailPivot.add(tail);
  const tailTuft = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), hoofMat);
  tailTuft.scale.set(1, 1.3, 1);
  tailTuft.position.set(0, -0.34, -0.05);
  tailPivot.add(tailTuft);

  group.userData.legHeight = 0;
  group.userData.rig = {
    bodyPivot, headPivot, tailPivot, legPivots,
    bobPhase: Math.random() * Math.PI * 2,
    tailPhase: Math.random() * Math.PI * 2
  };
  return group;
}

// ---------------------------------------------------------------------------
// Ovelha — corpo em nuvem de icosaedros facetados (lã), cabeça e pernas escuras
// sem lã à mostra. Rig simplificado (2 pernas animadas em espelho, sem cauda)
// já que é um animal mais lento e discreto que a galinha/vaca.
// ---------------------------------------------------------------------------

function buildSheep() {
  const group = new THREE.Group();
  const woolMat = mat(0xf5f2e8, { roughness: 0.95 });
  const faceMat = mat(0x3a342c, { roughness: 0.6 });
  const legMat = mat(0x2b2620, { flatShading: false, roughness: 0.6 });

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.32;
  group.add(bodyPivot);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), woolMat);
  core.scale.set(1.15, 1, 1.3);
  core.castShadow = true;
  bodyPivot.add(core);

  const woolTuftSpecs = [
    [0.16, 0.1, 0.18], [-0.16, 0.1, 0.18], [0.18, 0.08, -0.1], [-0.18, 0.08, -0.1],
    [0, 0.2, 0.05], [0.1, 0.02, 0.28], [-0.1, 0.02, 0.28]
  ];
  woolTuftSpecs.forEach(([x, y, z]) => {
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + Math.random() * 0.05, 0), woolMat);
    tuft.position.set(x, y, z);
    tuft.castShadow = true;
    bodyPivot.add(tuft);
  });

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.08, 0.32);
  bodyPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.2), faceMat);
  head.castShadow = true;
  headPivot.add(head);

  [-0.09, 0.09].forEach(x => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), faceMat);
    ear.rotation.z = Math.PI / 2;
    ear.rotation.y = x > 0 ? -0.4 : 0.4;
    ear.position.set(x, 0.05, -0.03);
    headPivot.add(ear);
  });

  const eyeMat = mat(0x0a0805, { roughness: 0.3 });
  const eyeGlintMat = mat(0xffffff, { flatShading: false, roughness: 0.2 });
  [-0.055, 0.055].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeMat);
    eye.position.set(x, 0.02, 0.09);
    headPivot.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), eyeGlintMat);
    glint.position.set(x - (x > 0 ? 0.006 : -0.006), 0.026, 0.104);
    headPivot.add(glint);
  });

  const noseMat = mat(0xd88a8a, { flatShading: false, roughness: 0.5 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), noseMat);
  nose.position.set(0, -0.05, 0.1);
  headPivot.add(nose);

  const legPivots = [[0.13, 0.16], [-0.13, 0.16], [0.13, -0.14], [-0.13, -0.14]].map(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.16, z);
    bodyPivot.add(pivot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.32, 5), legMat);
    leg.position.y = -0.16;
    leg.castShadow = true;
    pivot.add(leg);
    return pivot;
  });

  group.userData.legHeight = 0;
  group.userData.rig = {
    bodyPivot, headPivot, legPivots,
    bobPhase: Math.random() * Math.PI * 2
  };
  return group;
}

// ---------------------------------------------------------------------------
// Lobo — corpo em prisma afunilado. Pernas em 2 segmentos com pivôs no
// quadril/joelho para permitir um trote real ao patrulhar.
// ---------------------------------------------------------------------------

function buildWolfBodyGeometry() {
  const profile = new THREE.Shape();
  profile.moveTo(-0.45, -0.18);
  profile.lineTo(-0.46, 0.14);
  profile.lineTo(-0.3, 0.22);
  profile.lineTo(0.15, 0.2);
  profile.lineTo(0.4, 0.08);
  profile.lineTo(0.45, -0.18);
  profile.closePath();
  const geo = new THREE.ExtrudeGeometry(profile, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  geo.translate(0, 0, -0.16);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildWolf() {
  const group = new THREE.Group();
  const furMat = mat(0x2b2822);
  const darkFurMat = mat(0x1a1712);
  const fangMat = mat(0xe8e0d0, { flatShading: false, roughness: 0.4 });
  const eyeMat = mat(0x1a0500, { emissive: 0xffcf3a, emissiveIntensity: 1.6, roughness: 0.4 });

  const body = new THREE.Mesh(buildWolfBodyGeometry(), furMat);
  body.position.y = 0.4;
  body.castShadow = true;
  group.add(body);

  for (let i = 0; i < 6; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), darkFurMat);
    tuft.position.set(0, 0.6, 0.32 - i * 0.13);
    group.add(tuft);
  }

  const chest = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), furMat);
  chest.scale.set(1, 0.8, 0.7);
  chest.position.set(0, 0.36, 0.45);
  group.add(chest);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.48, 0.5);
  group.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.3), furMat);
  head.castShadow = true;
  headPivot.add(head);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 6), furMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.04, 0.18);
  headPivot.add(snout);

  [-0.06, 0.06].forEach(x => {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 4), fangMat);
    fang.rotation.x = Math.PI;
    fang.position.set(x, -0.11, 0.16);
    headPivot.add(fang);
  });

  [-0.07, 0.07].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    eye.position.set(x, 0.04, 0.1);
    headPivot.add(eye);

    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 5), furMat);
    ear.rotation.z = x > 0 ? -0.2 : 0.2;
    ear.position.set(x * 1.6, 0.19, -0.08);
    headPivot.add(ear);
  });

  // Pernas em 2 segmentos (coxa + canela) com pivô no quadril
  const legPivots = [[0.32, 0.1], [-0.32, 0.1], [0.32, -0.12], [-0.32, -0.12]].map(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.42, z);
    group.add(pivot);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.22, 5), furMat);
    thigh.position.y = -0.1;
    thigh.rotation.x = z > 0 ? 0.12 : -0.12;
    pivot.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.03, 0.2, 5), furMat);
    shin.position.set(0, -0.31, z > 0 ? 0.03 : -0.03);
    pivot.add(shin);

    const pawZ = z > 0 ? 0.03 : -0.03;
    [-0.02, 0, 0.02].forEach(cx => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.035, 4), fangMat);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(cx, -0.41, pawZ + 0.03);
      pivot.add(claw);
    });
    return pivot;
  });

  // Cauda em pivô na base (garupa), para poder abanar em sincronia com o trote
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.48, -0.34);
  group.add(tailPivot);

  const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), furMat);
  tailBase.rotation.x = Math.PI * 0.55;
  tailBase.position.set(0, -0.04, -0.08);
  tailPivot.add(tailBase);

  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 6), darkFurMat);
  tailTip.rotation.x = Math.PI * 0.62;
  tailTip.position.set(0, -0.15, -0.28);
  tailPivot.add(tailTip);

  group.userData.rig = { headPivot, legPivots, tailPivot, bobPhase: Math.random() * Math.PI * 2 };
  group.visible = false;
  return group;
}

// Cria um animal (galinha/vaca): mesh + estado de jogo em userData, adicionado
// dentro do curral. `isOutside` começa false — o jogador solta manualmente ou o
// ciclo dia/noite solta ao amanhecer.
export function spawnAnimal(scene, type, config, corralBounds) {
  const mesh = type === 'Galinha' ? buildChicken() : type === 'Ovelha' ? buildSheep() : buildCow();
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
    wanderPause: 0,
    animTime: Math.random() * 10
  };
  mesh.userData.animalRef = animal;
  return animal;
}

// Move o animal em direção a um alvo aleatório dentro dos limites atuais (curral
// à noite, área externa liberada de dia), com pausas ocasionais. Retorna a
// velocidade de deslocamento efetiva do frame (0 quando parado), usada por
// animateAnimal para escolher entre pose de caminhada e pose parada.
export function updateAnimalAI(animal, delta, bounds) {
  const mesh = animal.mesh;
  const speed = animal.type === 'Vaca' ? 0.5 : animal.type === 'Ovelha' ? 0.6 : 0.9;

  if (animal.wanderPause > 0) {
    animal.wanderPause -= delta;
    animal.currentSpeed = 0;
    return;
  }

  if (!animal.wanderTarget) {
    const target = {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
    };
    // Não sorteia um alvo dentro de um obstáculo — evita ficar tentando
    // "entrar" numa árvore/rocha/construção sem nunca chegar (dist nunca < 0.2).
    const clear = avoidObstacles(target.x, target.z, 0.3);
    animal.wanderTarget = { x: clear.x, z: clear.z };
  }

  const dx = animal.wanderTarget.x - mesh.position.x;
  const dz = animal.wanderTarget.z - mesh.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 0.2) {
    animal.wanderTarget = null;
    animal.wanderPause = 1.5 + Math.random() * 3;
    animal.currentSpeed = 0;
    return;
  }

  const step = Math.min(dist, speed * delta);
  const nextX = mesh.position.x + (dx / dist) * step;
  const nextZ = mesh.position.z + (dz / dist) * step;
  // Empurra o passo para fora de qualquer obstáculo que o animal atravessaria
  // ao seguir direto para o alvo — ele desliza pela borda em vez de atravessar.
  const resolved = avoidObstacles(nextX, nextZ, 0.3);
  mesh.position.x = resolved.x;
  mesh.position.z = resolved.z;
  mesh.rotation.y = Math.atan2(dx, dz);
  animal.currentSpeed = speed;
}

// Animação procedural do animal: caminhada com pernas alternando de verdade
// (não apenas o corpo deslizando), idle de respiração/balanço, e gestos
// específicos por espécie (galinha bica o chão, vaca abana o rabo e mastiga).
// Chamado todo frame pelo main.js, depois de updateAnimalAI.
export function animateAnimal(animal, delta) {
  const rig = animal.mesh.userData.rig;
  if (!rig) return;

  animal.animTime += delta;
  const t = animal.animTime;
  const moving = (animal.currentSpeed || 0) > 0.01;
  const strideSpeed = moving ? 9 : 0;
  const stride = Math.sin(t * strideSpeed);

  if (animal.type === 'Galinha') {
    const bobY = moving ? Math.abs(Math.sin(t * strideSpeed)) * 0.035 : Math.sin(t * 1.6 + rig.bobPhase) * 0.006;
    rig.bodyPivot.position.y = 0.24 + bobY;
    rig.bodyPivot.rotation.z = moving ? stride * 0.05 : 0;

    rig.legPivots[0].rotation.x = moving ? stride * 0.7 : 0;
    rig.legPivots[1].rotation.x = moving ? -stride * 0.7 : 0;

    rig.wingPivots.forEach((wing, i) => {
      wing.rotation.z = moving ? Math.sin(t * strideSpeed + i * Math.PI) * 0.12 : Math.sin(t * 0.8) * 0.02;
    });

    rig.tailPivot.rotation.x = Math.sin(t * 2 + rig.bobPhase) * 0.08;

    if (!moving) {
      rig.peckTimer -= delta;
      if (rig.peckTimer <= 0) {
        rig.peckTimer = 2.5 + Math.random() * 3;
        rig.pecking = 0.001;
      }
    }
    if (rig.pecking) {
      rig.pecking += delta * 6;
      const peckAngle = Math.sin(Math.min(rig.pecking, Math.PI)) * 0.9;
      rig.headPivot.rotation.x = peckAngle;
      if (rig.pecking >= Math.PI) rig.pecking = 0;
    } else {
      rig.headPivot.rotation.x = Math.sin(t * 1.3 + rig.bobPhase) * 0.05;
      rig.headPivot.rotation.y = Math.sin(t * 0.5 + rig.bobPhase) * 0.15;
    }
  } else if (animal.type === 'Ovelha') {
    const bobY = moving ? Math.abs(Math.sin(t * strideSpeed)) * 0.025 : Math.sin(t * 1.2 + rig.bobPhase) * 0.006;
    rig.bodyPivot.position.y = 0.32 + bobY;

    if (moving) {
      applyQuadrupedStride(rig.legPivots, stride, 0.4);
    } else {
      rig.legPivots.forEach(l => { l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, 0.1); });
    }

    rig.headPivot.rotation.x = moving
      ? THREE.MathUtils.lerp(rig.headPivot.rotation.x, 0, 0.15)
      : 0.3 + Math.sin(t * 0.6 + rig.bobPhase) * 0.08;
    rig.headPivot.rotation.y = Math.sin(t * 0.4 + rig.bobPhase) * 0.15;
  } else if (animal.type === 'Vaca') {
    const bobY = moving ? Math.abs(Math.sin(t * strideSpeed)) * 0.02 : Math.sin(t * 0.9 + rig.bobPhase) * 0.008;
    rig.bodyPivot.position.y = 0.55 + bobY;

    // Andar em diagonal: dianteira-esquerda com traseira-direita em fase.
    const legs = rig.legPivots;
    if (moving) {
      applyQuadrupedStride(legs, stride, 0.35);
    } else {
      legs.forEach(l => { l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, 0.1); });
    }

    // Rabo abanando constantemente, mais rápido parada (espantando moscas)
    const tailSpeed = moving ? 1.6 : 3.2;
    rig.tailPivot.rotation.x = Math.sin(t * tailSpeed + rig.tailPhase) * (moving ? 0.15 : 0.3);
    rig.tailPivot.rotation.z = Math.sin(t * tailSpeed * 0.7 + rig.tailPhase) * 0.12;

    // Cabeça baixa balançando ao pastar quando parada, nível ao caminhar
    if (!moving) {
      rig.headPivot.rotation.x = 0.25 + Math.sin(t * 0.7 + rig.bobPhase) * 0.1;
      rig.headPivot.rotation.y = Math.sin(t * 0.35 + rig.bobPhase) * 0.2;
    } else {
      rig.headPivot.rotation.x = THREE.MathUtils.lerp(rig.headPivot.rotation.x, Math.sin(t * strideSpeed * 0.5) * 0.04, 0.15);
      rig.headPivot.rotation.y = THREE.MathUtils.lerp(rig.headPivot.rotation.y, 0, 0.1);
    }
  }
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

// Posiciona o lobo rondando fora da cerca principal, numa órbita lenta, com
// as pernas em trote sincronizado à velocidade angular e a cabeça vasculhando
// de um lado a outro — só é chamado quando ele está visível.
export function updateWolfPatrol(wolf, delta, time) {
  const radius = 17 + Math.sin(time * 0.15) * 2;
  const angle = time * 0.12;
  wolf.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius - 3);
  wolf.rotation.y = angle + Math.PI / 2;

  const rig = wolf.userData.rig;
  if (!rig) return;
  const stride = Math.sin(time * 7);
  applyQuadrupedStride(rig.legPivots, stride, 0.5);
  wolf.position.y = Math.abs(Math.sin(time * 7)) * 0.03;
  rig.headPivot.rotation.y = Math.sin(time * 0.6 + rig.bobPhase) * 0.35;
  if (rig.tailPivot) rig.tailPivot.rotation.x = Math.sin(time * 3.5 + rig.bobPhase) * 0.15;
}
