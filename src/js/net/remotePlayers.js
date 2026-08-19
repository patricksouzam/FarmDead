import * as THREE from 'three';
import { buildLowPolyHumanoid, animateIdleHumanoid, animateWalkHumanoid, animateJumpHumanoid } from '../characters.js';
import { createPlayer } from '../player.js';
import { createGameState } from '../gameState.js';
import { getGroundHeightAt } from '../world.js';
import { getCurrentArea } from '../areas.js';
import { NET_SEND_INTERVAL } from './protocol.js';

const PALETTES = [
  { shirt: 0xc45c26, pants: 0x3d4a5c, hat: 0x2d6a4f, skin: 0xe8b890 },
  { shirt: 0x2d6aa8, pants: 0x2a3038, hat: 0xc9a227, skin: 0xe8b890 },
  { shirt: 0x7a3a8a, pants: 0x2a3038, hat: 0xd4d4d4, skin: 0xe8b890 },
  { shirt: 0x3a7a3a, pants: 0x3d2a1a, hat: 0xc45c26, skin: 0xe8b890 }
];

const hosted = new Map();
const interp = new Map();

function paletteFor(id) {
  return PALETTES[(id || 0) % PALETTES.length];
}

function recolorAvatar(mesh, palette) {
  mesh.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (!m.color) return;
      const hsl = { h: 0, s: 0, l: 0 };
      m.color.getHSL(hsl);
      if (hsl.s < 0.28 && hsl.l > 0.45) m.color.setHex(palette.skin);
      else if (hsl.l < 0.28) m.color.setHex(palette.pants);
      else m.color.setHex(palette.shirt);
    });
  });
}

function addNameTag(mesh, id) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, 0, 160, 32);
  ctx.fillStyle = '#eef3fb';
  ctx.font = '700 16px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(id === 0 ? 'Host' : `Amigo ${id + 1}`, 80, 16);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
  sprite.scale.set(1.15, 0.23, 1);
  sprite.position.set(0, 2.15, 0);
  mesh.add(sprite);
  return sprite;
}

function createBag() {
  const g = createGameState();
  return {
    playerHealth: g.playerHealth,
    playerMaxHealth: g.playerMaxHealth,
    energy: g.energy,
    maxEnergy: g.maxEnergy,
    hunger: g.hunger,
    maxHunger: g.maxHunger,
    thirst: g.thirst,
    maxThirst: g.maxThirst,
    bleeding: false,
    infected: false,
    ammo: { ...g.ammo },
    mag: { ...g.mag },
    weaponsOwned: [],
    equippedWeapon: 'fists',
    bandages: g.bandages,
    cannedFood: g.cannedFood,
    bottledWater: g.bottledWater
  };
}

export function createHostedRemote(scene, id, spawn) {
  removeRemote(id);
  const player = createPlayer(scene, spawn);
  player.mesh.visible = true;
  recolorAvatar(player.mesh, paletteFor(id));
  addNameTag(player.mesh, id);
  player.netId = id;
  const remote = { id, player, bag: createBag(), lastDamageTime: 0 };
  hosted.set(id, remote);
  return remote;
}

export function getHostedRemote(id) {
  return hosted.get(id);
}

export function forEachHostedRemote(fn) {
  hosted.forEach(fn);
}

export function hostedRemoteList() {
  return [...hosted.values()];
}

function createInterpMesh(scene, id, spawn) {
  const pal = paletteFor(id);
  const mesh = buildLowPolyHumanoid({
    shirt: pal.shirt,
    pants: pal.pants,
    skin: pal.skin,
    accessory: 'cap',
    hatColor: pal.hat,
    pose: 'standing',
    overalls: false
  });
  const groundY = getGroundHeightAt(spawn.x, spawn.z, getCurrentArea());
  mesh.position.set(spawn.x, spawn.y ?? groundY, spawn.z);
  mesh.visible = true;
  addNameTag(mesh, id);
  scene.add(mesh);
  return mesh;
}

export function upsertInterpRemote(scene, snap) {
  let remote = interp.get(snap.id);
  if (!remote) {
    const mesh = createInterpMesh(scene, snap.id, snap);
    remote = {
      id: snap.id,
      mesh,
      from: { x: snap.x, y: snap.y, z: snap.z, yaw: snap.yaw || 0 },
      to: { x: snap.x, y: snap.y, z: snap.z, yaw: snap.yaw || 0 },
      t: 1,
      speed: 0,
      crouched: false,
      airborne: false,
      animTime: 0
    };
    interp.set(snap.id, remote);
  }
  const pos = remote.mesh.position;
  remote.from = { x: pos.x, y: pos.y, z: pos.z, yaw: remote.mesh.rotation.y - Math.PI };
  remote.to = { x: snap.x, y: snap.y, z: snap.z, yaw: snap.yaw || 0 };
  remote.t = 0;
  remote.speed = snap.speed || 0;
  remote.crouched = !!snap.crouched;
  remote.airborne = !!snap.airborne;
  return remote;
}

export function pruneInterpRemotes(keepIds) {
  const keep = new Set(keepIds);
  for (const [id, remote] of interp) {
    if (keep.has(id)) continue;
    if (remote.mesh?.parent) remote.mesh.parent.remove(remote.mesh);
    interp.delete(id);
  }
}

export function updateInterpRemotes(dt) {
  const step = NET_SEND_INTERVAL > 0 ? dt / NET_SEND_INTERVAL : 1;
  interp.forEach(remote => {
    remote.t = Math.min(1, remote.t + step);
    const t = remote.t;
    const a = remote.from;
    const b = remote.to;
    remote.mesh.position.x = a.x + (b.x - a.x) * t;
    remote.mesh.position.y = a.y + (b.y - a.y) * t;
    remote.mesh.position.z = a.z + (b.z - a.z) * t;
    let dyaw = b.yaw - a.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    remote.mesh.rotation.y = a.yaw + dyaw * t + Math.PI;
    remote.animTime += dt;
    if (remote.airborne) animateJumpHumanoid(remote.mesh, 1);
    else if (remote.speed > 0.12) animateWalkHumanoid(remote.mesh, remote.animTime, remote.speed);
    else animateIdleHumanoid(remote.mesh, remote.animTime);
  });
}

export function getRemoteBumpEntities(excludeId) {
  const list = [];
  hosted.forEach(remote => {
    if (remote.id === excludeId) return;
    const p = remote.player.mesh.position;
    list.push({ x: p.x, z: p.z, radius: remote.player.crouched ? 0.26 : 0.34 });
  });
  interp.forEach(remote => {
    if (remote.id === excludeId) return;
    const p = remote.mesh.position;
    list.push({ x: p.x, z: p.z, radius: remote.crouched ? 0.26 : 0.34 });
  });
  return list;
}

export function removeRemote(id) {
  const host = hosted.get(id);
  if (host) {
    if (host.player.mesh?.parent) host.player.mesh.parent.remove(host.player.mesh);
    hosted.delete(id);
  }
  const remote = interp.get(id);
  if (remote) {
    if (remote.mesh?.parent) remote.mesh.parent.remove(remote.mesh);
    interp.delete(id);
  }
}

export function clearAllRemotes() {
  for (const id of [...hosted.keys()]) removeRemote(id);
  for (const id of [...interp.keys()]) removeRemote(id);
}
