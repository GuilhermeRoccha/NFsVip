import { estaAberta, etapaAtual, nomeEtapa } from '../domain/etapas'
import { DIA_MS } from '../domain/regras'
import type { Nota } from '../domain/tipos'

export function StatusNota({ nota }: { nota: Nota }) {
  if (nota.pendencia) return <span className="pill s-pend">Pendência</span>
  const e = etapaAtual(nota).etapa
  return <span className={`pill s-${e}`}>{nomeEtapa(e)}</span>
}

/** Há quanto tempo a nota está parada na etapa atual. */
export function TempoParada({ nota, agora }: { nota: Nota; agora: Date }) {
  if (!estaAberta(nota)) return <span className="muted">—</span>
  const d = (agora.getTime() - new Date(etapaAtual(nota).em).getTime()) / DIA_MS
  const classe = d > 7 ? 'c' : d > 3 ? 'w' : ''
  return <span className={`age ${classe}`}>{d < 1 ? `${Math.max(1, Math.round(d * 24))} h` : `${Math.floor(d)} d`}</span>
}
