const areaObstacles = {
  farm: [],
  cave: [],
  village: [],
  lake: [],
  basement: []
};
let registrationArea = 'farm';
let activeObstacles = areaObstacles.farm;

// Valores iniciais iguais a src/maps/world.json; `applyWorldMap()` (em world.js) sincroniza após o load.
export const PLAY_BOUNDS = { minX: -28, maxX: 28, minZ: -24, maxZ: 52 };
export const AREA_BOUNDS = {
  farm: PLAY_BOUNDS,
  cave: { minX: -27.2, maxX: -20.8, minZ: 4.8, maxZ: 11.2 },
  village: PLAY_BOUNDS,
  lake: { minX: 6, maxX: 30, minZ: -4, maxZ: 20 },
  basement: { minX: -0.6, maxX: 5.4, minZ: -16.5, maxZ: -10.5 }
};
let activeBounds = AREA_BOUNDS.farm;

export function beginObstacleRegistration(areaId = 'farm') {
  registrationArea = areaObstacles[areaId] ? areaId : 'farm';
}

export function setActiveObstacleArea(areaId = 'farm') {
  activeObstacles = areaObstacles[areaId] || areaObstacles.farm;
  activeBounds = AREA_BOUNDS[areaId] || AREA_BOUNDS.farm;
}

export function getActivePlayBounds() {
  return activeBounds || AREA_BOUNDS.farm;
}

export function resetActiveBounds() {
  activeBounds = AREA_BOUNDS.farm;
}

export function registerObstacle(x, z, radius, areaId) {
  const key = areaId || registrationArea || 'farm';
  if (!areaObstacles[key]) areaObstacles[key] = [];
  areaObstacles[key].push({ kind: 'circle', x, z, radius });
}

export function registerBoxObstacle(x, z, hx, hz, areaId) {
  const key = areaId || registrationArea || 'farm';
  if (!areaObstacles[key]) areaObstacles[key] = [];
  areaObstacles[key].push({ kind: 'box', x, z, hx: Math.max(0.08, hx), hz: Math.max(0.08, hz) });
}

export function registerOrientedBox(x, z, width, depth, yaw = 0, areaId) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  registerBoxObstacle(x, z, (width / 2) * c + (depth / 2) * s, (width / 2) * s + (depth / 2) * c, areaId);
}

export function registerObstaclePublic(x, z, radius, areaId) {
  registerObstacle(x, z, radius, areaId);
}

export function getObstacles(areaId) {
  if (areaId) return areaObstacles[areaId] || [];
  return activeObstacles;
}

function pointNearObstacle(o, x, z, pad) {
  const p = closestOnObstacle(o, x, z);
  const dx = x - p.x;
  const dz = z - p.z;
  if (o.kind === 'box') {
    if (dx === 0 && dz === 0) return true;
    return Math.hypot(dx, dz) < pad;
  }
  return Math.hypot(dx, dz) < (o.radius || 0) + pad;
}

function obstacleBlocksLos(o, crouched, minBlockRadius) {
  if (crouched) return true;
  if (o.kind === 'box') return Math.max(o.hx || 0, o.hz || 0) >= minBlockRadius;
  return (o.radius || 0) >= minBlockRadius;
}

function segmentHitsCircle(x1, z1, x2, z2, cx, cz, radius) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const fx = x1 - cx;
  const fz = z1 - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-8) return fx * fx + fz * fz <= radius * radius;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  const root = Math.sqrt(disc);
  const t0 = (-b - root) / (2 * a);
  const t1 = (-b + root) / (2 * a);
  return (t0 >= 0 && t0 <= 1) || (t1 >= 0 && t1 <= 1) || (t0 < 0 && t1 > 1);
}

function segmentHitsAabb(x1, z1, x2, z2, minX, minZ, maxX, maxZ) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-8) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return clip(-dx, x1 - minX) && clip(dx, maxX - x1) && clip(-dz, z1 - minZ) && clip(dz, maxZ - z1);
}

/** LOS 2D contra obstáculos da área. Obstáculos baixos só cobrem quem está agachado. */
export function segmentBlocked(x1, z1, x2, z2, areaId = null, opts = {}) {
  const list = areaId ? (areaObstacles[areaId] || []) : activeObstacles;
  const crouched = !!opts.crouched;
  const minBlockRadius = opts.minBlockRadius ?? 0.7;
  const ignoreNear = opts.ignoreNearStart ?? 0.42;
  for (const o of list) {
    if (!obstacleBlocksLos(o, crouched, minBlockRadius)) continue;
    if (pointNearObstacle(o, x1, z1, ignoreNear)) continue;
    if (o.kind === 'box') {
      if (segmentHitsAabb(x1, z1, x2, z2, o.x - o.hx, o.z - o.hz, o.x + o.hx, o.z + o.hz)) return true;
    } else if (segmentHitsCircle(x1, z1, x2, z2, o.x, o.z, o.radius || 0.4)) {
      return true;
    }
  }
  return false;
}

function closestOnObstacle(o, x, z) {
  if (o.kind === 'box') {
    return {
      x: Math.max(o.x - o.hx, Math.min(x, o.x + o.hx)),
      z: Math.max(o.z - o.hz, Math.min(z, o.z + o.hz))
    };
  }
  return { x: o.x, z: o.z };
}

function isBlocked(x, z, margin, list = activeObstacles) {
  for (const o of list) {
    const p = closestOnObstacle(o, x, z);
    const dx = x - p.x;
    const dz = z - p.z;
    if (o.kind === 'box' && dx === 0 && dz === 0) return true;
    const minDist = o.kind === 'box' ? margin : (o.radius + margin);
    if (Math.hypot(dx, dz) < minDist) return true;
  }
  return false;
}

function pushOutOfObstacle(o, x, z, margin) {
  if (o.kind === 'box') {
    const insideX = Math.abs(x - o.x) <= o.hx;
    const insideZ = Math.abs(z - o.z) <= o.hz;
    if (insideX && insideZ) {
      const ox = o.hx - Math.abs(x - o.x);
      const oz = o.hz - Math.abs(z - o.z);
      if (ox < oz) x = o.x + Math.sign(x - o.x || 1) * (o.hx + margin);
      else z = o.z + Math.sign(z - o.z || 1) * (o.hz + margin);
      return { x, z };
    }
    const p = closestOnObstacle(o, x, z);
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < margin) {
      if (dist > 1e-5) {
        const push = (margin + 0.002) / dist;
        return { x: p.x + dx * push, z: p.z + dz * push };
      }
      return { x: x + margin, z };
    }
    return { x, z };
  }

  const dx = x - o.x;
  const dz = z - o.z;
  const minDist = o.radius + margin;
  const dist = Math.hypot(dx, dz);
  if (dist < minDist) {
    if (dist > 1e-4) {
      const push = minDist / dist;
      return { x: o.x + dx * push, z: o.z + dz * push };
    }
    return { x: o.x + minDist, z };
  }
  return { x, z };
}

export function avoidObstacles(x, z, margin = 0.3, areaId = null) {
  const list = areaId ? (areaObstacles[areaId] || []) : activeObstacles;
  for (let pass = 0; pass < 4; pass++) {
    for (const o of list) {
      const next = pushOutOfObstacle(o, x, z, margin);
      x = next.x;
      z = next.z;
    }
  }
  return { x, z };
}

export function resolveMovement(fromX, fromZ, toX, toZ, margin = 0.3, areaId = null) {
  const list = areaId ? (areaObstacles[areaId] || []) : activeObstacles;
  const start = avoidObstacles(fromX, fromZ, margin, areaId);
  const fx = start.x;
  const fz = start.z;

  if (!isBlocked(toX, toZ, margin, list)) return { x: toX, z: toZ };
  if (!isBlocked(toX, fz, margin, list)) return { x: toX, z: fz };
  if (!isBlocked(fx, toZ, margin, list)) return { x: fx, z: toZ };

  const dx = toX - fx;
  const dz = toZ - fz;
  const dist = Math.hypot(dx, dz);
  if (dist > 1e-5) {
    const base = Math.atan2(dx, dz);
    for (const a of [0.35, -0.35, 0.7, -0.7, 1.15, -1.15]) {
      const nx = fx + Math.sin(base + a) * dist;
      const nz = fz + Math.cos(base + a) * dist;
      if (!isBlocked(nx, nz, margin, list)) return { x: nx, z: nz };
    }
  }

  return { x: fx, z: fz };
}

export function resolveEntityBump(x, z, radius, others) {
  for (const o of others) {
    if (!o) continue;
    const dx = x - o.x;
    const dz = z - o.z;
    const min = radius + (o.radius || 0.35);
    const dist = Math.hypot(dx, dz);
    if (dist < min && dist > 1e-4) {
      const push = (min - dist) / dist;
      x += dx * push * 0.85;
      z += dz * push * 0.85;
    }
  }
  return { x, z };
}
