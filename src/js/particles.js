import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { getGroundHeightAt } from './world.js';
import { getCurrentArea } from './areas.js';

const MAX_DUST = 80;
const MAX_SMOKE = 90;
const MAX_MIST = 48;
const MAX_RAIN = 70;

const dust = [];
const smoke = [];
const mist = [];
const rain = [];
const emitters = [];

let weather = { kind: 'foggy', t: 0, next: 18 + Math.random() * 22 };

function softMat(color, opts = {}) {
  return voxelMat(color, {
    roughness: 0.95,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    ...opts
  });
}

function takeOrMake(list, max, makeFn) {
  if (list.length >= max) {
    const old = list.shift();
    if (old.mesh?.parent) old.mesh.parent.remove(old.mesh);
  }
  const item = makeFn();
  list.push(item);
  return item;
}

function groundY(x, z) {
  return getGroundHeightAt(x, z, getCurrentArea());
}

export function spawnDust(parent, x, y, z, {
  count = 4, spread = 0.28, burst = false, color = 0x8a7a5a
} = {}) {
  if (!parent) return;
  const n = burst ? count + 5 : count;
  for (let i = 0; i < n; i++) {
    const size = burst ? 0.07 + Math.random() * 0.08 : 0.045 + Math.random() * 0.05;
    const mesh = voxelBox(size, size * 0.6, size, softMat(color, { opacity: 0.55 }), { castShadow: false });
    mesh.position.set(
      x + (Math.random() - 0.5) * spread,
      y + 0.04 + Math.random() * 0.08,
      z + (Math.random() - 0.5) * spread
    );
    parent.add(mesh);
    takeOrMake(dust, MAX_DUST, () => ({
      mesh,
      vx: (Math.random() - 0.5) * (burst ? 1.6 : 0.7),
      vy: (burst ? 1.1 : 0.45) + Math.random() * 0.7,
      vz: (Math.random() - 0.5) * (burst ? 1.6 : 0.7),
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7
    }));
  }
}

export function spawnMeleeDust(parent, x, y, z) {
  spawnDust(parent, x, y, z, { count: 6, spread: 0.55, burst: true, color: 0x6a5a42 });
}

export function spawnSmokePuff(parent, x, y, z, {
  count = 5, scale = 1, color = 0x6a6a68
} = {}) {
  if (!parent) return;
  for (let i = 0; i < count; i++) {
    const size = (0.08 + Math.random() * 0.12) * scale;
    const mesh = voxelBox(size, size, size, softMat(color, {
      opacity: 0.45,
      emissive: 0x222018,
      emissiveIntensity: 0.08
    }), { castShadow: false });
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.12 * scale,
      y + Math.random() * 0.08,
      z + (Math.random() - 0.5) * 0.12 * scale
    );
    parent.add(mesh);
    takeOrMake(smoke, MAX_SMOKE, () => ({
      mesh,
      vx: (Math.random() - 0.5) * 0.35 * scale,
      vy: 0.45 + Math.random() * 0.7,
      vz: (Math.random() - 0.5) * 0.35 * scale,
      life: 0.7 + Math.random() * 0.6,
      maxLife: 1.3,
      grow: 1.6
    }));
  }
}

export function addSmokeEmitter(parent, x, y, z, {
  rate = 4.2, color = 0x5a5854, scale = 1, rise = 1
} = {}) {
  emitters.push({ parent, x, y, z, rate, acc: Math.random(), color, scale, rise });
}

function emitColumn(em, delta) {
  em.acc += delta * em.rate;
  while (em.acc >= 1) {
    em.acc -= 1;
    const size = (0.12 + Math.random() * 0.16) * em.scale;
    const mesh = voxelBox(size, size, size, softMat(em.color, { opacity: 0.38 }), { castShadow: false });
    mesh.position.set(
      em.x + (Math.random() - 0.5) * 0.18 * em.scale,
      em.y,
      em.z + (Math.random() - 0.5) * 0.18 * em.scale
    );
    em.parent.add(mesh);
    takeOrMake(smoke, MAX_SMOKE, () => ({
      mesh,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (0.55 + Math.random() * 0.45) * em.rise,
      vz: (Math.random() - 0.5) * 0.22,
      life: 1.8 + Math.random() * 1.4,
      maxLife: 3.2,
      grow: 2.4
    }));
  }
}

function ensureMist(parent, playerPos) {
  if (!parent || !playerPos) return;
  while (mist.length < MAX_MIST) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * 16;
    const x = playerPos.x + Math.cos(ang) * dist;
    const z = playerPos.z + Math.sin(ang) * dist;
    const size = 0.35 + Math.random() * 0.55;
    const mesh = voxelBox(size, size * 0.35, size, softMat(0xb8c4d4, { opacity: 0.12 }), { castShadow: false });
    mesh.position.set(x, groundY(x, z) + 0.35 + Math.random() * 0.5, z);
    parent.add(mesh);
    mist.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.18,
      vz: (Math.random() - 0.5) * 0.18,
      life: 6 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function ensureRain(parent, playerPos, active) {
  if (!parent || !playerPos) return;
  if (!active) {
    for (let i = rain.length - 1; i >= 0; i--) {
      const d = rain[i];
      if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
      rain.splice(i, 1);
    }
    return;
  }
  while (rain.length < MAX_RAIN) {
    const x = playerPos.x + (Math.random() - 0.5) * 22;
    const z = playerPos.z + (Math.random() - 0.5) * 22;
    const mesh = voxelBox(0.03, 0.28, 0.03, softMat(0x9ab4c8, { opacity: 0.35 }), { castShadow: false });
    mesh.position.set(x, groundY(x, z) + 3 + Math.random() * 5, z);
    parent.add(mesh);
    rain.push({
      mesh,
      vy: -9 - Math.random() * 4,
      life: 1.2
    });
  }
}

export function setWeather(kind) {
  weather.kind = kind;
}

export function tickWeather(delta, windStrength = 0.7) {
  weather.t += delta;
  if (weather.t >= weather.next) {
    weather.t = 0;
    weather.next = 16 + Math.random() * 28;
    const roll = Math.random() + Math.min(0.2, windStrength * 0.08);
    weather.kind = roll < 0.38 ? 'foggy' : roll < 0.72 ? 'drizzle' : 'clear';
  }
  return weather;
}

export function weatherFogMul() {
  if (weather.kind === 'foggy') return 1.22;
  if (weather.kind === 'drizzle') return 1.12;
  return 0.92;
}

export function updateParticles(delta, parent, { wind, playerPos } = {}) {
  const wx = wind ? Math.cos(wind.angle) * wind.strength : 0;
  const wz = wind ? Math.sin(wind.angle) * wind.strength : 0;

  emitters.forEach(em => emitColumn(em, delta));

  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.life -= delta;
    d.vy -= 6 * delta;
    d.mesh.position.x += (d.vx + wx * 0.15) * delta;
    d.mesh.position.y += d.vy * delta;
    d.mesh.position.z += (d.vz + wz * 0.15) * delta;
    const t = Math.max(0, d.life / (d.maxLife || 0.7));
    if (d.mesh.material) d.mesh.material.opacity = t * 0.5;
    if (d.life <= 0 || d.mesh.position.y < groundY(d.mesh.position.x, d.mesh.position.z) - 0.2) {
      if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
      dust.splice(i, 1);
    }
  }

  for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i];
    s.life -= delta;
    s.mesh.position.x += (s.vx + wx * 0.35) * delta;
    s.mesh.position.y += s.vy * delta;
    s.mesh.position.z += (s.vz + wz * 0.35) * delta;
    const t = Math.max(0, s.life / (s.maxLife || 2));
    const grow = 1 + (1 - t) * (s.grow || 1.8);
    s.mesh.scale.setScalar(grow);
    if (s.mesh.material) s.mesh.material.opacity = t * 0.38;
    if (s.life <= 0) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      smoke.splice(i, 1);
    }
  }

  if (parent && playerPos) {
    ensureMist(parent, playerPos);
    const drizzle = weather.kind === 'drizzle';
    ensureRain(parent, playerPos, drizzle);
  }

  for (let i = mist.length - 1; i >= 0; i--) {
    const m = mist[i];
    m.life -= delta;
    m.phase += delta * 0.6;
    m.mesh.position.x += (m.vx + wx * 0.12) * delta;
    m.mesh.position.z += (m.vz + wz * 0.12) * delta;
    m.mesh.position.y += Math.sin(m.phase) * 0.04 * delta;
    if (m.mesh.material) m.mesh.material.opacity = weather.kind === 'clear' ? 0.05 : 0.14;
    if (m.life <= 0 || (playerPos && Math.hypot(m.mesh.position.x - playerPos.x, m.mesh.position.z - playerPos.z) > 22)) {
      if (m.mesh.parent) m.mesh.parent.remove(m.mesh);
      mist.splice(i, 1);
    }
  }

  for (let i = rain.length - 1; i >= 0; i--) {
    const r = rain[i];
    r.life -= delta;
    r.mesh.position.x += wx * 0.8 * delta;
    r.mesh.position.y += r.vy * delta;
    r.mesh.position.z += wz * 0.8 * delta;
    const gy = groundY(r.mesh.position.x, r.mesh.position.z);
    if (r.mesh.position.y <= gy + 0.05 || r.life <= 0) {
      if (playerPos && weather.kind === 'drizzle') {
        r.mesh.position.set(
          playerPos.x + (Math.random() - 0.5) * 22,
          gy + 4 + Math.random() * 4,
          playerPos.z + (Math.random() - 0.5) * 22
        );
        r.life = 1.2;
      } else {
        if (r.mesh.parent) r.mesh.parent.remove(r.mesh);
        rain.splice(i, 1);
      }
    }
  }
}

export function clearParticles(parent) {
  [dust, smoke, mist, rain].forEach(list => {
    list.splice(0).forEach(p => {
      if (p.mesh?.parent) p.mesh.parent.remove(p.mesh);
      else if (parent) parent.remove(p.mesh);
    });
  });
}
