import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { getGroundHeightAt } from './world.js';
import { getCurrentArea } from './areas.js';
import { getMap } from './mapLoader.js';

export const WEAPON_DEFS = {
  fists: {
    id: 'fists', name: 'Punhos', kind: 'melee',
    damage: 8, cooldown: 450, range: 1.45, pellets: 1, collectible: false
  },
  taco: {
    id: 'taco', name: 'Taco de madeira', kind: 'melee',
    damage: 22, cooldown: 520, range: 1.95, pellets: 1, collectible: true
  },
  machado: {
    id: 'machado', name: 'Machado', kind: 'melee',
    damage: 36, cooldown: 700, range: 2.15, pellets: 1, collectible: true
  },
  pistola: {
    id: 'pistola', name: 'Pistola', kind: 'ranged',
    damage: 24, cooldown: 380, range: 22, pellets: 1, collectible: true
  },
  espingarda: {
    id: 'espingarda', name: 'Espingarda', kind: 'ranged',
    damage: 13, cooldown: 920, range: 11, pellets: 6, collectible: true
  }
};

export const COLLECTIBLE_WEAPON_IDS = Object.values(WEAPON_DEFS)
  .filter(w => w.collectible)
  .map(w => w.id);

const WEAPON_SPAWNS = [
  { id: 'taco', x: 12.6, z: -9.2 },
  { id: 'machado', x: -18.4, z: 6.2 },
  { id: 'pistola', x: -5.8, z: -14.4 },
  { id: 'espingarda', x: 18.2, z: 6.6 }
];

function getWeaponSpawns() {
  return getMap()?.weapons || WEAPON_SPAWNS;
}

export function getWeaponDef(id) {
  return WEAPON_DEFS[id] || WEAPON_DEFS.fists;
}

export function ownedWeapons(state) {
  const owned = Array.isArray(state.weaponsOwned) ? state.weaponsOwned : [];
  return ['fists', ...owned.filter(id => WEAPON_DEFS[id]?.collectible)];
}

export function buildWeaponMesh(id, scale = 1) {
  const g = new THREE.Group();
  if (id === 'taco') {
    const wood = voxelMat(0x8a5a32, { roughness: 0.85 });
    const grip = voxelBox(0.08 * scale, 0.08 * scale, 0.22 * scale, wood);
    grip.position.z = 0.08 * scale;
    g.add(grip);
    const bat = voxelBox(0.11 * scale, 0.11 * scale, 0.72 * scale, wood);
    bat.position.z = -0.38 * scale;
    g.add(bat);
    const tip = voxelBox(0.14 * scale, 0.14 * scale, 0.16 * scale, voxelMat(0x6b4226));
    tip.position.z = -0.78 * scale;
    g.add(tip);
  } else if (id === 'machado') {
    const haft = voxelBox(0.07 * scale, 0.07 * scale, 0.7 * scale, voxelMat(0x6b4428));
    haft.position.z = -0.22 * scale;
    g.add(haft);
    const head = voxelBox(0.42 * scale, 0.08 * scale, 0.22 * scale, voxelMat(0x8a93a0, { metalness: 0.45, roughness: 0.4 }));
    head.position.set(0.12 * scale, 0, -0.52 * scale);
    g.add(head);
    const edge = voxelBox(0.1 * scale, 0.04 * scale, 0.26 * scale, voxelMat(0xcfd6de, { metalness: 0.6, roughness: 0.28 }));
    edge.position.set(0.32 * scale, 0, -0.52 * scale);
    g.add(edge);
  } else if (id === 'pistola') {
    const metal = voxelMat(0x2a2e34, { metalness: 0.55, roughness: 0.4 });
    const slide = voxelBox(0.12 * scale, 0.1 * scale, 0.34 * scale, metal);
    slide.position.z = -0.12 * scale;
    g.add(slide);
    const barrel = voxelBox(0.07 * scale, 0.07 * scale, 0.18 * scale, voxelMat(0x1a1c20, { metalness: 0.6 }));
    barrel.position.z = -0.36 * scale;
    g.add(barrel);
    const grip = voxelBox(0.1 * scale, 0.22 * scale, 0.12 * scale, voxelMat(0x3a2a1c));
    grip.position.set(0, -0.14 * scale, 0.04 * scale);
    grip.rotation.x = 0.25;
    g.add(grip);
  } else if (id === 'espingarda') {
    const stock = voxelBox(0.1 * scale, 0.12 * scale, 0.28 * scale, voxelMat(0x5a3a22));
    stock.position.set(0, -0.04 * scale, 0.12 * scale);
    g.add(stock);
    const body = voxelBox(0.1 * scale, 0.1 * scale, 0.55 * scale, voxelMat(0x2c3036, { metalness: 0.4 }));
    body.position.z = -0.28 * scale;
    g.add(body);
    const barrel = voxelBox(0.07 * scale, 0.07 * scale, 0.42 * scale, voxelMat(0x1a1c22, { metalness: 0.55 }));
    barrel.position.z = -0.72 * scale;
    g.add(barrel);
    const pump = voxelBox(0.12 * scale, 0.09 * scale, 0.18 * scale, voxelMat(0x3d342c));
    pump.position.set(0, -0.08 * scale, -0.38 * scale);
    g.add(pump);
  } else {
    const skin = voxelMat(0xe8b890);
    const right = voxelBox(0.14 * scale, 0.12 * scale, 0.18 * scale, skin);
    right.position.set(0.08 * scale, 0, 0);
    g.add(right);
    const left = voxelBox(0.14 * scale, 0.12 * scale, 0.18 * scale, skin);
    left.position.set(-0.22 * scale, -0.04 * scale, 0.06 * scale);
    left.rotation.set(0.15, 0.2, -0.12);
    g.add(left);
  }
  g.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  return g;
}

function buildPickupGlow(color) {
  const light = new THREE.PointLight(color, 1.35, 5.5, 1.6);
  light.position.y = 0.35;
  return light;
}

export function spawnWeaponPickups(parent, ownedIds = []) {
  const pickups = [];
  const owned = new Set(ownedIds);
  for (const spawn of getWeaponSpawns()) {
    if (owned.has(spawn.id)) continue;
    const def = getWeaponDef(spawn.id);
    const group = new THREE.Group();
    const mesh = buildWeaponMesh(spawn.id, 1.35);
    mesh.rotation.x = -0.4;
    group.add(mesh);

    const glowColor = def.kind === 'ranged' ? 0xffc14a : 0x7ad0ff;
    const glow = voxelBox(0.55, 0.08, 0.55, voxelMat(glowColor, {
      emissive: glowColor, emissiveIntensity: 0.85, transparent: true, opacity: 0.55
    }));
    glow.position.y = 0.04;
    group.add(glow);
    group.add(buildPickupGlow(glowColor));

    const groundY = getGroundHeightAt(spawn.x, spawn.z, getCurrentArea());
    group.position.set(spawn.x, groundY, spawn.z);
    group.userData.isWeaponPickup = true;
    group.userData.weaponId = spawn.id;
    group.userData.baseY = groundY;
    group.userData.spin = Math.random() * Math.PI * 2;
    parent.add(group);
    pickups.push(group);
  }
  return pickups;
}

export function clearWeaponPickups(pickups) {
  pickups.forEach(p => {
    if (p.parent) p.parent.remove(p);
  });
  pickups.length = 0;
}

export function nearestWeaponPickup(playerPos, pickups, range = 2.2) {
  let best = null;
  let bestDist = range;
  for (const p of pickups) {
    if (!p.visible) continue;
    const d = Math.hypot(p.position.x - playerPos.x, p.position.z - playerPos.z);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function animateWeaponPickups(pickups, time) {
  for (const p of pickups) {
    p.rotation.y = time * 1.1 + (p.userData.spin || 0);
    p.position.y = (p.userData.baseY || 0) + 0.28 + Math.sin(time * 2.4 + p.userData.spin) * 0.1;
  }
}

export function createViewmodel(camera) {
  const root = new THREE.Group();
  root.name = 'viewmodel';
  camera.add(root);
  return {
    root,
    weaponId: null,
    mesh: null,
    kick: 0,
    bob: 0
  };
}

export function setViewmodelWeapon(viewmodel, weaponId) {
  if (viewmodel.mesh) viewmodel.root.remove(viewmodel.mesh);
  viewmodel.weaponId = weaponId;
  viewmodel.mesh = buildWeaponMesh(weaponId, 1);
  const def = getWeaponDef(weaponId);
  if (def.kind === 'ranged') {
    viewmodel.mesh.position.set(0.28, -0.24, -0.52);
    viewmodel.mesh.rotation.set(0.08, 0.08, 0.05);
  } else if (weaponId === 'fists') {
    viewmodel.mesh.position.set(0.18, -0.3, -0.5);
    viewmodel.mesh.rotation.set(0.18, 0.1, 0.06);
  } else {
    viewmodel.mesh.position.set(0.34, -0.28, -0.58);
    viewmodel.mesh.rotation.set(0.55, 0.15, 0.35);
  }
  viewmodel.root.add(viewmodel.mesh);
}

export function kickViewmodel(viewmodel, amount = 1) {
  viewmodel.kick = Math.max(viewmodel.kick, amount);
}

export function updateViewmodel(viewmodel, delta, moving, attacking, flags = {}) {
  if (!viewmodel?.root) return;
  const aiming = !!flags.aiming;
  const reloading = !!flags.reloading;
  const crouched = !!flags.crouched;
  const airborne = !!flags.airborne;
  const sprinting = !!flags.sprinting;
  const landDip = flags.landDip || 0;
  const bobRate = moving && !aiming ? (sprinting ? 11.2 : 8.5) : 2.2;
  viewmodel.bob += delta * bobRate;
  viewmodel.kick = Math.max(0, viewmodel.kick - delta * 5.2);
  const bobMul = aiming ? 0.12 : (sprinting ? 1.35 : 1);
  const bobX = Math.sin(viewmodel.bob) * (moving ? 0.022 : 0.007) * bobMul;
  const bobY = Math.abs(Math.cos(viewmodel.bob)) * (moving ? 0.018 : 0.006) * bobMul;
  const idleSway = Math.sin((flags.time || viewmodel.bob) * 1.1) * 0.006;
  const kick = viewmodel.kick;
  const crouchY = crouched ? -0.14 : 0;
  const jumpY = airborne ? 0.07 : 0;
  const landY = -landDip * 0.55;
  const def = getWeaponDef(viewmodel.weaponId);

  if (def.kind === 'ranged') {
    const adsX = aiming ? -0.26 : 0;
    const adsY = aiming ? 0.08 : 0;
    const adsZ = aiming ? -0.08 : 0;
    const reloadY = reloading ? Math.sin(Math.min(1, (flags.reloadT || 0)) * Math.PI) * -0.16 : 0;
    viewmodel.root.position.set(
      bobX + adsX + idleSway,
      bobY + adsY + reloadY - kick * 0.12 + crouchY + jumpY + landY,
      kick * 0.22 + adsZ
    );
    viewmodel.root.rotation.set(
      -kick * 0.32 + (reloading ? 0.45 : 0) + (airborne ? -0.08 : 0),
      kick * 0.05,
      aiming ? 0.012 : idleSway * 2
    );
    return;
  }

  const t = attacking ? Math.min(attacking, 1) : 0;
  let swingX = 0;
  let swingY = 0;
  let swingZ = 0;
  let posX = 0;
  let posY = 0;
  let posZ = 0;
  const fists = viewmodel.weaponId === 'fists';
  if (t > 0) {
    if (fists) {
      if (t < 0.22) {
        const u = t / 0.22;
        swingX = -0.2 - u * 0.55;
        swingZ = u * 0.2;
        posZ = -u * 0.12;
        posY = u * 0.06;
      } else if (t < 0.5) {
        const u = (t - 0.22) / 0.28;
        const jab = u * u;
        swingX = -0.75 + jab * 1.55;
        swingZ = 0.2 - jab * 0.15;
        posX = jab * 0.18;
        posZ = -0.12 + jab * 0.28;
        posY = 0.06 - jab * 0.1;
      } else {
        const u = (t - 0.5) / 0.5;
        swingX = 0.8 * (1 - u);
        posX = 0.18 * (1 - u);
        posZ = 0.16 * (1 - u);
      }
    } else if (t < 0.28) {
      const u = t / 0.28;
      swingX = -0.35 - u * 0.85;
      swingZ = -0.15 - u * 0.55;
      swingY = u * 0.25;
      posY = u * 0.12;
      posZ = -u * 0.08;
    } else if (t < 0.55) {
      const u = (t - 0.28) / 0.27;
      const slash = u * u;
      swingX = -1.2 + slash * 2.35;
      swingZ = -0.7 + slash * 1.35;
      swingY = 0.25 - slash * 0.55;
      posX = slash * 0.22;
      posY = 0.12 - slash * 0.28;
      posZ = -0.08 + slash * 0.18;
    } else {
      const u = (t - 0.55) / 0.45;
      swingX = 1.15 * (1 - u);
      swingZ = 0.65 * (1 - u);
      swingY = -0.3 * (1 - u);
      posX = 0.22 * (1 - u);
      posY = -0.16 * (1 - u);
    }
  }

  viewmodel.root.position.set(
    bobX + posX + idleSway,
    bobY + posY - kick * 0.05 + crouchY + jumpY + landY,
    posZ
  );
  viewmodel.root.rotation.set(swingX + (airborne ? -0.1 : 0), swingY, swingZ + idleSway);
}
