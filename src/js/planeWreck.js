import * as THREE from 'three';
import { voxelBox, voxelMat } from './voxel.js';
import { placeOnTerrain, registerOrientedBox } from './world.js';
import { getMap } from './mapLoader.js';

export const PLANE_WRECK_POSITION = { x: -22, z: -18 };
export let PLANE_WRECK_YAW = 0.6;

export function createPlaneWreck(scene) {
  const wreck = getMap()?.landmarks?.planeWreck;
  if (wreck) {
    PLANE_WRECK_POSITION.x = wreck.x;
    PLANE_WRECK_POSITION.z = wreck.z;
    if (wreck.yaw != null) PLANE_WRECK_YAW = wreck.yaw;
  }
  const group = new THREE.Group();

  const hullMat = voxelMat(0x5a6a5a, { roughness: 0.7, metalness: 0.15 });
  const hullDarkMat = voxelMat(0x3a453a, { roughness: 0.75, metalness: 0.1 });
  const rustMat = voxelMat(0x6a4530, { roughness: 0.85 });
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x8fb0a8, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.55, flatShading: true
  });

  const fuselageSegments = [
    { w: 1.5, h: 1.3, d: 1.8, z: -2.4, y: 0.65 },
    { w: 1.7, h: 1.5, d: 2.0, z: -0.5, y: 0.75 },
    { w: 1.4, h: 1.2, d: 1.9, z: 1.5, y: 0.62 },
    { w: 0.7, h: 0.7, d: 1.6, z: 3.1, y: 0.42 }
  ];
  fuselageSegments.forEach(({ w, h, d, z, y }, i) => {
    const seg = voxelBox(w, h, d, i === 3 ? rustMat : hullMat);
    seg.position.set(0, y, z);
    seg.rotation.z = i === 3 ? 0.32 : 0;
    group.add(seg);
  });

  const cockpit = voxelBox(1.1, 0.6, 1.1, cockpitMat);
  cockpit.position.set(0, 1.15, -1.6);
  group.add(cockpit);

  const wingRight = voxelBox(5.2, 0.22, 1.3, hullDarkMat);
  wingRight.position.set(3.0, 0.7, -0.2);
  group.add(wingRight);

  const wingLeft = voxelBox(3.4, 0.22, 1.2, rustMat);
  wingLeft.position.set(-2.0, 0.55, 0.1);
  wingLeft.rotation.z = -0.55;
  wingLeft.rotation.x = 0.15;
  group.add(wingLeft);

  const tailFin = voxelBox(0.18, 1.3, 1.0, hullDarkMat);
  tailFin.position.set(0.15, 1.1, 3.6);
  tailFin.rotation.z = 0.22;
  group.add(tailFin);

  const debrisMat = rustMat;
  [[2.1, -3.4, 0.4], [-1.6, -2.0, 0.3], [4.6, -0.6, 0.25], [1.2, 4.4, 0.35]].forEach(([x, z, s]) => {
    const chunk = voxelBox(s, s * 0.6, s, debrisMat);
    chunk.position.set(x, s * 0.3, z);
    chunk.rotation.y = Math.random() * Math.PI;
    group.add(chunk);
  });

  placeOnTerrain(group, PLANE_WRECK_POSITION.x, PLANE_WRECK_POSITION.z, 'farm');
  group.rotation.y = PLANE_WRECK_YAW;
  scene.add(group);

  registerOrientedBox(group.position.x, group.position.z, 1.7, 6.5, PLANE_WRECK_YAW, 'farm');
  group.userData.smokeLocal = new THREE.Vector3(0.2, 1.55, -0.4);

  return group;
}
