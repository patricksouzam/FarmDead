import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { getGroundHeightAt } from './world.js';
import { getCurrentArea } from './areas.js';

const puddles = [];
const drops = [];

function bloodMat(emissive = 0.15) {
  return voxelMat(0x6a0c0c, {
    roughness: 0.55,
    emissive: 0x3a0505,
    emissiveIntensity: emissive,
    transparent: true,
    opacity: 1
  });
}

export function spawnBlood(parent, x, y, z, {
  death = false, dir = null, count = null, fromHeight = 0.9
} = {}) {
  if (!parent) return;
  const groundY = getGroundHeightAt(x, z, getCurrentArea());
  const puddle = voxelBox(
    death ? 1.05 : 0.48,
    0.04,
    death ? 0.82 : 0.38,
    bloodMat(death ? 0.28 : 0.14),
    { castShadow: false }
  );
  puddle.position.set(x + (Math.random() - 0.5) * 0.2, groundY + 0.03, z + (Math.random() - 0.5) * 0.2);
  puddle.rotation.y = Math.random() * Math.PI;
  parent.add(puddle);
  puddles.push({ mesh: puddle, life: death ? 34 : 16, maxLife: death ? 34 : 16 });

  const n = count ?? (death ? 18 : 9);
  const dirX = dir?.x ?? 0;
  const dirY = dir?.y ?? 0;
  const dirZ = dir?.z ?? 0;
  const dirLen = Math.hypot(dirX, dirY, dirZ);
  const nx = dirLen > 0.01 ? dirX / dirLen : 0;
  const ny = dirLen > 0.01 ? dirY / dirLen : 0;
  const nz = dirLen > 0.01 ? dirZ / dirLen : 0;

  for (let i = 0; i < n; i++) {
    const drop = voxelBox(
      death ? 0.09 : 0.065,
      death ? 0.09 : 0.065,
      death ? 0.09 : 0.065,
      bloodMat(0.38),
      { castShadow: false }
    );
    drop.position.set(x, y + fromHeight, z);
    parent.add(drop);
    const spray = death ? 5.2 : 3.1;
    drops.push({
      mesh: drop,
      vx: nx * (2.2 + Math.random() * 2.4) + (Math.random() - 0.5) * spray,
      vy: ny * 1.6 + 2.6 + Math.random() * 3.4,
      vz: nz * (2.2 + Math.random() * 2.4) + (Math.random() - 0.5) * spray,
      life: 1.0 + Math.random() * 0.55
    });
  }
}

export function updateBlood(delta, parent) {
  for (let i = puddles.length - 1; i >= 0; i--) {
    const p = puddles[i];
    p.life -= delta;
    const t = Math.max(0, p.life / p.maxLife);
    p.mesh.scale.setScalar(0.85 + (1 - t) * 0.28);
    if (p.mesh.material) p.mesh.material.opacity = Math.min(1, t + 0.28);
    if (p.life <= 0) {
      if (parent) parent.remove(p.mesh);
      else if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      puddles.splice(i, 1);
    }
  }

  const g = 18;
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.life -= delta;
    d.vy -= g * delta;
    d.mesh.position.x += d.vx * delta;
    d.mesh.position.y += d.vy * delta;
    d.mesh.position.z += d.vz * delta;
    const groundY = getGroundHeightAt(d.mesh.position.x, d.mesh.position.z, getCurrentArea());
    if (d.mesh.position.y <= groundY + 0.04 || d.life <= 0) {
      if (d.mesh.position.y <= groundY + 0.08 && Math.random() < 0.35) {
        const stain = voxelBox(0.16, 0.03, 0.14, bloodMat(0.1), { castShadow: false });
        stain.position.set(d.mesh.position.x, groundY + 0.025, d.mesh.position.z);
        const host = d.mesh.parent || parent;
        if (host) host.add(stain);
        puddles.push({ mesh: stain, life: 10, maxLife: 10 });
      }
      if (parent) parent.remove(d.mesh);
      else if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
      drops.splice(i, 1);
    }
  }
}

export function clearBlood(parent) {
  puddles.splice(0).forEach(p => {
    if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
    else if (parent) parent.remove(p.mesh);
  });
  drops.splice(0).forEach(d => {
    if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
    else if (parent) parent.remove(d.mesh);
  });
}
