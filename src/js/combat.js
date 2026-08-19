import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { avoidObstacles } from './world.js';
import { damageEnemy } from './enemies.js';
import { getWeaponDef } from './weapons.js';
import { getLookDirection, PLAYER_EYE_HEIGHT } from './player.js';
import { PLAYER_MELEE_ARC_DEG } from './gameState.js';
import { getCurrentArea } from './areas.js';
import {
  worldCapsule, closestPointOnCapsule, segmentHitsCapsule, hitboxForEnemyType
} from './hitbox.js';

const MELEE_ARC_COS = Math.cos(THREE.MathUtils.degToRad(PLAYER_MELEE_ARC_DEG * 0.5));

export function equippedWeapon(state) {
  return getWeaponDef(state.equippedWeapon || 'fists');
}

export function meleeSwingDuration(weapon) {
  const def = weapon || getWeaponDef('fists');
  if (def.id === 'machado') return 0.46;
  if (def.id === 'taco') return 0.4;
  return 0.32;
}

export function beginMeleeSwing(player, weapon, now) {
  const def = weapon || getWeaponDef('fists');
  if (player.meleeSwing) return null;
  if (now < (player.attackCooldownUntil || 0)) return null;
  const duration = meleeSwingDuration(def);
  player.attackCooldownUntil = now + Math.max(def.cooldown, duration * 1000 * 0.85);
  player.meleeSwing = {
    elapsed: 0,
    duration,
    hitAt: duration * 0.38,
    weapon: def,
    didHit: false
  };
  return player.meleeSwing;
}

function meleeOrigin(player, camera) {
  if (camera) {
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    return origin;
  }
  const crouched = player.crouched ? 0.62 : 1;
  return new THREE.Vector3(
    player.mesh.position.x,
    player.mesh.position.y + PLAYER_EYE_HEIGHT * crouched,
    player.mesh.position.z
  );
}

function enemyCapsule(enemy) {
  return worldCapsule(enemy.mesh.position, enemy.hitbox || hitboxForEnemyType(enemy.type));
}

function collectMeleeTargets(player, enemies, weapon, camera) {
  const look = getLookDirection(player, camera);
  const lookLen = Math.hypot(look.x, look.y, look.z) || 1;
  const lx = look.x / lookLen;
  const ly = look.y / lookLen;
  const lz = look.z / lookLen;
  const eye = meleeOrigin(player, camera);

  const hits = [];
  for (const enemy of enemies) {
    if (enemy.state === 'dead') continue;
    const hb = enemy.hitbox || hitboxForEnemyType(enemy.type);
    const cap = enemyCapsule(enemy);
    const closest = closestPointOnCapsule(eye.x, eye.y, eye.z, cap);
    const dx = closest.x - eye.x;
    const dy = closest.y - eye.y;
    const dz = closest.z - eye.z;
    const rawDist = Math.hypot(dx, dy, dz);
    const dist = rawDist - hb.radius;
    if (dist > weapon.range) continue;
    const nd = rawDist || 1;
    const dot = (dx / nd) * lx + (dy / nd) * ly + (dz / nd) * lz;
    if (dot < MELEE_ARC_COS) continue;
    hits.push({
      enemy,
      dist: Math.max(0, dist),
      dx: enemy.mesh.position.x - player.mesh.position.x,
      dz: enemy.mesh.position.z - player.mesh.position.z
    });
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits;
}

export function resolveMeleeHit(player, enemies, weapon, camera) {
  const def = weapon || getWeaponDef('fists');
  const hits = collectMeleeTargets(player, enemies, def, camera);
  if (!hits.length) return { hits: [], killed: [] };

  const killed = [];
  const applied = [];
  const maxHits = def.id === 'machado' ? 3 : 2;
  const areaId = getCurrentArea();
  for (const hit of hits.slice(0, maxHits)) {
    const died = damageEnemy(hit.enemy, def.damage);
    const push = 1.15 + (def.id === 'machado' ? 0.55 : 0.2);
    const len = Math.hypot(hit.dx, hit.dz) || 1;
    hit.enemy.mesh.position.x += (hit.dx / len) * push;
    hit.enemy.mesh.position.z += (hit.dz / len) * push;
    const cleared = avoidObstacles(hit.enemy.mesh.position.x, hit.enemy.mesh.position.z, 0.4, areaId);
    hit.enemy.mesh.position.x = cleared.x;
    hit.enemy.mesh.position.z = cleared.z;
    hit.enemy.stagger = 0.28;
    applied.push(hit.enemy);
    if (died) killed.push(hit.enemy);
  }
  return { hits: applied, killed };
}

export function updateMeleeSwing(player, enemies, delta, camera) {
  const swing = player.meleeSwing;
  if (!swing) return { progress: 0, event: null };
  swing.elapsed += delta;
  const progress = Math.min(1, swing.elapsed / swing.duration);
  let event = null;
  if (!swing.didHit && swing.elapsed >= swing.hitAt) {
    swing.didHit = true;
    event = { type: 'hit', result: resolveMeleeHit(player, enemies, swing.weapon, camera) };
  }
  if (swing.elapsed >= swing.duration) {
    player.meleeSwing = null;
  }
  return { progress, event };
}

function makePelletMesh() {
  return voxelBox(0.05, 0.05, 0.18, voxelMat(0xd8c48a, { metalness: 0.4, roughness: 0.35 }), { castShadow: false });
}

export function fireWeaponProjectiles(scene, player, camera, now, weapon) {
  const def = weapon || getWeaponDef('pistola');
  if (player.reloading) return null;
  if (now < (player.rangedCooldownUntil || 0)) return null;
  player.rangedCooldownUntil = now + def.cooldown;
  player.attackCooldownUntil = now + def.cooldown;

  const origin = new THREE.Vector3();
  const baseDir = new THREE.Vector3();
  if (camera) {
    camera.getWorldPosition(origin);
    camera.getWorldDirection(baseDir);
  } else {
    baseDir.copy(getLookDirection(player, null));
    const crouched = player.crouched ? 0.62 : 1;
    origin.set(
      player.mesh.position.x,
      player.mesh.position.y + PLAYER_EYE_HEIGHT * crouched,
      player.mesh.position.z
    );
  }
  origin.addScaledVector(baseDir, 0.45);

  const pellets = [];
  const count = Math.max(1, def.pellets || 1);
  let spread = count > 1 ? 0.09 : 0.018;
  if (player.aiming) spread *= 0.22;
  if (player.crouched) spread *= 0.85;
  const speed = def.id === 'espingarda' ? 30 : 42;
  const maxDist = def.range + (player.aiming ? 4 : 0);
  const damage = def.damage + (player.aiming ? 3 : 0);

  for (let i = 0; i < count; i++) {
    const dir = baseDir.clone();
    if (count > 1 || spread > 0) {
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread;
      dir.z += (Math.random() - 0.5) * spread * 2;
      dir.normalize();
    }
    const mesh = makePelletMesh();
    mesh.position.copy(origin);
    mesh.lookAt(origin.clone().add(dir));
    scene.add(mesh);
    pellets.push({
      mesh,
      dir,
      speed,
      traveled: 0,
      maxDist,
      damage
    });
  }

  return pellets;
}

export function updateArrows(arrows, enemies, delta, scene) {
  const events = [];
  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    const prev = arrow.mesh.position.clone();
    const step = arrow.speed * delta;
    arrow.mesh.position.addScaledVector(arrow.dir, step);
    arrow.traveled += step;

    let hit = false;
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      const cap = enemyCapsule(enemy);
      if (segmentHitsCapsule(
        prev.x, prev.y, prev.z,
        arrow.mesh.position.x, arrow.mesh.position.y, arrow.mesh.position.z,
        cap
      )) {
        const died = damageEnemy(enemy, arrow.damage ?? 14);
        events.push({ enemy, died, position: enemy.mesh.position.clone() });
        hit = true;
        break;
      }
    }

    if (hit || arrow.traveled >= arrow.maxDist) {
      scene.remove(arrow.mesh);
      arrows.splice(i, 1);
    }
  }
  return events;
}
