import * as THREE from 'three';
import { avoidObstacles } from './world.js';
import { voxelMat, voxelBox } from './voxel.js';

let nextAnimalId = 1;

function applyQuadrupedStride(legPivots, stride, amount) {
  legPivots[0].rotation.x = stride * amount;
  legPivots[3].rotation.x = stride * amount;
  legPivots[1].rotation.x = -stride * amount;
  legPivots[2].rotation.x = -stride * amount;
}

const chickenPalettes = [
  { body: 0xf5f0e0, wing: 0xe8dfc0 },
  { body: 0xa85a3a, wing: 0x8a4526 },
  { body: 0x2b2822, wing: 0xf5f0e0 }
];

function buildChicken() {
  const group = new THREE.Group();
  const palette = chickenPalettes[Math.floor(Math.random() * chickenPalettes.length)];
  const bodyMat = voxelMat(palette.body);
  const wingMat = voxelMat(palette.wing);
  const beakMat = voxelMat(0xe8a83a, { roughness: 0.5 });
  const combMat = voxelMat(0xc9403a, { roughness: 0.6 });
  const legMat = voxelMat(0xd8a23a, { roughness: 0.6 });
  const eyeMat = voxelMat(0x1a1712, { roughness: 0.3 });

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.24;
  group.add(bodyPivot);

  const body = voxelBox(0.32, 0.28, 0.4, bodyMat);
  bodyPivot.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.14, 0.18);
  bodyPivot.add(headPivot);

  const head = voxelBox(0.22, 0.22, 0.22, bodyMat);
  head.position.set(0, 0.02, 0.06);
  headPivot.add(head);

  const beak = voxelBox(0.08, 0.06, 0.12, beakMat);
  beak.position.set(0, 0, 0.18);
  headPivot.add(beak);

  [-0.07, 0.07].forEach(x => {
    const eye = voxelBox(0.04, 0.04, 0.03, eyeMat);
    eye.position.set(x, 0.05, 0.12);
    headPivot.add(eye);
  });

  const comb = voxelBox(0.06, 0.1, 0.14, combMat);
  comb.position.set(0, 0.16, 0.04);
  headPivot.add(comb);

  const wattle = voxelBox(0.05, 0.08, 0.05, combMat);
  wattle.position.set(0, -0.08, 0.12);
  headPivot.add(wattle);

  const wingPivots = [-0.18, 0.18].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.02, 0);
    const wing = voxelBox(0.06, 0.16, 0.24, wingMat);
    wing.position.set(x > 0 ? 0.04 : -0.04, 0, 0);
    pivot.add(wing);
    bodyPivot.add(pivot);
    return pivot;
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.1, -0.2);
  bodyPivot.add(tailPivot);
  [-0.06, 0, 0.06].forEach((x, i) => {
    const tail = voxelBox(0.06, 0.16 + i * 0.02, 0.08, bodyMat);
    tail.position.set(x, 0.1, -0.04);
    tailPivot.add(tail);
  });

  const legPivots = [-0.06, 0.06].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.1, 0.02);
    const leg = voxelBox(0.05, 0.14, 0.05, legMat);
    leg.position.y = -0.07;
    pivot.add(leg);
    const foot = voxelBox(0.08, 0.03, 0.1, legMat);
    foot.position.set(0, -0.14, 0.02);
    pivot.add(foot);
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

const cowPalettes = [
  { hide: 0xf2ede0, spot: 0x35302a },
  { hide: 0xf5f2ec, spot: 0x1c1a16 },
  { hide: 0x8a5a3a, spot: 0x8a5a3a }
];

function buildCow() {
  const group = new THREE.Group();
  const palette = cowPalettes[Math.floor(Math.random() * cowPalettes.length)];
  const hideMat = voxelMat(palette.hide, { roughness: 0.75 });
  const spotMat = voxelMat(palette.spot, { roughness: 0.75 });
  const hornMat = voxelMat(0xd8cba0, { roughness: 0.5 });
  const snoutMat = voxelMat(0xdcb8a8, { roughness: 0.6 });
  const hoofMat = voxelMat(0x2a231c, { roughness: 0.5 });
  const udderMat = voxelMat(0xe8b8a8, { roughness: 0.5 });

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.55;
  group.add(bodyPivot);

  const body = voxelBox(0.7, 0.5, 1.0, hideMat);
  bodyPivot.add(body);

  [[0.2, 0.1, 0.2], [-0.15, 0.05, -0.2], [0.1, 0.15, -0.1]].forEach(([x, y, z]) => {
    const spot = voxelBox(0.22, 0.12, 0.22, spotMat);
    spot.position.set(x, y, z);
    bodyPivot.add(spot);
  });

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.08, 0.52);
  bodyPivot.add(headPivot);

  const head = voxelBox(0.32, 0.3, 0.32, hideMat);
  headPivot.add(head);

  [-0.18, 0.18].forEach(x => {
    const ear = voxelBox(0.1, 0.08, 0.06, hideMat);
    ear.position.set(x, 0.06, 0);
    headPivot.add(ear);
  });

  const snout = voxelBox(0.24, 0.14, 0.14, snoutMat);
  snout.position.set(0, -0.06, 0.2);
  headPivot.add(snout);

  const eyeMat = voxelMat(0x1c1512, { roughness: 0.3 });
  [-0.12, 0.12].forEach(x => {
    const eye = voxelBox(0.06, 0.06, 0.04, eyeMat);
    eye.position.set(x, 0.06, 0.16);
    headPivot.add(eye);
  });

  [-0.1, 0.1].forEach(x => {
    const horn = voxelBox(0.05, 0.12, 0.05, hornMat);
    horn.position.set(x, 0.2, 0);
    headPivot.add(horn);
  });

  const bellStrap = voxelBox(0.1, 0.06, 0.2, 0x6b4527);
  bellStrap.position.set(0, -0.02, 0.12);
  headPivot.add(bellStrap);
  const bell = voxelBox(0.08, 0.08, 0.08, 0xb8935a);
  bell.position.set(0, -0.1, 0.14);
  headPivot.add(bell);

  const legPivots = [[0.22, 0.28], [-0.22, 0.28], [0.22, -0.28], [-0.22, -0.28]].map(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.1, z);
    bodyPivot.add(pivot);
    const leg = voxelBox(0.12, 0.4, 0.12, hideMat);
    leg.position.y = -0.2;
    pivot.add(leg);
    const hoof = voxelBox(0.14, 0.08, 0.14, hoofMat);
    hoof.position.y = -0.42;
    pivot.add(hoof);
    return pivot;
  });

  const udder = voxelBox(0.22, 0.12, 0.2, udderMat);
  udder.position.set(0, -0.28, -0.05);
  bodyPivot.add(udder);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.1, -0.5);
  bodyPivot.add(tailPivot);
  const tail = voxelBox(0.06, 0.08, 0.4, hideMat);
  tail.position.set(0, -0.1, -0.15);
  tailPivot.add(tail);
  const tuft = voxelBox(0.1, 0.1, 0.1, hoofMat);
  tuft.position.set(0, -0.18, -0.35);
  tailPivot.add(tuft);

  group.userData.legHeight = 0;
  group.userData.rig = {
    bodyPivot, headPivot, tailPivot, legPivots,
    bobPhase: Math.random() * Math.PI * 2,
    tailPhase: Math.random() * Math.PI * 2
  };
  return group;
}

function buildSheep() {
  const group = new THREE.Group();
  const woolMat = voxelMat(0xf5f2e8, { roughness: 0.95 });
  const faceMat = voxelMat(0x3a342c, { roughness: 0.6 });
  const legMat = voxelMat(0x2b2620, { roughness: 0.6 });

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.32;
  group.add(bodyPivot);

  const core = voxelBox(0.5, 0.42, 0.6, woolMat);
  bodyPivot.add(core);

  [[0.2, 0.15, 0.15], [-0.2, 0.15, 0.15], [0.2, 0.1, -0.15], [-0.2, 0.1, -0.15], [0, 0.25, 0]].forEach(([x, y, z]) => {
    const tuft = voxelBox(0.2, 0.18, 0.2, woolMat);
    tuft.position.set(x, y, z);
    bodyPivot.add(tuft);
  });

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.08, 0.36);
  bodyPivot.add(headPivot);

  const head = voxelBox(0.2, 0.22, 0.24, faceMat);
  headPivot.add(head);

  [-0.12, 0.12].forEach(x => {
    const ear = voxelBox(0.08, 0.06, 0.1, faceMat);
    ear.position.set(x, 0.06, -0.02);
    headPivot.add(ear);
  });

  const eyeMat = voxelMat(0x0a0805, { roughness: 0.3 });
  [-0.06, 0.06].forEach(x => {
    const eye = voxelBox(0.04, 0.04, 0.03, eyeMat);
    eye.position.set(x, 0.04, 0.12);
    headPivot.add(eye);
  });

  const nose = voxelBox(0.06, 0.05, 0.05, 0xd88a8a);
  nose.position.set(0, -0.04, 0.14);
  headPivot.add(nose);

  const legPivots = [[0.14, 0.16], [-0.14, 0.16], [0.14, -0.16], [-0.14, -0.16]].map(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.05, z);
    bodyPivot.add(pivot);
    const leg = voxelBox(0.08, 0.28, 0.08, legMat);
    leg.position.y = -0.14;
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

function buildWolf() {
  const group = new THREE.Group();
  const furMat = voxelMat(0x2b2822);
  const darkFurMat = voxelMat(0x1a1712);
  const fangMat = voxelMat(0xe8e0d0, { roughness: 0.4 });
  const eyeMat = voxelMat(0x1a0500, { emissive: 0xffcf3a, emissiveIntensity: 1.6, roughness: 0.4 });

  const body = voxelBox(0.4, 0.36, 0.85, furMat);
  body.position.y = 0.42;
  group.add(body);

  for (let i = 0; i < 5; i++) {
    const tuft = voxelBox(0.08, 0.1, 0.08, darkFurMat);
    tuft.position.set(0, 0.62, 0.28 - i * 0.14);
    group.add(tuft);
  }

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.5, 0.48);
  group.add(headPivot);

  const head = voxelBox(0.3, 0.28, 0.32, furMat);
  headPivot.add(head);

  const snout = voxelBox(0.18, 0.14, 0.22, furMat);
  snout.position.set(0, -0.04, 0.22);
  headPivot.add(snout);

  [-0.05, 0.05].forEach(x => {
    const fang = voxelBox(0.03, 0.06, 0.03, fangMat);
    fang.position.set(x, -0.1, 0.28);
    headPivot.add(fang);
  });

  [-0.08, 0.08].forEach(x => {
    const eye = voxelBox(0.06, 0.05, 0.04, eyeMat);
    eye.position.set(x, 0.06, 0.16);
    headPivot.add(eye);

    const ear = voxelBox(0.08, 0.16, 0.06, furMat);
    ear.position.set(x * 1.4, 0.2, -0.06);
    headPivot.add(ear);
  });

  const legPivots = [[0.14, 0.22], [-0.14, 0.22], [0.14, -0.22], [-0.14, -0.22]].map(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.38, z);
    group.add(pivot);

    const thigh = voxelBox(0.1, 0.2, 0.1, furMat);
    thigh.position.y = -0.1;
    pivot.add(thigh);

    const shin = voxelBox(0.08, 0.18, 0.08, furMat);
    shin.position.set(0, -0.28, z > 0 ? 0.02 : -0.02);
    pivot.add(shin);

    const paw = voxelBox(0.1, 0.05, 0.12, darkFurMat);
    paw.position.set(0, -0.38, z > 0 ? 0.02 : -0.02);
    pivot.add(paw);
    return pivot;
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.48, -0.42);
  group.add(tailPivot);

  const tailBase = voxelBox(0.12, 0.12, 0.28, furMat);
  tailBase.position.set(0, 0, -0.12);
  tailPivot.add(tailBase);

  const tailTip = voxelBox(0.1, 0.1, 0.2, darkFurMat);
  tailTip.position.set(0, -0.04, -0.3);
  tailPivot.add(tailTip);

  group.userData.rig = { headPivot, legPivots, tailPivot, bobPhase: Math.random() * Math.PI * 2 };
  group.visible = false;
  return group;
}

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
    const clear = avoidObstacles(target.x, target.z, 0.3, 'farm');
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
  const resolved = avoidObstacles(nextX, nextZ, 0.3, 'farm');
  mesh.position.x = resolved.x;
  mesh.position.z = resolved.z;
  mesh.rotation.y = Math.atan2(dx, dz);
  animal.currentSpeed = speed;
}

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

    const legs = rig.legPivots;
    if (moving) {
      applyQuadrupedStride(legs, stride, 0.35);
    } else {
      legs.forEach(l => { l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, 0.1); });
    }

    const tailSpeed = moving ? 1.6 : 3.2;
    rig.tailPivot.rotation.x = Math.sin(t * tailSpeed + rig.tailPhase) * (moving ? 0.15 : 0.3);
    rig.tailPivot.rotation.z = Math.sin(t * tailSpeed * 0.7 + rig.tailPhase) * 0.12;

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
  if (animal.mesh?.parent) animal.mesh.parent.remove(animal.mesh);
  else if (scene) scene.remove(animal.mesh);
  const idx = animals.indexOf(animal);
  if (idx >= 0) animals.splice(idx, 1);
}

export function createWolfMesh(scene) {
  const wolf = buildWolf();
  scene.add(wolf);
  return wolf;
}

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
