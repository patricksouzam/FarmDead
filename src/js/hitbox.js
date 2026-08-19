export const PLAYER_HITBOX = { radius: 0.3, height: 1.55, yOffset: 0.05 };
export const PLAYER_CROUCH_HITBOX = { radius: 0.3, height: 1.05, yOffset: 0.05 };

const ENEMY_HITBOX = {
  Zumbi: { radius: 0.28, height: 1.45, yOffset: 0.05 },
  ZumbiCorredor: { radius: 0.28, height: 1.45, yOffset: 0.05 },
  ZumbiBruto: { radius: 0.36, height: 1.75, yOffset: 0.05 },
  ZumbiRastejante: { radius: 0.32, height: 0.55, yOffset: 0.02 }
};

/** Alcance extra no overlap de ataque para não perder hit pelo bump de movimento. */
export const ENEMY_ATTACK_REACH = 0.7;

export function hitboxForEnemyType(type) {
  const src = ENEMY_HITBOX[type] || ENEMY_HITBOX.Zumbi;
  return { radius: src.radius, height: src.height, yOffset: src.yOffset };
}

export function playerHitbox(crouched = false) {
  return crouched ? PLAYER_CROUCH_HITBOX : PLAYER_HITBOX;
}

export function worldCapsule(position, hitbox) {
  const r = hitbox.radius;
  const h = Math.max(hitbox.height, r * 2);
  const yBase = (position.y || 0) + (hitbox.yOffset || 0);
  return {
    ax: position.x,
    ay: yBase + r,
    az: position.z,
    bx: position.x,
    by: yBase + h - r,
    bz: position.z,
    radius: r
  };
}

export function expandCapsule(cap, extraRadius) {
  return { ...cap, radius: cap.radius + extraRadius };
}

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function closestPointOnSegment(px, py, pz, ax, ay, az, bx, by, bz) {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const abLen2 = abx * abx + aby * aby + abz * abz;
  const t = abLen2 > 1e-8
    ? clamp01(((px - ax) * abx + (py - ay) * aby + (pz - az) * abz) / abLen2)
    : 0;
  return { x: ax + abx * t, y: ay + aby * t, z: az + abz * t, t };
}

function segmentSegmentDistance(a, b) {
  const d1x = a.bx - a.ax;
  const d1y = a.by - a.ay;
  const d1z = a.bz - a.az;
  const d2x = b.bx - b.ax;
  const d2y = b.by - b.ay;
  const d2z = b.bz - b.az;
  const rx = a.ax - b.ax;
  const ry = a.ay - b.ay;
  const rz = a.az - b.az;
  const aDot = d1x * d1x + d1y * d1y + d1z * d1z;
  const eDot = d2x * d2x + d2y * d2y + d2z * d2z;
  const bDot = d1x * d2x + d1y * d2y + d1z * d2z;
  const cDot = d1x * rx + d1y * ry + d1z * rz;
  const fDot = d2x * rx + d2y * ry + d2z * rz;

  let s;
  let t;
  const denom = aDot * eDot - bDot * bDot;
  if (aDot <= 1e-8 && eDot <= 1e-8) {
    s = 0;
    t = 0;
  } else if (aDot <= 1e-8) {
    s = 0;
    t = clamp01(fDot / eDot);
  } else if (eDot <= 1e-8) {
    t = 0;
    s = clamp01(-cDot / aDot);
  } else if (Math.abs(denom) < 1e-8) {
    s = clamp01(-cDot / aDot);
    t = clamp01((bDot * s + fDot) / eDot);
  } else {
    s = clamp01((bDot * fDot - cDot * eDot) / denom);
    t = (bDot * s + fDot) / eDot;
    if (t < 0) {
      t = 0;
      s = clamp01(-cDot / aDot);
    } else if (t > 1) {
      t = 1;
      s = clamp01((bDot - cDot) / aDot);
    }
  }

  const px = a.ax + d1x * s - (b.ax + d2x * t);
  const py = a.ay + d1y * s - (b.ay + d2y * t);
  const pz = a.az + d1z * s - (b.az + d2z * t);
  return Math.hypot(px, py, pz);
}

export function capsulesOverlap(a, b) {
  return segmentSegmentDistance(a, b) <= a.radius + b.radius;
}

export function segmentHitsCapsule(x1, y1, z1, x2, y2, z2, cap) {
  return segmentSegmentDistance(
    { ax: x1, ay: y1, az: z1, bx: x2, by: y2, bz: z2 },
    cap
  ) <= cap.radius;
}

export function closestPointOnCapsule(px, py, pz, cap) {
  return closestPointOnSegment(px, py, pz, cap.ax, cap.ay, cap.az, cap.bx, cap.by, cap.bz);
}

export function pointToCapsuleDistance(px, py, pz, cap) {
  const p = closestPointOnCapsule(px, py, pz, cap);
  return Math.hypot(px - p.x, py - p.y, pz - p.z) - cap.radius;
}
