import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { buildLowPolyHumanoid, animateCrawlHumanoid } from './characters.js';
import { avoidObstacles, getGroundHeightAt } from './world.js';
import {
  ENEMY_CONTACT_DAMAGE, ENEMY_CONTACT_COOLDOWN_MS, ENEMY_AGGRO_RANGE, ENEMY_DEAGGRO_RANGE
} from './gameState.js';

let nextEnemyId = 1;

function recolorHumanoid(mesh, { shirt, pants, skin, eyeEmissive }) {
  mesh.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (!m.color) return;
      const hex = m.color.getHex();
      // Pele original ~0xe8c8a0, camisa e calça variam — usa luminância + tom.
      const hsl = { h: 0, s: 0, l: 0 };
      m.color.getHSL(hsl);
      if (hsl.s < 0.28 && hsl.l > 0.45) {
        m.color.setHex(skin);
      } else if (hsl.l < 0.28) {
        m.color.setHex(pants);
      } else {
        m.color.setHex(shirt);
      }
    });
  });

  const head = mesh.userData.rig?.headPivot;
  if (head) {
    const eyeMat = voxelMat(0x140800, {
      emissive: eyeEmissive, emissiveIntensity: 2.4, roughness: 0.35
    });
    [-0.1, 0.1].forEach(x => {
      const eye = voxelBox(0.09, 0.07, 0.05, eyeMat);
      eye.position.set(x, 0.24, 0.23);
      head.add(eye);
    });
    const jaw = voxelBox(0.22, 0.08, 0.16, voxelMat(skin));
    jaw.position.set(0, 0.04, 0.18);
    head.add(jaw);
    const wound = voxelBox(0.1, 0.06, 0.04, voxelMat(0x5a1010, { emissive: 0x3a0000, emissiveIntensity: 0.4 }));
    wound.position.set(0.12, 0.18, 0.2);
    head.add(wound);
  }
}

function buildZombie({ shirt, pants, skin, eyeEmissive, scale = 1, hunch = 0.22 } = {}) {
  const mesh = buildLowPolyHumanoid({
    shirt,
    pants,
    skin,
    accessory: null,
    pose: 'standing',
    overalls: false
  });
  recolorHumanoid(mesh, { shirt, pants, skin, eyeEmissive });
  mesh.scale.setScalar(scale);
  if (mesh.userData.rig?.torsoRoot) {
    mesh.userData.rig.torsoRoot.rotation.x = hunch;
  }
  mesh.userData.hunch = hunch;
  return mesh;
}

function buildWalker() {
  return buildZombie({
    shirt: 0x4a3a2c,
    pants: 0x2a2420,
    skin: 0x7a9a6a,
    eyeEmissive: 0xff3a18,
    scale: 1,
    hunch: 0.22
  });
}

function buildRunner() {
  return buildZombie({
    shirt: 0x3a2a22,
    pants: 0x1e1a16,
    skin: 0x6a8a58,
    eyeEmissive: 0xffc14a,
    scale: 0.94,
    hunch: 0.32
  });
}

function buildBrute() {
  return buildZombie({
    shirt: 0x2c2018,
    pants: 0x1a1612,
    skin: 0x5a6e4e,
    eyeEmissive: 0xff2200,
    scale: 1.22,
    hunch: 0.12
  });
}

function buildCrawler() {
  return buildZombie({
    shirt: 0x3a4a2c,
    pants: 0x24281c,
    skin: 0x4a6a42,
    eyeEmissive: 0xffe14a,
    scale: 0.92,
    hunch: 1.35
  });
}

const ENEMY_BUILDERS = {
  Zumbi: buildWalker,
  ZumbiCorredor: buildRunner,
  ZumbiBruto: buildBrute,
  ZumbiRastejante: buildCrawler
};

const ENEMY_STATS = {
  Zumbi: { hp: 42, speed: 1.45 },
  ZumbiCorredor: { hp: 28, speed: 3.15 },
  ZumbiBruto: { hp: 78, speed: 1.05 },
  ZumbiRastejante: { hp: 34, speed: 0.85 }
};

const ENEMY_AGGRO_MULT = { ZumbiRastejante: 0.4 };

function createHpBarSprite(type, meshScale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 10;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    sizeAttenuation: true
  });
  const sprite = new THREE.Sprite(mat);
  const inv = 1 / Math.max(0.01, meshScale);
  sprite.scale.set(0.95 * inv, 0.15 * inv, 1);
  sprite.position.set(0, type === 'ZumbiRastejante' ? 0.82 : 2.12, 0);
  sprite.visible = false;
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.tex = tex;
  return sprite;
}

export function refreshEnemyHpBar(enemy, { show = false } = {}) {
  const bar = enemy.hpBar;
  if (!bar) return;
  if (enemy.state === 'dead') {
    bar.visible = false;
    return;
  }
  if (show) enemy.hpBarTimer = 4;
  if (enemy.state === 'chasing' || enemy.state === 'attacking') {
    enemy.hpBarTimer = Math.max(enemy.hpBarTimer || 0, 0.55);
  }
  bar.visible = (enemy.hpBarTimer || 0) > 0;
  if (!bar.visible) return;
  const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
  const ctx = bar.userData.ctx;
  ctx.clearRect(0, 0, 64, 10);
  ctx.fillStyle = '#140808';
  ctx.fillRect(0, 0, 64, 10);
  ctx.fillStyle = '#3a1010';
  ctx.fillRect(1, 1, 62, 8);
  ctx.fillStyle = ratio > 0.4 ? '#d32f22' : ratio > 0.18 ? '#e0a020' : '#f0d060';
  ctx.fillRect(2, 2, Math.max(0, Math.round(60 * ratio)), 6);
  bar.userData.tex.needsUpdate = true;
}

export function spawnEnemy(scene, type, position, areaId) {
  const builder = ENEMY_BUILDERS[type] || ENEMY_BUILDERS.Zumbi;
  const mesh = builder();
  const groundY = getGroundHeightAt(position.x, position.z, areaId);
  mesh.position.set(position.x, groundY, position.z);
  mesh.userData.isEnemy = true;
  scene.add(mesh);

  const stats = ENEMY_STATS[type] || ENEMY_STATS.Zumbi;
  const hpBar = createHpBarSprite(type, mesh.scale.x || 1);
  mesh.add(hpBar);
  const enemy = {
    id: nextEnemyId++,
    type,
    mesh,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: ENEMY_CONTACT_DAMAGE[type] ?? 10,
    speed: stats.speed,
    state: 'patrolling',
    homeX: position.x,
    homeZ: position.z,
    wanderTarget: null,
    wanderPause: 0,
    lastAttackTime: 0,
    animTime: Math.random() * 10,
    stagger: 0,
    corpseLife: 0,
    sfxTimer: 1.5 + Math.random() * 3,
    aggroRange: (ENEMY_AGGRO_MULT[type] ?? 1) * ENEMY_AGGRO_RANGE,
    deaggroRange: (ENEMY_AGGRO_MULT[type] ?? 1) * ENEMY_DEAGGRO_RANGE,
    hpBar,
    hpBarTimer: 0
  };
  mesh.userData.enemyRef = enemy;
  refreshEnemyHpBar(enemy);
  return enemy;
}

function inSafeZone(pos, safeZone) {
  if (!safeZone) return false;
  return Math.hypot(pos.x - safeZone.x, pos.z - safeZone.z) < safeZone.radius;
}

export function updateEnemyAI(enemy, delta, playerPos, areaId, safeZone, opts = {}) {
  if (enemy.state === 'dead') return null;
  if (enemy.stagger > 0) {
    enemy.stagger -= delta;
    return null;
  }
  const mesh = enemy.mesh;

  const distToPlayer = Math.hypot(playerPos.x - mesh.position.x, playerPos.z - mesh.position.z);
  const playerSafe = inSafeZone(playerPos, safeZone);
  const baseAggro = enemy.aggroRange ?? ENEMY_AGGRO_RANGE;
  const baseDeaggro = enemy.deaggroRange ?? ENEMY_DEAGGRO_RANGE;
  const aggro = (opts.crouched ? baseAggro * 0.62 : baseAggro);
  const deaggro = opts.crouched ? baseDeaggro * 0.85 : baseDeaggro;

  if (enemy.state === 'patrolling' || enemy.state === 'chasing') {
    if (distToPlayer < aggro && !playerSafe) {
      enemy.state = 'chasing';
    } else if (enemy.state === 'chasing' && (distToPlayer > deaggro || playerSafe)) {
      enemy.state = 'patrolling';
      enemy.wanderTarget = null;
    }
  }

  if (enemy.state === 'patrolling') {
    if (enemy.wanderPause > 0) {
      enemy.wanderPause -= delta;
      return null;
    }
    if (!enemy.wanderTarget) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 4;
      const target = { x: enemy.homeX + Math.cos(angle) * dist, z: enemy.homeZ + Math.sin(angle) * dist };
      const clear = avoidObstacles(target.x, target.z, 0.4, areaId);
      enemy.wanderTarget = clear;
    }
    const dx = enemy.wanderTarget.x - mesh.position.x;
    const dz = enemy.wanderTarget.z - mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.3) {
      enemy.wanderTarget = null;
      enemy.wanderPause = 1.5 + Math.random() * 2.5;
      return null;
    }
    const step = Math.min(dist, enemy.speed * 0.4 * delta);
    const nextX = mesh.position.x + (dx / dist) * step;
    const nextZ = mesh.position.z + (dz / dist) * step;
    const resolved = avoidObstacles(nextX, nextZ, 0.4, areaId);
    mesh.position.x = resolved.x;
    mesh.position.z = resolved.z;
    mesh.position.y = getGroundHeightAt(resolved.x, resolved.z, areaId);
    mesh.rotation.y = Math.atan2(dx, dz);
    return null;
  }

  if (enemy.state === 'chasing') {
    const meleeRange = enemy.type === 'ZumbiBruto' ? 1.45 : 1.25;
    if (distToPlayer <= meleeRange) {
      enemy.state = 'attacking';
      return null;
    }
    const dx = playerPos.x - mesh.position.x;
    const dz = playerPos.z - mesh.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const step = enemy.speed * delta;
    const nextX = mesh.position.x + (dx / dist) * step;
    const nextZ = mesh.position.z + (dz / dist) * step;
    const resolved = avoidObstacles(nextX, nextZ, 0.4, areaId);
    mesh.position.x = resolved.x;
    mesh.position.z = resolved.z;
    mesh.position.y = getGroundHeightAt(resolved.x, resolved.z, areaId);
    mesh.rotation.y = Math.atan2(dx, dz);
    return null;
  }

  if (enemy.state === 'attacking') {
    const dx = playerPos.x - mesh.position.x;
    const dz = playerPos.z - mesh.position.z;
    mesh.rotation.y = Math.atan2(dx, dz);
    const meleeRange = enemy.type === 'ZumbiBruto' ? 1.45 : 1.25;
    if (distToPlayer > meleeRange * 1.35) {
      enemy.state = 'chasing';
      return null;
    }
    const now = Date.now();
    if (now - enemy.lastAttackTime >= ENEMY_CONTACT_COOLDOWN_MS) {
      enemy.lastAttackTime = now;
      return 'attack';
    }
  }

  return null;
}

export function poseEnemyCorpse(enemy) {
  enemy.state = 'dead';
  enemy.corpseLife = 12;
  const side = Math.random() > 0.5 ? 1 : -1;
  enemy.mesh.rotation.z = side * Math.PI / 2;
  enemy.mesh.rotation.x = (Math.random() - 0.5) * 0.25;
  refreshEnemyHpBar(enemy);
}

export function animateEnemy(enemy, delta) {
  if (enemy.hpBarTimer > 0) enemy.hpBarTimer = Math.max(0, enemy.hpBarTimer - delta);
  refreshEnemyHpBar(enemy);
  if (enemy.state === 'dead') return;
  enemy.animTime += delta;
  const t = enemy.animTime;
  const rig = enemy.mesh.userData.rig;
  if (!rig) return;

  const chasing = enemy.state === 'chasing' || enemy.state === 'attacking';
  const moving = chasing || (enemy.state === 'patrolling' && enemy.wanderTarget);

  if (enemy.type === 'ZumbiRastejante') {
    animateCrawlHumanoid(enemy.mesh, t, moving);
    return;
  }
  const speed = chasing ? enemy.speed : enemy.speed * 0.45;
  const step = t * (3.2 + speed * 1.4);
  const left = Math.sin(step);
  const right = Math.sin(step + Math.PI);
  const swing = moving ? 0.42 : 0.08;
  const hunch = enemy.mesh.userData.hunch ?? 0.22;

  if (rig.torsoRoot) {
    rig.torsoRoot.rotation.x = hunch + (chasing ? 0.12 : 0);
    rig.torsoRoot.position.y = moving ? Math.abs(Math.sin(step * 2)) * 0.03 : 0;
    rig.torsoRoot.rotation.z = moving ? Math.sin(step) * -0.04 : 0;
  }

  if (rig.leftLeg) rig.leftLeg.rotation.x = left * swing;
  if (rig.rightLeg) rig.rightLeg.rotation.x = right * swing;
  if (rig.leftKnee) rig.leftKnee.rotation.x = Math.max(0, -left) * 0.45 + 0.08;
  if (rig.rightKnee) rig.rightKnee.rotation.x = Math.max(0, -right) * 0.45 + 0.08;

  // Braços à frente no estilo zumbi
  const reach = chasing ? -1.15 : -0.55;
  if (rig.leftArm) {
    rig.leftArm.rotation.x = reach + Math.sin(t * 2.1) * 0.12;
    rig.leftArm.rotation.z = chasing ? 0.18 : 0.08;
  }
  if (rig.rightArm) {
    rig.rightArm.rotation.x = reach + 0.08 + Math.sin(t * 2.1 + 1) * 0.12;
    rig.rightArm.rotation.z = chasing ? -0.18 : -0.08;
  }
  if (rig.leftElbow) rig.leftElbow.rotation.x = chasing ? 0.15 : 0.35;
  if (rig.rightElbow) rig.rightElbow.rotation.x = chasing ? 0.12 : 0.35;

  if (rig.headPivot) {
    rig.headPivot.rotation.y = Math.sin(t * 0.7) * 0.18;
    rig.headPivot.rotation.x = 0.15 + Math.sin(t * 0.45) * 0.08;
  }
}

export function damageEnemy(enemy, amount) {
  if (enemy.state === 'dead') return false;
  enemy.hp -= amount;
  refreshEnemyHpBar(enemy, { show: true });
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.state = 'dead';
    refreshEnemyHpBar(enemy);
    return true;
  }
  return false;
}

export function removeEnemy(scene, enemies, enemy) {
  if (enemy.hpBar) {
    enemy.hpBar.userData.tex?.dispose?.();
    enemy.hpBar.material?.dispose?.();
    if (enemy.hpBar.parent) enemy.hpBar.parent.remove(enemy.hpBar);
    enemy.hpBar = null;
  }
  if (enemy.mesh?.parent) enemy.mesh.parent.remove(enemy.mesh);
  else if (scene) scene.remove(enemy.mesh);
  const idx = enemies.indexOf(enemy);
  if (idx >= 0) enemies.splice(idx, 1);
}
