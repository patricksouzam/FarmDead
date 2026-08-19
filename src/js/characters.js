import * as THREE from 'three';
import { voxelMat, voxelBox } from './voxel.js';

/**
 * Humanóide voxel estilo Cube World — cabeça cúbica, proporções chunky.
 * pose: 'standing' | 'seated'
 */
export function buildLowPolyHumanoid({
  shirt = 0x3f7cbf,
  pants = 0x35507a,
  skin = 0xe8c8a0,
  accessory = null,
  pose = 'standing',
  hatColor = 0xd8a23a,
  scarfColor = 0xb23a4a,
  bootColor = 0x4a3520,
  overalls = false
} = {}) {
  const group = new THREE.Group();
  const shirtMat = voxelMat(shirt, { roughness: 0.75 });
  const pantsMat = voxelMat(pants, { roughness: 0.8 });
  const skinMat = voxelMat(skin, { roughness: 0.65 });
  const bootMat = voxelMat(bootColor, { roughness: 0.85 });

  const hipY = pose === 'seated' ? 0.48 : 0.0;
  const torsoRoot = new THREE.Group();
  torsoRoot.position.y = hipY;
  group.add(torsoRoot);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.48, 0);
  rightLeg.position.set(0.16, 0.48, 0);
  if (pose === 'seated') {
    leftLeg.position.set(-0.16, 0.08, 0.08);
    rightLeg.position.set(0.16, 0.08, 0.08);
    leftLeg.rotation.x = -Math.PI * 0.48;
    rightLeg.rotation.x = -Math.PI * 0.48;
  }

  function buildLeg(legGroup) {
    const thigh = voxelBox(0.22, 0.3, 0.24, pantsMat);
    thigh.position.y = -0.15;
    legGroup.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.3;
    legGroup.add(knee);

    const shin = voxelBox(0.2, 0.26, 0.22, pantsMat);
    shin.position.y = -0.13;
    knee.add(shin);

    const boot = voxelBox(0.24, 0.12, 0.34, bootMat);
    boot.position.set(0, -0.3, 0.04);
    knee.add(boot);

    legGroup.userData.knee = knee;
    return legGroup;
  }

  if (pose === 'standing') {
    group.add(buildLeg(leftLeg));
    group.add(buildLeg(rightLeg));
  } else {
    [-0.16, 0.16].forEach(x => {
      const boot = voxelBox(0.2, 0.12, 0.3, bootMat);
      boot.position.set(x, 0.06, 0.28);
      group.add(boot);
    });
  }

  const hips = voxelBox(0.5, 0.24, 0.36, pantsMat);
  hips.position.y = 0.56;
  torsoRoot.add(hips);

  const torso = voxelBox(0.56, 0.48, 0.4, shirtMat);
  torso.position.y = 0.9;
  torsoRoot.add(torso);

  if (overalls) {
    const bib = voxelBox(0.4, 0.3, 0.4, pantsMat);
    bib.position.y = 0.8;
    torsoRoot.add(bib);
    [-0.14, 0.14].forEach(x => {
      const strap = voxelBox(0.1, 0.3, 0.06, pantsMat);
      strap.position.set(x, 1.08, -0.18);
      torsoRoot.add(strap);
    });
  }

  function buildArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.38, 1.08, 0);
    const upper = voxelBox(0.18, 0.28, 0.18, shirtMat);
    upper.position.y = -0.14;
    pivot.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    pivot.add(elbow);

    const lower = voxelBox(0.16, 0.24, 0.16, shirtMat);
    lower.position.y = -0.12;
    elbow.add(lower);

    const hand = voxelBox(0.16, 0.14, 0.16, skinMat);
    hand.position.y = -0.28;
    elbow.add(hand);

    pivot.userData.elbow = elbow;
    if (pose === 'seated') pivot.rotation.x = -0.35;
    return pivot;
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  torsoRoot.add(leftArm);
  torsoRoot.add(rightArm);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.22, 0);
  torsoRoot.add(headPivot);

  const neck = voxelBox(0.16, 0.1, 0.16, skinMat);
  neck.position.y = -0.04;
  headPivot.add(neck);

  // Cabeça cúbica — marca registrada Cube World
  const head = voxelBox(0.42, 0.42, 0.42, skinMat);
  head.position.y = 0.2;
  headPivot.add(head);

  const nose = voxelBox(0.08, 0.08, 0.1, skinMat);
  nose.position.set(0, 0.16, 0.24);
  headPivot.add(nose);

  const eyeMat = voxelMat(0x2b2118, { roughness: 0.4 });
  [-0.1, 0.1].forEach(x => {
    const eye = voxelBox(0.08, 0.08, 0.04, eyeMat);
    eye.position.set(x, 0.24, 0.22);
    headPivot.add(eye);
  });

  [-0.24, 0.24].forEach(x => {
    const ear = voxelBox(0.06, 0.1, 0.08, skinMat);
    ear.position.set(x, 0.18, 0);
    headPivot.add(ear);
  });

  if (accessory === 'hat') {
    const brim = voxelBox(0.56, 0.06, 0.56, hatColor);
    brim.position.y = 0.4;
    headPivot.add(brim);
    const cap = voxelBox(0.36, 0.22, 0.36, hatColor);
    cap.position.y = 0.52;
    headPivot.add(cap);
  } else if (accessory === 'scarf') {
    const scarf = voxelBox(0.5, 0.12, 0.5, scarfColor);
    scarf.position.y = 0.02;
    headPivot.add(scarf);
    const tail = voxelBox(0.1, 0.3, 0.08, scarfColor);
    tail.position.set(0.14, -0.18, 0.14);
    headPivot.add(tail);
  } else if (accessory === 'cap') {
    const brim = voxelBox(0.36, 0.05, 0.28, hatColor);
    brim.position.set(0, 0.38, 0.1);
    headPivot.add(brim);
    const dome = voxelBox(0.34, 0.18, 0.34, hatColor);
    dome.position.y = 0.46;
    headPivot.add(dome);
  }

  group.userData.rig = {
    torsoRoot,
    headPivot,
    leftArm,
    rightArm,
    leftLeg: pose === 'standing' ? leftLeg : null,
    rightLeg: pose === 'standing' ? rightLeg : null,
    leftKnee: pose === 'standing' ? leftLeg.userData.knee : null,
    rightKnee: pose === 'standing' ? rightLeg.userData.knee : null,
    leftElbow: leftArm.userData.elbow,
    rightElbow: rightArm.userData.elbow,
    bobPhase: Math.random() * Math.PI * 2,
    pose
  };
  group.userData.headPivot = headPivot;
  group.userData.waveArm = rightArm;
  group.userData.restArm = leftArm;

  return group;
}

export function animateIdleHumanoid(mesh, t) {
  const rig = mesh.userData.rig;
  if (!rig) return;
  const phase = rig.bobPhase;
  const seated = rig.pose === 'seated';

  rig.torsoRoot.position.y = 0;
  rig.torsoRoot.scale.y = 1 + Math.sin(t * 1.7 + phase) * 0.012;
  rig.torsoRoot.rotation.x = 0;
  rig.torsoRoot.rotation.z = Math.sin(t * 0.9 + phase) * 0.015;
  rig.torsoRoot.rotation.y = Math.sin(t * 0.35 + phase) * 0.02;

  if (rig.headPivot) {
    rig.headPivot.rotation.y = Math.sin(t * 0.4 + phase) * 0.18;
    rig.headPivot.rotation.x = Math.sin(t * 0.25 + phase) * 0.05;
  }

  const armBase = seated ? -0.35 : 0.05;
  if (rig.leftArm) {
    rig.leftArm.rotation.x = armBase + Math.sin(t * 1.5 + phase) * 0.04;
    rig.leftArm.rotation.z = 0;
    if (rig.leftElbow) {
      rig.leftElbow.rotation.x = 0.25 + Math.sin(t * 1.2 + phase) * 0.06;
    }
  }
  if (rig.rightArm) {
    rig.rightArm.rotation.x = armBase + Math.sin(t * 1.5 + phase + 1) * 0.04;
    rig.rightArm.rotation.z = 0;
    if (rig.rightElbow) {
      rig.rightElbow.rotation.x = 0.25 + Math.sin(t * 1.2 + phase + 1) * 0.06;
    }
  }

  if (rig.leftLeg && !seated) {
    rig.leftLeg.rotation.x = Math.sin(t * 0.8 + phase) * 0.03;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.08 + Math.sin(t * 0.8 + phase) * 0.02;
  }
  if (rig.rightLeg && !seated) {
    rig.rightLeg.rotation.x = Math.sin(t * 0.8 + phase + 1) * 0.03;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.08 + Math.sin(t * 0.8 + phase + 1) * 0.02;
  }
}

export function animateWalkHumanoid(mesh, t, speed) {
  const rig = mesh.userData.rig;
  if (!rig || rig.pose !== 'standing') return;

  const speedNorm = Math.min(speed / 3.6, 1.2);
  const swing = speedNorm * 0.52;
  const step = t * (6.4 + speedNorm * 1.2);
  const leftPhase = Math.sin(step);
  const rightPhase = Math.sin(step + Math.PI);

  if (rig.leftLeg) rig.leftLeg.rotation.x = leftPhase * swing;
  if (rig.rightLeg) rig.rightLeg.rotation.x = rightPhase * swing;

  if (rig.leftKnee) {
    rig.leftKnee.rotation.x = Math.max(0, -leftPhase) * 0.55 * speedNorm + 0.06;
  }
  if (rig.rightKnee) {
    rig.rightKnee.rotation.x = Math.max(0, -rightPhase) * 0.55 * speedNorm + 0.06;
  }

  if (rig.leftArm) {
    rig.leftArm.rotation.x = rightPhase * swing * 0.65;
    rig.leftArm.rotation.z = 0;
  }
  if (rig.rightArm) {
    rig.rightArm.rotation.x = leftPhase * swing * 0.65;
    rig.rightArm.rotation.z = 0;
  }

  if (rig.leftElbow) {
    rig.leftElbow.rotation.x = 0.28 + Math.max(0, -rightPhase) * 0.22;
  }
  if (rig.rightElbow) {
    rig.rightElbow.rotation.x = 0.28 + Math.max(0, -leftPhase) * 0.22;
  }

  rig.torsoRoot.position.y = Math.abs(Math.sin(step * 2)) * 0.028 * speedNorm;
  rig.torsoRoot.rotation.y = Math.sin(step) * 0.04 * speedNorm;
  rig.torsoRoot.rotation.z = Math.sin(step) * -0.025 * speedNorm;

  if (rig.headPivot) {
    rig.headPivot.rotation.y = Math.sin(step * 0.5) * 0.04;
    rig.headPivot.rotation.x = 0;
  }
}

/** Pose rastejante: torso rente ao solo, braços/pernas em padrão de arrasto. */
export function animateCrawlHumanoid(mesh, t, moving) {
  const rig = mesh.userData.rig;
  if (!rig) return;
  const step = t * (moving ? 3.4 : 1.2);
  const left = Math.sin(step);
  const right = Math.sin(step + Math.PI);

  rig.torsoRoot.rotation.z = Math.sin(step * 0.5) * 0.05;
  rig.torsoRoot.position.y = moving ? Math.abs(Math.sin(step * 2)) * 0.02 : 0;

  if (rig.leftArm) { rig.leftArm.rotation.x = -0.3 + left * 0.5; rig.leftArm.rotation.z = 0.15; }
  if (rig.rightArm) { rig.rightArm.rotation.x = -0.3 + right * 0.5; rig.rightArm.rotation.z = -0.15; }
  if (rig.leftElbow) rig.leftElbow.rotation.x = 1.1 + Math.max(0, left) * 0.3;
  if (rig.rightElbow) rig.rightElbow.rotation.x = 1.1 + Math.max(0, right) * 0.3;

  if (rig.leftLeg) rig.leftLeg.rotation.x = right * 0.35;
  if (rig.rightLeg) rig.rightLeg.rotation.x = left * 0.35;
  if (rig.leftKnee) rig.leftKnee.rotation.x = 0.9 + Math.max(0, -right) * 0.3;
  if (rig.rightKnee) rig.rightKnee.rotation.x = 0.9 + Math.max(0, -left) * 0.3;

  if (rig.headPivot) {
    rig.headPivot.rotation.x = -0.5;
    rig.headPivot.rotation.y = Math.sin(t * 0.6) * 0.15;
  }
}

/** Pose de salto: braços abertos, pernas recolhidas no ar. */
export function animateJumpHumanoid(mesh, vy) {
  const rig = mesh.userData.rig;
  if (!rig || rig.pose !== 'standing') return;

  const rising = vy > 0;
  const tuck = rising ? 0.55 : 0.85;

  if (rig.leftLeg) rig.leftLeg.rotation.x = -tuck * 0.7;
  if (rig.rightLeg) rig.rightLeg.rotation.x = -tuck * 0.55;
  if (rig.leftKnee) rig.leftKnee.rotation.x = tuck * 0.9;
  if (rig.rightKnee) rig.rightKnee.rotation.x = tuck * 0.75;

  if (rig.leftArm) {
    rig.leftArm.rotation.x = rising ? -0.9 : 0.35;
    rig.leftArm.rotation.z = 0.35;
  }
  if (rig.rightArm) {
    rig.rightArm.rotation.x = rising ? -0.85 : 0.4;
    rig.rightArm.rotation.z = -0.35;
  }
  if (rig.leftElbow) rig.leftElbow.rotation.x = 0.4;
  if (rig.rightElbow) rig.rightElbow.rotation.x = 0.4;

  rig.torsoRoot.position.y = rising ? 0.04 : -0.02;
  rig.torsoRoot.rotation.x = rising ? -0.08 : 0.12;
  rig.torsoRoot.rotation.y = 0;
  rig.torsoRoot.rotation.z = 0;

  if (rig.headPivot) {
    rig.headPivot.rotation.x = rising ? -0.15 : 0.2;
    rig.headPivot.rotation.y = 0;
  }
}

/** Swing de ataque: braço direito golpeia de cima para baixo. progress: 0..1. */
export function animateAttackHumanoid(mesh, progress) {
  const rig = mesh.userData.rig;
  if (!rig) return;
  const swing = Math.sin(Math.min(progress, 1) * Math.PI);
  if (rig.rightArm) {
    rig.rightArm.rotation.x = -1.2 + swing * 1.6;
    rig.rightArm.rotation.z = -0.3 * swing;
  }
  if (rig.rightElbow) rig.rightElbow.rotation.x = 0.3 + swing * 0.5;
  rig.torsoRoot.rotation.y = swing * 0.15;
}

function snapshotTransform(transform) {
  if (!transform) return null;
  return {
    px: transform.position.x,
    py: transform.position.y,
    pz: transform.position.z,
    rx: transform.rotation.x,
    ry: transform.rotation.y,
    rz: transform.rotation.z,
    sx: transform.scale.x,
    sy: transform.scale.y,
    sz: transform.scale.z
  };
}

function applyTransformSnapshot(transform, snap) {
  if (!transform || !snap) return;
  transform.position.set(snap.px, snap.py, snap.pz);
  transform.rotation.set(snap.rx, snap.ry, snap.rz);
  transform.scale.set(snap.sx, snap.sy, snap.sz);
}

function lerpTransformSnapshot(from, to, alpha) {
  if (!from && !to) return null;
  if (!from) return to;
  if (!to) return from;
  return {
    px: THREE.MathUtils.lerp(from.px, to.px, alpha),
    py: THREE.MathUtils.lerp(from.py, to.py, alpha),
    pz: THREE.MathUtils.lerp(from.pz, to.pz, alpha),
    rx: THREE.MathUtils.lerp(from.rx, to.rx, alpha),
    ry: THREE.MathUtils.lerp(from.ry, to.ry, alpha),
    rz: THREE.MathUtils.lerp(from.rz, to.rz, alpha),
    sx: THREE.MathUtils.lerp(from.sx, to.sx, alpha),
    sy: THREE.MathUtils.lerp(from.sy, to.sy, alpha),
    sz: THREE.MathUtils.lerp(from.sz, to.sz, alpha)
  };
}

export function snapshotHumanoidPose(mesh) {
  const rig = mesh.userData.rig;
  if (!rig) return null;
  return {
    torsoRoot: snapshotTransform(rig.torsoRoot),
    headPivot: snapshotTransform(rig.headPivot),
    leftArm: snapshotTransform(rig.leftArm),
    rightArm: snapshotTransform(rig.rightArm),
    leftLeg: snapshotTransform(rig.leftLeg),
    rightLeg: snapshotTransform(rig.rightLeg),
    leftKnee: snapshotTransform(rig.leftKnee),
    rightKnee: snapshotTransform(rig.rightKnee),
    leftElbow: snapshotTransform(rig.leftElbow),
    rightElbow: snapshotTransform(rig.rightElbow)
  };
}

export function applyHumanoidPose(mesh, pose) {
  const rig = mesh.userData.rig;
  if (!rig || !pose) return;
  applyTransformSnapshot(rig.torsoRoot, pose.torsoRoot);
  applyTransformSnapshot(rig.headPivot, pose.headPivot);
  applyTransformSnapshot(rig.leftArm, pose.leftArm);
  applyTransformSnapshot(rig.rightArm, pose.rightArm);
  applyTransformSnapshot(rig.leftLeg, pose.leftLeg);
  applyTransformSnapshot(rig.rightLeg, pose.rightLeg);
  applyTransformSnapshot(rig.leftKnee, pose.leftKnee);
  applyTransformSnapshot(rig.rightKnee, pose.rightKnee);
  applyTransformSnapshot(rig.leftElbow, pose.leftElbow);
  applyTransformSnapshot(rig.rightElbow, pose.rightElbow);
}

export function blendHumanoidPose(fromPose, toPose, alpha) {
  if (!fromPose || !toPose) return toPose || fromPose || null;
  return {
    torsoRoot: lerpTransformSnapshot(fromPose.torsoRoot, toPose.torsoRoot, alpha),
    headPivot: lerpTransformSnapshot(fromPose.headPivot, toPose.headPivot, alpha),
    leftArm: lerpTransformSnapshot(fromPose.leftArm, toPose.leftArm, alpha),
    rightArm: lerpTransformSnapshot(fromPose.rightArm, toPose.rightArm, alpha),
    leftLeg: lerpTransformSnapshot(fromPose.leftLeg, toPose.leftLeg, alpha),
    rightLeg: lerpTransformSnapshot(fromPose.rightLeg, toPose.rightLeg, alpha),
    leftKnee: lerpTransformSnapshot(fromPose.leftKnee, toPose.leftKnee, alpha),
    rightKnee: lerpTransformSnapshot(fromPose.rightKnee, toPose.rightKnee, alpha),
    leftElbow: lerpTransformSnapshot(fromPose.leftElbow, toPose.leftElbow, alpha),
    rightElbow: lerpTransformSnapshot(fromPose.rightElbow, toPose.rightElbow, alpha)
  };
}
