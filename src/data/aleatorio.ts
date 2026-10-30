// Usado só pelos dados de exemplo.

/** Gerador pseudoaleatório com semente, para o exemplo ser sempre igual. */
export function aleatorio(semente: number) {
  return () => {
    semente = (semente + 0x6d2b79f5) | 0
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
