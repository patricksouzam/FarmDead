import * as THREE from 'three';
import {
  buildLowPolyHumanoid, animateIdleHumanoid, animateWalkHumanoid, animateJumpHumanoid
} from './characters.js';
import { avoidObstacles, resolveMovement, getActivePlayBounds } from './world.js';

export const PLAYER_SPEED = 4.6;
export const PLAYER_SPRINT_MULT = 1.55;
export const PLAYER_INTERACT_RANGE = 2.8;
export const WALK_ENERGY_DIST = 28;
export const SPRINT_ENERGY_DIST = 16;
export const CAM_DIST_MIN = 7;
export const CAM_DIST_MAX = 22;
export const CAM_DIST_DEFAULT = 12;
export const PLAYER_JUMP_FORCE = 7.2;
export const PLAYER_GRAVITY = 22;

export function createPlayer(scene, spawn = { x: 0, z: -4 }) {
  const mesh = buildLowPolyHumanoid({
    shirt: 0xc45c26,
    pants: 0x3d4a5c,
    skin: 0xe8b890,
    accessory: 'cap',
    hatColor: 0x2d6a4f,
    pose: 'standing',
    overalls: false
  });
  mesh.position.set(spawn.x, 0, spawn.z);
  mesh.userData.isPlayer = true;
  scene.add(mesh);

  return {
    mesh,
    keys: { forward: false, back: false, left: false, right: false, sprint: false, jump: false },
    yaw: 0,
    walkAccum: 0,
    moveSpeed: 0,
    animTime: 0,
    vy: 0,
    onGround: true,
    cameraYaw: 0,
    cameraPitch: 0.42,
    cameraDist: CAM_DIST_DEFAULT,
    dragging: false,
    lastPointerX: 0,
    lastPointerY: 0
  };
}

export function bindPlayerInput(player, canvas) {
  const onKey = (down) => (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') player.keys.forward = down;
    if (k === 's' || k === 'arrowdown') player.keys.back = down;
    if (k === 'a' || k === 'arrowleft') player.keys.left = down;
    if (k === 'd' || k === 'arrowright') player.keys.right = down;
    if (k === 'shift') player.keys.sprint = down;
    if (k === ' ' || k === 'spacebar') {
      if (down) e.preventDefault();
      player.keys.jump = down;
    }
  };
  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 2 && e.button !== 1) return;
    player.dragging = true;
    player.lastPointerX = e.clientX;
    player.lastPointerY = e.clientY;
  });
  window.addEventListener('pointerup', () => { player.dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!player.dragging) return;
    const dx = e.clientX - player.lastPointerX;
    const dy = e.clientY - player.lastPointerY;
    player.lastPointerX = e.clientX;
    player.lastPointerY = e.clientY;
    player.cameraYaw -= dx * 0.005;
    player.cameraPitch = THREE.MathUtils.clamp(player.cameraPitch + dy * 0.004, 0.15, 1.1);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    player.cameraDist = THREE.MathUtils.clamp(
      player.cameraDist + Math.sign(e.deltaY) * 0.85,
      CAM_DIST_MIN,
      CAM_DIST_MAX
    );
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function updatePlayerMovement(player, delta, onWalkDistance) {
  const { keys, mesh } = player;
  let mx = 0;
  let mz = 0;
  if (keys.forward) mz -= 1;
  if (keys.back) mz += 1;
  if (keys.left) mx -= 1;
  if (keys.right) mx += 1;

  // Salto (Espaço) — só no chão; impulso único por pressão
  if (keys.jump && player.onGround) {
    player.vy = PLAYER_JUMP_FORCE;
    player.onGround = false;
    keys.jump = false;
  }

  player.vy -= PLAYER_GRAVITY * delta;
  mesh.position.y += player.vy * delta;
  if (mesh.position.y <= 0) {
    mesh.position.y = 0;
    player.vy = 0;
    player.onGround = true;
  }

  const wantingMove = mx !== 0 || mz !== 0;
  const targetSpeed = wantingMove
    ? (keys.sprint ? PLAYER_SPEED * PLAYER_SPRINT_MULT : PLAYER_SPEED)
    : 0;
  const accel = wantingMove ? 12 : 16;
  player.moveSpeed = THREE.MathUtils.damp(player.moveSpeed, targetSpeed, accel, delta);
  player.animTime = (player.animTime || 0) + delta;

  const moving = player.moveSpeed > 0.08;
  if (moving && wantingMove) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len;
    mz /= len;

    const cos = Math.cos(player.cameraYaw);
    const sin = Math.sin(player.cameraYaw);
    const worldX = mx * cos + mz * sin;
    const worldZ = -mx * sin + mz * cos;

    const dist = player.moveSpeed * delta;
    const nextX = mesh.position.x + worldX * dist;
    const nextZ = mesh.position.z + worldZ * dist;
    const cleared = resolveMovement(mesh.position.x, mesh.position.z, nextX, nextZ, 0.42);
    const bounds = getActivePlayBounds();
    mesh.position.x = THREE.MathUtils.clamp(cleared.x, bounds.minX, bounds.maxX);
    mesh.position.z = THREE.MathUtils.clamp(cleared.z, bounds.minZ, bounds.maxZ);

    mesh.rotation.y = Math.atan2(worldX, worldZ);

    const energyStep = keys.sprint ? SPRINT_ENERGY_DIST : WALK_ENERGY_DIST;
    player.walkAccum += dist;
    if (player.walkAccum >= energyStep) {
      player.walkAccum -= energyStep;
      if (onWalkDistance) onWalkDistance(keys.sprint ? 2 : 1);
    }
  } else if (!moving) {
    player.moveSpeed = 0;
  }

  if (!player.onGround) {
    animateJumpHumanoid(mesh, player.vy);
  } else if (moving) {
    animateWalkHumanoid(mesh, player.animTime, player.moveSpeed);
  } else {
    animateIdleHumanoid(mesh, player.animTime);
  }

  return moving;
}

export function updateFollowCamera(camera, player, controls) {
  if (controls) {
    controls.enabled = false;
  }
  const dist = player.cameraDist ?? CAM_DIST_DEFAULT;
  const py = player.mesh.position.y;
  const height = Math.sin(player.cameraPitch) * dist + 2.5;
  const flat = Math.cos(player.cameraPitch) * dist;
  const px = player.mesh.position.x;
  const pz = player.mesh.position.z;
  camera.position.set(
    px + Math.sin(player.cameraYaw) * flat,
    height + 1.2 + py,
    pz + Math.cos(player.cameraYaw) * flat
  );
  camera.lookAt(px, 1.2 + py, pz);
  if (controls) {
    controls.target.set(px, 1.0 + py, pz);
  }
}

export function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function isInRange(playerPos, targetPos, range = PLAYER_INTERACT_RANGE) {
  return distanceXZ(playerPos, targetPos) <= range;
}

export function nearestInRange(playerPos, candidates, range = PLAYER_INTERACT_RANGE) {
  let best = null;
  let bestDist = range;
  for (const c of candidates) {
    if (!c || !c.position) continue;
    if (c.visible === false) continue;
    const d = distanceXZ(playerPos, c.position);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export function setPlayerPosition(player, x, z) {
  const cleared = avoidObstacles(x, z, 0.42);
  const bounds = getActivePlayBounds();
  player.mesh.position.set(
    THREE.MathUtils.clamp(cleared.x, bounds.minX, bounds.maxX),
    0,
    THREE.MathUtils.clamp(cleared.z, bounds.minZ, bounds.maxZ)
  );
  player.vy = 0;
  player.onGround = true;
}
