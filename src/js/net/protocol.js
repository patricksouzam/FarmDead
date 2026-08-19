export const NET_TICK_HZ = 15;
export const NET_SEND_INTERVAL = 1 / NET_TICK_HZ;
export const NET_MAX_PLAYERS = 4;
export const NET_DEFAULT_PORT = 7777;
export const NET_HOST_PLAYER_ID = 0;

export const MSG = {
  HELLO: 'hello',
  WELCOME: 'welcome',
  INPUT: 'input',
  INTENT: 'intent',
  SNAPSHOT: 'snapshot',
  EVENT: 'event'
};

export function preferredHostIp(ips = []) {
  const radmin = ips.find(ip => ip.radmin);
  return (radmin || ips[0])?.address || '127.0.0.1';
}

export function spawnOffsetFor(playerId, base) {
  const angle = (playerId || 0) * 1.2;
  return {
    x: base.x + Math.cos(angle) * 1.7,
    z: base.z + Math.sin(angle) * 1.7
  };
}

export function packInput(player, seq) {
  const keys = player.keys || {};
  return {
    t: MSG.INPUT,
    seq,
    keys: {
      f: !!keys.forward,
      b: !!keys.back,
      l: !!keys.left,
      r: !!keys.right,
      s: !!keys.sprint,
      j: !!keys.jump,
      c: !!keys.crouch,
      a: !!keys.aim,
      fl: !!player.flashlightOn
    },
    yaw: player.lookYaw ?? player.cameraYaw ?? 0,
    pitch: player.lookPitch ?? player.cameraPitch ?? 0
  };
}

export function applyPackedKeys(player, packed) {
  if (!player?.keys || !packed) return;
  player.keys.forward = !!packed.f;
  player.keys.back = !!packed.b;
  player.keys.left = !!packed.l;
  player.keys.right = !!packed.r;
  player.keys.sprint = !!packed.s;
  player.keys.jump = !!packed.j;
  player.keys.crouch = !!packed.c;
  player.keys.aim = !!packed.a;
  if (packed.fl != null) player.flashlightOn = !!packed.fl;
}

export function packPlayerSnapshot(id, player, bag) {
  const pos = player.mesh.position;
  return {
    id,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    yaw: player.cameraYaw || 0,
    pitch: player.cameraPitch || 0,
    speed: player.moveSpeed || 0,
    crouched: !!player.crouched,
    flashlightOn: !!player.flashlightOn,
    noiseRadius: player.noiseRadius || 0,
    airborne: !player.onGround,
    attacking: !!(player.meleeSwing || (player.attackCooldownUntil && Date.now() < player.attackCooldownUntil)),
    hp: bag.playerHealth,
    maxHp: bag.playerMaxHealth,
    energy: bag.energy,
    hunger: bag.hunger,
    thirst: bag.thirst,
    bleeding: !!bag.bleeding,
    infected: !!bag.infected,
    weapon: bag.equippedWeapon || 'fists',
    mag: bag.mag ? { ...bag.mag } : {},
    ammo: bag.ammo ? { ...bag.ammo } : {},
    weaponsOwned: bag.weaponsOwned ? [...bag.weaponsOwned] : []
  };
}

export function packEnemySnapshot(enemy) {
  const pos = enemy.mesh.position;
  return {
    id: enemy.id,
    type: enemy.type,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    yaw: enemy.mesh.rotation.y,
    state: enemy.state,
    hp: enemy.hp,
    maxHp: enemy.maxHp
  };
}

export function applyVitalsToBag(bag, snap) {
  if (!bag || !snap) return;
  if (snap.hp != null) bag.playerHealth = snap.hp;
  if (snap.maxHp != null) bag.playerMaxHealth = snap.maxHp;
  if (snap.energy != null) bag.energy = snap.energy;
  if (snap.hunger != null) bag.hunger = snap.hunger;
  if (snap.thirst != null) bag.thirst = snap.thirst;
  if (snap.bleeding != null) bag.bleeding = snap.bleeding;
  if (snap.infected != null) bag.infected = snap.infected;
  if (snap.weapon) bag.equippedWeapon = snap.weapon;
  if (snap.mag) bag.mag = { ...bag.mag, ...snap.mag };
  if (snap.ammo) bag.ammo = { ...bag.ammo, ...snap.ammo };
  if (snap.weaponsOwned) bag.weaponsOwned = [...snap.weaponsOwned];
}
