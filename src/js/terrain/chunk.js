export const CHUNK_SIZE_XZ = 16;
export const CHUNK_HEIGHT = 8;

function chunkIndex(x, y, z) {
  return x + z * CHUNK_SIZE_XZ + y * CHUNK_SIZE_XZ * CHUNK_SIZE_XZ;
}

export class VoxelChunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * CHUNK_HEIGHT);
  }

  get(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE_XZ || z < 0 || z >= CHUNK_SIZE_XZ || y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.blocks[chunkIndex(x, y, z)];
  }

  set(x, y, z, id) {
    if (x < 0 || x >= CHUNK_SIZE_XZ || z < 0 || z >= CHUNK_SIZE_XZ || y < 0 || y >= CHUNK_HEIGHT) return;
    this.blocks[chunkIndex(x, y, z)] = id;
  }
}

/**
 * Grade de chunks de uma área: mapa esparso chaveado por "cx,cz", com
 * lookup global de bloco por coordenada de mundo (x,z inteiros, y inteiro).
 */
export class ChunkGrid {
  constructor() {
    this.chunks = new Map();
  }

  keyFor(cx, cz) {
    return `${cx},${cz}`;
  }

  ensureChunk(cx, cz) {
    const key = this.keyFor(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new VoxelChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  worldToChunk(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE_XZ);
    const cz = Math.floor(z / CHUNK_SIZE_XZ);
    const lx = x - cx * CHUNK_SIZE_XZ;
    const lz = z - cz * CHUNK_SIZE_XZ;
    return { cx, cz, lx, lz };
  }

  getBlock(x, y, z) {
    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const chunk = this.chunks.get(this.keyFor(cx, cz));
    if (!chunk) return 0;
    return chunk.get(lx, y, lz);
  }

  setBlock(x, y, z, id) {
    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const chunk = this.ensureChunk(cx, cz);
    chunk.set(lx, y, lz, id);
  }

  *iterateChunks() {
    yield* this.chunks.values();
  }
}
