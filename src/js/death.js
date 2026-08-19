import * as THREE from 'three';
import { PLAYER_EYE_HEIGHT } from './player.js';

export const DEATH_HOLD_S = 2.2;
export const DEATH_FADE_S = 0.45;
export const DEATH_CAMERA_PITCH = 1.12;
export const DEATH_EYE_HEIGHT = 0.32;

const PHASE = {
  IDLE: 'idle',
  HOLD: 'hold',
  FADE_OUT: 'fadeOut',
  FADE_IN: 'fadeIn'
};

let phase = PHASE.IDLE;
let elapsed = 0;
let onApplyRespawn = null;

export function isPlayerDying() {
  return phase !== PHASE.IDLE;
}

function overlayEl() {
  return document.getElementById('death-overlay');
}

function fadeEl() {
  return document.getElementById('area-fade');
}

function setFade(opacity, ms) {
  const el = fadeEl();
  if (!el) return;
  el.style.transition = `opacity ${ms}ms ease`;
  void el.offsetWidth;
  el.style.opacity = String(opacity);
  el.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';
}

function showOverlay() {
  const el = overlayEl();
  if (!el) return;
  el.classList.remove('hidden');
  void el.offsetWidth;
  el.classList.add('active');
}

function hideOverlay() {
  const el = overlayEl();
  if (!el) return;
  el.classList.remove('active');
  el.classList.add('hidden');
}

function lockPlayer(player) {
  if (!player) return;
  player.controlsLocked = true;
  player.keys.forward = false;
  player.keys.back = false;
  player.keys.left = false;
  player.keys.right = false;
  player.keys.sprint = false;
  player.keys.jump = false;
  player.keys.crouch = false;
  player.keys.aim = false;
  player.moveSpeed = 0;
}

function unlockPlayer(player) {
  if (!player) return;
  player.controlsLocked = false;
  player.lookPitch = 0.12;
  player.cameraPitch = 0.12;
  player.eyeHeight = PLAYER_EYE_HEIGHT;
  player.landDip = 0;
}

export function startDeathSequence({ player, onApply } = {}) {
  if (isPlayerDying()) return false;
  phase = PHASE.HOLD;
  elapsed = 0;
  onApplyRespawn = typeof onApply === 'function' ? onApply : null;
  lockPlayer(player);
  showOverlay();
  setFade(0, 0);
  return true;
}

export function updateDeath(dt, player) {
  if (!isPlayerDying()) return false;

  const step = Math.min(Math.max(dt || 0, 0), 0.08);
  elapsed += step;

  if (player) {
    const pitchTarget = DEATH_CAMERA_PITCH;
    player.lookPitch = THREE.MathUtils.damp(player.lookPitch || 0, pitchTarget, 4.2, step);
    player.cameraPitch = THREE.MathUtils.damp(player.cameraPitch || 0, pitchTarget, 4.2, step);
    player.eyeHeight = THREE.MathUtils.damp(
      player.eyeHeight || PLAYER_EYE_HEIGHT,
      DEATH_EYE_HEIGHT,
      3.4,
      step
    );
  }

  if (phase === PHASE.HOLD && elapsed >= DEATH_HOLD_S) {
    phase = PHASE.FADE_OUT;
    elapsed = 0;
    setFade(1, DEATH_FADE_S * 1000);
    return false;
  }

  if (phase === PHASE.FADE_OUT && elapsed >= DEATH_FADE_S) {
    hideOverlay();
    if (onApplyRespawn) onApplyRespawn();
    onApplyRespawn = null;
    unlockPlayer(player);
    phase = PHASE.FADE_IN;
    elapsed = 0;
    setFade(0, DEATH_FADE_S * 1000);
    return false;
  }

  if (phase === PHASE.FADE_IN && elapsed >= DEATH_FADE_S) {
    phase = PHASE.IDLE;
    elapsed = 0;
    setFade(0, 0);
    return true;
  }

  return false;
}
