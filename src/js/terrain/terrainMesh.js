import * as THREE from 'three';
import { ChunkGrid } from './chunk.js';
import { BLOCK, BLOCK_TYPES, isSolidBlock } from './blockTypes.js';
import { getColumnProfile, buildHeightCache, registerHeightCache } from './heightmap.js';

const NEIGHBOR_OFFSETS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1]
];

/**
 * Preenche um ChunkGrid para uma área inteira a partir dos bounds e da seed,
 * usando getColumnProfile para decidir a altura de cada coluna, e empilhando
 * grama (topo) / terra (3 camadas) / pedra (preenchimento até y=0).
 */
function fillChunkGrid(bounds, seed, areaId, lakePosition) {
  const grid = new ChunkGrid();
  const minX = Math.floor(bounds.minX);
  const maxX = Math.ceil(bounds.maxX);
  const minZ = Math.floor(bounds.minZ);
  const maxZ = Math.ceil(bounds.maxZ);

  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const { height, water, biome } = getColumnProfile(x, z, seed, areaId, lakePosition);
      const topBlock = water ? BLOCK.STONE : (biome === 'beach' ? BLOCK.SAND : BLOCK.GRASS);
      for (let y = 0; y <= height; y++) {
        let id = BLOCK.STONE;
        if (y === height) id = topBlock;
        else if (y >= height - 3) id = BLOCK.DIRT;
        grid.setBlock(x, y, z, id);
      }
    }
  }
  return grid;
}

/** Verifica se um bloco sólido tem pelo menos 1 face exposta (vizinho não sólido). */
function hasExposedFace(grid, x, y, z) {
  for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
    if (!isSolidBlock(grid.getBlock(x + dx, y + dy, z + dz))) return true;
  }
  return false;
}

/**
 * Constrói o THREE.Group do terreno (1 InstancedMesh por tipo de bloco
 * sólido, só com blocos que têm face exposta) para uma área inteira.
 */
export function buildTerrainMesh(grid, bounds) {
  const minX = Math.floor(bounds.minX);
  const maxX = Math.ceil(bounds.maxX);
  const minZ = Math.floor(bounds.minZ);
  const maxZ = Math.ceil(bounds.maxZ);

  const exposedByType = new Map();
  for (const chunk of grid.iterateChunks()) {
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        const worldX = chunk.cx * 16 + lx;
        const worldZ = chunk.cz * 16 + lz;
        if (worldX < minX || worldX > maxX || worldZ < minZ || worldZ > maxZ) continue;
        for (let y = 0; y < 8; y++) {
          const id = chunk.get(lx, y, lz);
          if (!isSolidBlock(id)) continue;
          if (!hasExposedFace(grid, worldX, y, worldZ)) continue;
          if (!exposedByType.has(id)) exposedByType.set(id, []);
          exposedByType.get(id).push([worldX, y, worldZ]);
        }
      }
    }
  }

  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();

  for (const [id, positions] of exposedByType) {
    const blockType = BLOCK_TYPES[id];
    if (!blockType) continue;
    const mesh = new THREE.InstancedMesh(geometry, blockType.material, positions.length);
    // Sem castShadow: milhares de instâncias projetando sombra sobrecarregam
    // o shadow map no primeiro frame (causa real de tela preta prolongada).
    // receiveShadow continua ativo (chão recebendo sombra de árvores/casas
    // é visualmente importante; blocos de terreno sombreando uns aos outros não).
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    positions.forEach(([x, y, z], i) => {
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return group;
}

/**
 * API de alto nível: gera o chunkGrid + heightCache de uma área e constrói
 * o mesh pronto para adicionar à cena. Registra o heightCache globalmente
 * para que getGroundHeightAt(x,z,areaId) funcione em qualquer módulo.
 */
export function createTerrainForArea(areaId, bounds, seed, lakePosition) {
  const grid = fillChunkGrid(bounds, seed, areaId, lakePosition);
  const heightCache = buildHeightCache(bounds, seed, areaId, lakePosition);
  registerHeightCache(areaId, heightCache);
  const group = buildTerrainMesh(grid, bounds);
  return { group, grid, bounds };
}
