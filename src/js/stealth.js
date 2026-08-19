import { segmentBlocked } from './world.js';

export const VISION_RANGE = 13.5;
export const VISION_RANGE_FLASHLIGHT = 18;
export const VISION_FOV = 1.22;
export const HEAR_RANGE_CROUCH = 1.6;
export const HEAR_RANGE_WALK = 5.5;
export const HEAR_RANGE_SPRINT = 11;
export const HEAR_RANGE_GUNSHOT = 26;
export const HEAR_THROUGH_WALL_MUL = 0.55;
export const COVER_BLOCK_RADIUS = 0.7;
export const CHASE_MEMORY = 2.4;
export const INVESTIGATE_DURATION = 7.2;
export const AWARENESS_DECAY = 0.22;
export const AWARENESS_HEAR = 0.52;
export const AWARENESS_SEEN = 1;
export const ALERT_QUESTION = 0.32;
export const ALERT_BANG = 0.74;
export const NOISE_PULSE_DECAY = 14;
export const HUD_AWARENESS_RANGE = 24;

const HALF_FOV_COS = Math.cos(VISION_FOV * 0.5);

export function emitNoise(actor, radius = HEAR_RANGE_GUNSHOT) {
  if (!actor) return;
  actor.noisePulse = Math.max(actor.noisePulse || 0, radius);
}

export function tickActorNoise(actor, delta) {
  if (!actor) return 0;
  const pulse = actor.noisePulse || 0;
  if (pulse > 0) {
    actor.noisePulse = Math.max(0, pulse - NOISE_PULSE_DECAY * delta);
  }
  const moving = (actor.moveSpeed || 0) > 0.12 && actor.onGround !== false;
  let gait = 0;
  if (moving) {
    if (actor.crouched) gait = HEAR_RANGE_CROUCH;
    else if ((actor.sprintFactor || 0) > 0.4) gait = HEAR_RANGE_SPRINT;
    else gait = HEAR_RANGE_WALK;
  }
  actor.noiseRadius = Math.max(gait, actor.noisePulse || 0);
  return actor.noiseRadius;
}

function facingDot(enemy, tx, tz) {
  const mesh = enemy.mesh;
  const dx = tx - mesh.position.x;
  const dz = tz - mesh.position.z;
  const dist = Math.hypot(dx, dz) || 1;
  const fx = Math.sin(mesh.rotation.y);
  const fz = Math.cos(mesh.rotation.y);
  return { dist, dot: (fx * dx + fz * dz) / dist, dx, dz };
}

export function evaluateDetection(enemy, target, areaId) {
  if (!target?.pos) {
    return { seen: false, heard: false, dist: Infinity };
  }
  const pos = target.pos;
  const { dist, dot } = facingDot(enemy, pos.x, pos.z);
  const crouched = !!target.crouched;
  const flashlightOn = !!target.flashlightOn;
  const visionRange = flashlightOn ? VISION_RANGE_FLASHLIGHT : VISION_RANGE;
  const inCone = dist <= visionRange && dot >= HALF_FOV_COS;
  const blocked = segmentBlocked(
    enemy.mesh.position.x, enemy.mesh.position.z,
    pos.x, pos.z,
    areaId,
    { crouched, minBlockRadius: COVER_BLOCK_RADIUS }
  );
  const seen = inCone && !blocked;

  const noiseR = target.noiseRadius || 0;
  let heard = noiseR > 0 && dist <= noiseR;
  if (heard && blocked) {
    heard = dist <= noiseR * HEAR_THROUGH_WALL_MUL;
  }

  return { seen, heard, dist, blocked };
}

export function applyAwareness(enemy, sense, delta) {
  let awareness = enemy.awareness || 0;
  if (sense.seen) awareness = AWARENESS_SEEN;
  else if (sense.heard) awareness = Math.max(awareness, AWARENESS_HEAR);
  else awareness = Math.max(0, awareness - AWARENESS_DECAY * delta);
  enemy.awareness = awareness;
  return awareness;
}

export function alertTier(enemy) {
  if (enemy.state === 'chasing' || enemy.state === 'attacking') return 'bang';
  if (enemy.state === 'investigating') return 'question';
  const a = enemy.awareness || 0;
  if (a >= ALERT_BANG) return 'bang';
  if (a >= ALERT_QUESTION) return 'question';
  return 'none';
}

export function maxNearbyAwareness(enemies, playerPos, range = HUD_AWARENESS_RANGE) {
  let best = 0;
  for (const enemy of enemies) {
    if (!enemy || enemy.state === 'dead') continue;
    const dist = Math.hypot(
      playerPos.x - enemy.mesh.position.x,
      playerPos.z - enemy.mesh.position.z
    );
    if (dist > range) continue;
    const a = enemy.awareness || 0;
    const boosted = enemy.state === 'chasing' || enemy.state === 'attacking' ? Math.max(a, 0.92) : a;
    if (boosted > best) best = boosted;
  }
  return best;
}
