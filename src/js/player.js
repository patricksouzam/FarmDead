import * as THREE from 'three';
import {
  buildLowPolyHumanoid, animateIdleHumanoid, animateWalkHumanoid, animateJumpHumanoid
} from './characters.js';
import { avoidObstacles, resolveMovement, resolveEntityBump, getActivePlayBounds, getGroundHeightAt } from './world.js';
import { getCurrentArea } from './areas.js';
import { getPlayerSpawn } from './mapLoader.js';

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
export const PLAYER_EYE_HEIGHT = 1.58;
export const LOOK_SENSITIVITY = 0.00245;
export const LOOK_SMOOTH = 48;

export function createPlayer(scene, spawn = getPlayerSpawn()) {
  const mesh = buildLowPolyHumanoid({
    shirt: 0xc45c26,
    pants: 0x3d4a5c,
    skin: 0xe8b890,
    accessory: 'cap',
    hatColor: 0x2d6a4f,
    pose: 'standing',
    overalls: false
  });
  mesh.position.set(spawn.x, getGroundHeightAt(spawn.x, spawn.z, getCurrentArea()), spawn.z);
  mesh.userData.isPlayer = true;
  mesh.visible = false;
  scene.add(mesh);

  return {
    mesh,
    keys: { forward: false, back: false, left: false, right: false, sprint: false, jump: false, crouch: false, aim: false },
    yaw: 0,
    walkAccum: 0,
    moveSpeed: 0,
    animTime: 0,
    vy: 0,
    onGround: true,
    cameraYaw: 0,
    cameraPitch: 0,
    lookYaw: 0,
    lookPitch: 0,
    cameraDist: CAM_DIST_DEFAULT,
    dragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    attackCooldownUntil: 0,
    rangedCooldownUntil: 0,
    lastDamageTime: 0,
    pointerLocked: false,
    flashlight: null,
    viewmodel: null,
    crouched: false,
    aiming: false,
    reloading: false,
    reloadUntil: 0,
    eyeHeight: PLAYER_EYE_HEIGHT,
    fov: 75,
    coyote: 0,
    jumpBuffer: 0,
    sprintFactor: 0,
    landDip: 0,
    wasOnGround: true,
    justLanded: false,
    stepEvent: false,
    stepPhase: 0,
    headBob: 0,
    lastStepSign: 0
  };
}

export function attachFirstPerson(scene, camera, player) {
  camera.fov = 75;
  camera.near = 0.06;
  camera.far = 500;
  camera.rotation.order = 'YXZ';
  camera.updateProjectionMatrix();
  scene.add(camera);

  const flashlight = new THREE.SpotLight(0xffe6b8, 5.6, 34, 0.42, 0.32, 1.0);
  flashlight.position.set(0.12, -0.05, 0.08);
  const target = new THREE.Object3D();
  target.position.set(0.08, -0.12, -1);
  camera.add(flashlight);
  camera.add(target);
  flashlight.target = target;

  const fill = new THREE.PointLight(0xffefc8, 0.55, 5.5, 2);
  fill.position.set(0.1, -0.05, -0.2);
  camera.add(fill);

  player.flashlight = flashlight;
  player.flashFill = fill;
}

export function bindPlayerInput(player, canvas) {
  const onKey = (down) => (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') player.keys.forward = down;
    if (k === 's' || k === 'arrowdown') player.keys.back = down;
    if (k === 'a' || k === 'arrowleft') player.keys.left = down;
    if (k === 'd' || k === 'arrowright') player.keys.right = down;
    if (k === 'shift') player.keys.sprint = down;
    if (k === 'control') player.keys.crouch = down;
    if (k === ' ' || k === 'spacebar') {
      if (down) e.preventDefault();
      player.keys.jump = down;
    }
  };
  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));

  const onLockChange = () => {
    player.pointerLocked = document.pointerLockElement === canvas;
  };
  document.addEventListener('pointerlockchange', onLockChange);

  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    player.lookYaw -= (e.movementX || 0) * LOOK_SENSITIVITY;
    player.lookPitch = THREE.MathUtils.clamp(
      player.lookPitch - (e.movementY || 0) * LOOK_SENSITIVITY,
      -1.25,
      1.25
    );
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) player.keys.aim = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) player.keys.aim = false;
  });
}

export function requestPlayerPointerLock(canvas) {
  if (document.pointerLockElement === canvas) return;
  const lock = canvas.requestPointerLock?.bind(canvas);
  if (!lock) return;
  try {
    lock({ unadjustedMovement: true });
  } catch {
    lock();
  }
}

function dampAngle(current, target, lambda, dt) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function updateLookSmoothing(player, delta) {
  const dt = Math.min(Math.max(delta || 1 / 60, 0.001), 0.05);
  player.cameraYaw = dampAngle(player.cameraYaw, player.lookYaw ?? player.cameraYaw, LOOK_SMOOTH, dt);
  player.cameraPitch = THREE.MathUtils.damp(
    player.cameraPitch,
    player.lookPitch ?? player.cameraPitch,
    LOOK_SMOOTH,
    dt
  );
}

export function exitPlayerPointerLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}

export function updatePlayerMovement(player, delta, onWalkDistance, entities = [], opts = {}) {
  const { keys, mesh } = player;
  let mx = 0;
  let mz = 0;
  if (keys.forward) mz -= 1;
  if (keys.back) mz += 1;
  if (keys.left) mx -= 1;
  if (keys.right) mx += 1;

  player.justLanded = false;
  player.stepEvent = false;
  player.crouched = !!keys.crouch && (player.onGround || (player.coyote || 0) > 0);
  player.aiming = !!keys.aim && !player.crouched;

  const COYOTE = 0.12;
  const JUMP_BUFFER = 0.1;
  if (keys.jump) player.jumpBuffer = JUMP_BUFFER;
  else player.jumpBuffer = Math.max(0, (player.jumpBuffer || 0) - delta);

  if (player.onGround) player.coyote = COYOTE;
  else player.coyote = Math.max(0, (player.coyote || 0) - delta);

  const canJump = (player.onGround || (player.coyote || 0) > 0) && !player.crouched;
  if ((player.jumpBuffer || 0) > 0 && canJump) {
    player.vy = PLAYER_JUMP_FORCE;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    keys.jump = false;
  }

  const wantingMove = mx !== 0 || mz !== 0;
  const energyRatio = THREE.MathUtils.clamp(opts.energyRatio ?? 1, 0.35, 1);
  let speed = PLAYER_SPEED * (0.72 + 0.28 * energyRatio);
  if (player.crouched) speed *= 0.48;
  else if (player.aiming) speed *= 0.52;
  else if (keys.sprint && !player.aiming && !player.crouched) {
    player.sprintFactor = THREE.MathUtils.damp(player.sprintFactor || 0, 1, 7, delta);
  }
  if (!(keys.sprint && !player.aiming && !player.crouched)) {
    player.sprintFactor = THREE.MathUtils.damp(player.sprintFactor || 0, 0, 10, delta);
  }
  speed *= 1 + (PLAYER_SPRINT_MULT - 1) * (player.sprintFactor || 0);

  const targetSpeed = wantingMove ? speed : 0;
  const onGround = !!player.onGround;
  const accel = !onGround
    ? (wantingMove ? 4.2 : 2.4)
    : (wantingMove ? 16 : 14);
  player.moveSpeed = THREE.MathUtils.damp(player.moveSpeed, targetSpeed, accel, delta);
  player.animTime = (player.animTime || 0) + delta;
  updateLookSmoothing(player, delta);

  const radius = player.crouched ? 0.26 : 0.32;
  const moving = player.moveSpeed > 0.08;
  const airControl = onGround ? 1 : 0.35;
  if (moving && wantingMove) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len;
    mz /= len;

    const cos = Math.cos(player.cameraYaw);
    const sin = Math.sin(player.cameraYaw);
    const worldX = mx * cos + mz * sin;
    const worldZ = -mx * sin + mz * cos;

    const dist = player.moveSpeed * delta * airControl;
    const nextX = mesh.position.x + worldX * dist;
    const nextZ = mesh.position.z + worldZ * dist;
    let cleared = resolveMovement(mesh.position.x, mesh.position.z, nextX, nextZ, radius);
    cleared = resolveEntityBump(cleared.x, cleared.z, radius, entities);
    const bounds = getActivePlayBounds();
    mesh.position.x = THREE.MathUtils.clamp(cleared.x, bounds.minX, bounds.maxX);
    mesh.position.z = THREE.MathUtils.clamp(cleared.z, bounds.minZ, bounds.maxZ);

    const energyStep = (player.sprintFactor || 0) > 0.4 && !player.crouched ? SPRINT_ENERGY_DIST : WALK_ENERGY_DIST;
    player.walkAccum += dist;
    if (player.walkAccum >= energyStep) {
      player.walkAccum -= energyStep;
      if (onWalkDistance) onWalkDistance((player.sprintFactor || 0) > 0.4 && !player.crouched ? 2 : 1);
    }

    if (onGround) {
      const step = player.animTime * (6.4 + Math.min(player.moveSpeed / 3.6, 1.2) * 1.2);
      const sign = Math.sin(step) >= 0 ? 1 : -1;
      if (player.lastStepSign && sign !== player.lastStepSign) player.stepEvent = true;
      player.lastStepSign = sign;
      player.stepPhase = step;
    }
  } else if (!moving) {
    player.moveSpeed = 0;
    player.lastStepSign = 0;
  }

  mesh.rotation.y = player.cameraYaw + Math.PI;

  const groundY = getGroundHeightAt(mesh.position.x, mesh.position.z, getCurrentArea());
  player.vy -= PLAYER_GRAVITY * delta;
  mesh.position.y += player.vy * delta;
  const stepHeight = 0.55;
  const withinAutoStep = mesh.position.y <= groundY + stepHeight && player.vy <= 0.15;
  if (mesh.position.y <= groundY || (withinAutoStep && (onGround || player.vy <= 0))) {
    const landVy = player.vy;
    if (!player.onGround && landVy < -2.2) {
      player.justLanded = true;
      player.landDip = Math.min(0.22, 0.06 + Math.abs(landVy) * 0.012);
    }
    const snap = THREE.MathUtils.damp(mesh.position.y, groundY, 22, delta);
    mesh.position.y = mesh.position.y < groundY ? groundY : (Math.abs(mesh.position.y - groundY) < 0.04 ? groundY : snap);
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
  player.wasOnGround = player.onGround;
  player.landDip = Math.max(0, (player.landDip || 0) - delta * 1.8);

  const targetEye = player.crouched ? 0.92 : PLAYER_EYE_HEIGHT;
  player.eyeHeight = THREE.MathUtils.damp(player.eyeHeight || PLAYER_EYE_HEIGHT, targetEye, 12, delta);

  if (!player.onGround) {
    animateJumpHumanoid(mesh, player.vy);
  } else if (moving) {
    animateWalkHumanoid(mesh, player.animTime, player.moveSpeed);
  } else {
    animateIdleHumanoid(mesh, player.animTime);
  }

  return moving;
}

export function updateFollowCamera(camera, player, controls, delta = 1 / 60) {
  if (controls) controls.enabled = false;
  updateLookSmoothing(player, delta);
  const px = player.mesh.position.x;
  const py = player.mesh.position.y;
  const pz = player.mesh.position.z;

  const aiming = !!player.aiming;
  const moving = (player.moveSpeed || 0) > 0.12 && player.onGround;
  const bobAmp = aiming ? 0 : (player.crouched ? 0.012 : 0.022) * Math.min(1, (player.moveSpeed || 0) / PLAYER_SPEED);
  const bobSpeed = player.stepPhase || player.animTime * 8;
  player.headBob = moving ? Math.sin(bobSpeed * 2) * bobAmp : THREE.MathUtils.damp(player.headBob || 0, 0, 10, delta);
  const land = player.landDip || 0;

  camera.position.set(px, py + (player.eyeHeight || PLAYER_EYE_HEIGHT) + (player.headBob || 0) - land, pz);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.cameraYaw;
  camera.rotation.x = player.cameraPitch + (moving && !aiming ? Math.sin(bobSpeed) * bobAmp * 0.35 : 0);
  camera.rotation.z = aiming ? 0.008 : (player.crouched ? 0.018 : (moving ? Math.sin(bobSpeed) * bobAmp * 0.4 : 0));
  const targetFov = player.aiming ? 54 : (player.sprintFactor > 0.5 ? 78 : 75);
  player.fov = THREE.MathUtils.damp(player.fov || 75, targetFov, 10, delta);
  if (Math.abs(camera.fov - player.fov) > 0.05) {
    camera.fov = player.fov;
    camera.updateProjectionMatrix();
  }
  if (controls) {
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    controls.target.set(px + look.x, py + PLAYER_EYE_HEIGHT + look.y, pz + look.z);
  }
}

export function getLookDirection(player, camera) {
  if (camera) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return dir;
  }
  const pitch = player.cameraPitch || 0;
  const yaw = player.cameraYaw || 0;
  const cp = Math.cos(pitch);
  return new THREE.Vector3(-Math.sin(yaw) * cp, -Math.sin(pitch), -Math.cos(yaw) * cp);
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
  const cleared = avoidObstacles(x, z, 0.32);
  const bounds = getActivePlayBounds();
  const clampedX = THREE.MathUtils.clamp(cleared.x, bounds.minX, bounds.maxX);
  const clampedZ = THREE.MathUtils.clamp(cleared.z, bounds.minZ, bounds.maxZ);
  const groundY = getGroundHeightAt(clampedX, clampedZ, getCurrentArea());
  player.mesh.position.set(clampedX, groundY, clampedZ);
  player.vy = 0;
  player.onGround = true;
}
