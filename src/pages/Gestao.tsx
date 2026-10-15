import { ETAPAS, estaAberta, etapaAtual, recebidaEm } from '../domain/etapas'
import { DIA_MS, inicioDoDia } from '../domain/regras'
import type { Nota } from '../domain/tipos'
import { brl, compacto, MESES } from '../lib/formato'
import { useApp } from '../estado'

const soma = (l: Nota[]) => l.reduce((s, n) => s + n.valor, 0)

interface Barra {
  nome: string
  detalhe?: string
  valor: number
  rotulo: string
  estourou?: boolean
}

function BarrasHorizontais({ barras, maximo }: { barras: Barra[]; maximo: number }) {
  return (
    <div className="hbar">
      {barras.map((b) => (
        <div className="hbar-linha" key={b.nome}>
          <span className="nm">
            {b.nome} {b.detalhe && <span className="muted">{b.detalhe}</span>}
          </span>
          <span className="tr">
            <span className={`fl ${b.estourou ? 'over' : ''}`} style={{ width: `${Math.min(1, b.valor / (maximo || 1)) * 100}%` }} />
          </span>
          <span className={`vl ${b.estourou ? 'crit' : ''}`}>{b.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

function GraficoMensal({ notas, agora }: { notas: Nota[]; agora: Date }) {
  const porMes: Record<string, number> = {}
  for (const n of notas) {
    const k = recebidaEm(n).slice(0, 7)
    porMes[k] = (porMes[k] ?? 0) + n.valor
  }
  const meses = Object.keys(porMes).sort().slice(-10)
  const valores = meses.map((k) => porMes[k])
  const max = Math.max(...valores, 1)
  const W = 760, H = 240, esq = 56, base = 28, topo = 24
  const larg = (W - esq - 16) / Math.max(1, meses.length)
  const passo = Math.pow(10, Math.floor(Math.log10(max)))
  const tick = [1, 2, 2.5, 5, 10].map((m) => m * passo).find((t) => max / t <= 5)!
  const teto = Math.ceil(max / tick) * tick
  const y = (v: number) => topo + (H - topo - base) * (1 - v / teto)
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const linhas = []
  for (let v = 0; v <= teto + 1e-6; v += tick) linhas.push(v)
  return (
    <>
      <div className="scroll-x">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 520 }} role="img" aria-label="Valor recebido por mês">
          {linhas.map((v) => (
            <g key={v}>
              <line x1={esq} x2={W - 8} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={esq - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--fg-2)">
                {v >= 1e6 ? `${(v / 1e6).toLocaleString('pt-BR')} mi` : v >= 1e3 ? `${v / 1e3} mil` : v}
              </text>
            </g>
          ))}
          {meses.map((k, i) => {
            const x = esq + i * larg + larg * 0.18, w = larg * 0.64, v = valores[i], atual = k === mesAtual
            return (
              <g key={k}>
                <rect x={x} y={y(v)} width={w} height={y(0) - y(v)} rx="3" fill={atual ? 'var(--bar-2)' : 'var(--bar)'}>
                  <title>{`${MESES[+k.slice(5) - 1]}/${k.slice(0, 4)}: ${brl(v)}`}</title>
                </rect>
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--fg-2)">
                  {MESES[+k.slice(5) - 1]}
                </text>
                {(v === max || atual) && (
                  <text x={x + w / 2} y={y(v) - 6} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--fg)">
                    {compacto(v).replace('R$ ', '')}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="hint">Barra clara: mês em andamento.</p>
    </>
  )
}

export function Gestao() {
  const { dados, agora, fornecedor } = useApp()
  if (!dados) return null
  const { notas, contratos } = dados

  const ano = agora.getFullYear()
  const doAno = notas.filter((n) => new Date(recebidaEm(n)).getFullYear() === ano)
  const pagas = doAno.filter((n) => !estaAberta(n))
  const noPrazo = pagas.filter((n) => inicioDoDia(etapaAtual(n).em) <= new Date(n.vencimento))
  const ciclo = pagas.length
    ? pagas.reduce((s, n) => s + (new Date(etapaAtual(n).em).getTime() - new Date(recebidaEm(n)).getTime()) / DIA_MS, 0) / pagas.length
    : 0
  const pct = pagas.length ? Math.round((noPrazo.length / pagas.length) * 100) : 0
  const abertas = notas.filter(estaAberta)

  const porFornecedor: Record<string, number> = {}
  for (const n of doAno) porFornecedor[n.fornecedorId] = (porFornecedor[n.fornecedorId] ?? 0) + n.valor
  const top = Object.entries(porFornecedor).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const tempos: Record<string, number[]> = {}
  for (const n of notas)
    n.etapas.forEach((e, i) => {
      if (i) (tempos[e.etapa] ??= []).push((new Date(e.em).getTime() - new Date(n.etapas[i - 1].em).getTime()) / DIA_MS)
    })
  const sla = ETAPAS.slice(1).map((e) => {
    const l = tempos[e.id] ?? []
    return { e, media: l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0 }
  })

  const saldo = contratos
    .filter((c) => c.ativo && c.valor > 0)
    .map((c) => ({ c, usado: soma(notas.filter((n) => n.contrato === c.numero)) }))
    .sort((a, b) => b.usado / b.c.valor - a.usado / a.c.valor)

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <span className="k">Valor recebido em {ano}</span>
          <span className="v">{compacto(soma(doAno))}</span>
          <span className="d">
            {doAno.length} NFs · média {brl(doAno.length ? soma(doAno) / doAno.length : 0)}
          </span>
        </div>
        <div className={`tile ${pct < 85 ? 'attn' : ''}`}>
          <span className="k">Pagas no prazo</span>
          <span className="v">{pct}%</span>
          <span className="d">
            {noPrazo.length} de {pagas.length} pagas até o vencimento
          </span>
        </div>
        <div className="tile">
          <span className="k">Ciclo médio</span>
          <span className="v">{ciclo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias</span>
          <span className="d">do recebimento ao pagamento</span>
        </div>
        <div className="tile">
          <span className="k">Em aberto</span>
          <span className="v">{compacto(soma(abertas))}</span>
          <span className="d">{abertas.length} NFs no fluxo</span>
        </div>
      </div>
      <div className="charts">
        <div className="panel wide">
          <header>
            <div>
              <h2>Valor recebido por mês</h2>
              <p className="sub">Soma do valor das NFs pela data de recebimento, em R$.</p>
            </div>
          </header>
          <GraficoMensal notas={notas} agora={agora} />
        </div>
        <div className="panel">
          <header>
            <div>
              <h2>Maiores fornecedores no ano</h2>
              <p className="sub">Valor total das NFs recebidas, em R$.</p>
            </div>
          </header>
          <BarrasHorizontais
            maximo={top[0]?.[1] ?? 1}
            barras={top.map(([id, v]) => ({ nome: fornecedor(id)?.nome ?? '—', valor: v, rotulo: compacto(v) }))}
          />
        </div>
        <div className="panel">
          <header>
            <div>
              <h2>Tempo médio por etapa</h2>
              <p className="sub">Dias entre a etapa anterior e esta. Mostra onde o fluxo trava.</p>
            </div>
          </header>
          <BarrasHorizontais
            maximo={Math.max(...sla.map((s) => s.media), 1)}
            barras={sla.map(({ e, media }) => ({
              nome: e.nome,
              detalhe: `· ${e.responsavel}`,
              valor: media,
              rotulo: `${media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d`,
            }))}
          />
        </div>
        <div className="panel wide">
          <header>
            <div>
              <h2>Saldo dos contratos básicos</h2>
              <p className="sub">Valor já consumido sobre o valor do contrato. Em vermelho, contratos estourados.</p>
            </div>
          </header>
          <BarrasHorizontais
            maximo={1}
            barras={saldo.map(({ c, usado }) => {
              const p = usado / c.valor
              return {
                nome: fornecedor(c.fornecedorId)?.nome ?? '—',
                detalhe: `CB ${c.numero}`,
                valor: p,
                estourou: p > 1,
                rotulo: `${Math.round(p * 100)}% · ${p > 1 ? 'estourou ' + compacto(usado - c.valor) : 'resta ' + compacto(c.valor - usado)}`,
              }
            })}
          />
        </div>
      </div>
    </>
  )
}
