import * as THREE from 'three';
import {
  makeGrassTexture, makeDirtTexture, makeStoneTexture, makeSandTexture
} from '../textures.js';

// Tabela de tipos de bloco do motor de terreno voxel. id 0 é sempre "ar"
// (nunca gera mesh). Cada tipo entry: { id, name, map (textura), color (tint),
// solid (colide/gera face) }.
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4
};

const grassTex = makeGrassTexture();
grassTex.repeat.set(1, 1);
const dirtTex = makeDirtTexture();
dirtTex.repeat.set(1, 1);
const stoneTex = makeStoneTexture();
stoneTex.repeat.set(1, 1);
const sandTex = makeSandTexture();
sandTex.repeat.set(1, 1);

function blockMat(map, color = 0xffffff) {
  return new THREE.MeshStandardMaterial({
    map, color, flatShading: true, roughness: 0.9, metalness: 0.02
  });
}

export const BLOCK_TYPES = {
  [BLOCK.GRASS]: { id: BLOCK.GRASS, name: 'grama', solid: true, material: blockMat(grassTex, 0x8fcf5a) },
  [BLOCK.DIRT]: { id: BLOCK.DIRT, name: 'terra', solid: true, material: blockMat(dirtTex, 0xa9825a) },
  [BLOCK.STONE]: { id: BLOCK.STONE, name: 'pedra', solid: true, material: blockMat(stoneTex, 0xaaaaaa) },
  [BLOCK.SAND]: { id: BLOCK.SAND, name: 'areia', solid: true, material: blockMat(sandTex, 0xe8d9a8) }
};

export function isSolidBlock(id) {
  return id !== BLOCK.AIR && !!BLOCK_TYPES[id]?.solid;
}
