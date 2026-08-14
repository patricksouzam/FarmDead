import * as THREE from 'three';

/** Material flat estilo Cube World. */
export function voxelMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.82,
    metalness: 0.02,
    ...opts
  });
}

/** Caixa voxel com sombra. Posição = centro do cubo. */
export function voxelBox(w, h, d, colorOrMat, opts = {}) {
  const material = colorOrMat instanceof THREE.Material
    ? colorOrMat
    : voxelMat(colorOrMat, opts);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  return mesh;
}

/**
 * Telhado em degraus (stair-step) no eixo X, comprimento ao longo de Z.
 * layers: quantos degraus de cada lado até o cume.
 */
export function voxelStairRoof(group, {
  width,
  depth,
  baseY,
  color,
  layers = 3,
  stepH = 0.28,
  overhang = 0.2
} = {}) {
  const roofMat = voxelMat(color, { roughness: 0.7 });
  const totalW = width + overhang * 2;
  const totalD = depth + overhang * 2;
  for (let i = 0; i < layers; i++) {
    const t = i / Math.max(layers - 1, 1);
    const w = totalW * (1 - t * 0.92);
    const h = stepH;
    const slab = voxelBox(w, h, totalD, roofMat);
    slab.position.set(0, baseY + i * stepH + h / 2, 0);
    group.add(slab);
  }
}

/** Árvore voxel: tronco + copa em cubos empilhados. */
export function buildVoxelTree(scale = 1, foliageColor = 0x4fa32f, trunkColor = 0x6b4428) {
  const group = new THREE.Group();
  const trunkH = 1.1 * scale;
  const trunk = voxelBox(0.28 * scale, trunkH, 0.28 * scale, trunkColor);
  trunk.position.y = trunkH / 2;
  group.add(trunk);

  const foliageMat = voxelMat(foliageColor, { roughness: 0.9 });
  const sizes = [
    [1.1, 0.55, 1.1, trunkH + 0.2],
    [0.85, 0.5, 0.85, trunkH + 0.65],
    [0.55, 0.4, 0.55, trunkH + 1.0]
  ];
  sizes.forEach(([w, h, d, y]) => {
    const leaf = voxelBox(w * scale, h * scale, d * scale, foliageMat);
    leaf.position.y = y * scale;
    group.add(leaf);
  });
  return group;
}

/** Nuvem voxel mais volumosa (blocos empilhados estilo Cube World). */
export function buildVoxelCloud(scale = 1) {
  const group = new THREE.Group();
  const mats = [
    voxelMat(0xffffff, { roughness: 1, metalness: 0 }),
    voxelMat(0xf2f7ff, { roughness: 1, metalness: 0 }),
    voxelMat(0xe8eef8, { roughness: 1, metalness: 0 })
  ];
  const parts = [
    [0, 0, 0, 1.4, 0.75, 1.0],
    [0.85, 0.08, 0.15, 1.05, 0.65, 0.9],
    [-0.9, 0.05, -0.12, 1.0, 0.6, 0.85],
    [0.2, 0.42, 0, 0.85, 0.55, 0.75],
    [-0.35, 0.38, 0.2, 0.7, 0.45, 0.65],
    [0.55, -0.15, -0.25, 0.7, 0.45, 0.7],
    [-0.5, -0.12, 0.3, 0.65, 0.4, 0.6],
    [1.35, 0.0, -0.05, 0.55, 0.4, 0.5],
    [-1.3, 0.02, 0.05, 0.5, 0.38, 0.48]
  ];
  parts.forEach(([x, y, z, w, h, d], i) => {
    const box = voxelBox(w * scale, h * scale, d * scale, mats[i % mats.length], { castShadow: false });
    box.position.set(x * scale, y * scale, z * scale);
    box.receiveShadow = false;
    group.add(box);
  });
  return group;
}
