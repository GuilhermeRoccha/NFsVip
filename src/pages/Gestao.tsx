import { consumoDoContrato, LIMITE_ALERTA_CONTRATO, situacaoDoSaldo, type SituacaoSaldo } from '../domain/contratos'
import { faturamento, requisicaoAberta } from '../domain/requisicoes'
import { ETAPAS, estaAberta, etapaAtual, recebidaEm } from '../domain/etapas'
import { StatusNota, TempoParada } from '../components/Status'
import { DIAS_PARADA, diasNaEtapa, maisParadas, mesAnterior, resumoDoMes, saemNoProximoPagamento } from '../domain/painel'
import { DIA_MS, estaVencida, inicioDoDia } from '../domain/regras'
import type { Ambiente, Nota } from '../domain/tipos'
import { brl, compacto, dataCurta, MESES } from '../lib/formato'
import { useApp } from '../estado'

const soma = (l: Nota[]) => l.reduce((s, n) => s + n.valor, 0)

interface Barra {
  nome: string
  detalhe?: string
  valor: number
  rotulo: string
  /** Só nas barras de contrato: muda a cor para alerta ou estouro. */
  situacao?: SituacaoSaldo
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
            <span className={`fl ${b.situacao ?? ''}`} style={{ width: `${Math.min(1, b.valor / (maximo || 1)) * 100}%` }} />
          </span>
          <span className={`vl ${b.situacao ?? ''}`}>{b.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

/** Linha do valor recebido por mês (últimos 10 meses). O mês em andamento fica com o ponto vazado. */
function GraficoMensal({ notas, agora }: { notas: Nota[]; agora: Date }) {
  const porMes: Record<string, number> = {}
  for (const n of notas) {
    const k = recebidaEm(n).slice(0, 7)
    porMes[k] = (porMes[k] ?? 0) + n.valor
  }
  const meses = Object.keys(porMes).sort().slice(-10)
  const valores = meses.map((k) => porMes[k])
  const max = Math.max(...valores, 1)
  const W = 760, H = 240, esq = 56, dir = 24, base = 28, topo = 24
  const passo = Math.pow(10, Math.floor(Math.log10(max)))
  const tick = [1, 2, 2.5, 5, 10].map((m) => m * passo).find((t) => max / t <= 5)!
  const teto = Math.ceil(max / tick) * tick
  const x = (i: number) => (meses.length < 2 ? (esq + W - dir) / 2 : esq + ((W - esq - dir) * i) / (meses.length - 1))
  const y = (v: number) => topo + (H - topo - base) * (1 - v / teto)
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const linhas = []
  for (let v = 0; v <= teto + 1e-6; v += tick) linhas.push(v)
  const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = meses.length ? `M${x(0)},${y(0)} L${pontos.replaceAll(' ', ' L')} L${x(meses.length - 1)},${y(0)} Z` : ''
  return (
    <>
      <div className="scroll-x">
        <svg className="linha-mensal" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 520 }} role="img" aria-label="Valor recebido por mês">
          {linhas.map((v) => (
            <g key={v}>
              <line x1={esq} x2={W - 8} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={esq - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--fg-2)">
                {v >= 1e6 ? `${(v / 1e6).toLocaleString('pt-BR')} mi` : v >= 1e3 ? `${v / 1e3} mil` : v}
              </text>
            </g>
          ))}
          <path d={area} className="area" />
          <polyline points={pontos} className="traco" />
          {meses.map((k, i) => {
            const v = valores[i], atual = k === mesAtual
            return (
              <g key={k}>
                <circle cx={x(i)} cy={y(v)} r={atual ? 5 : 4} className={atual ? 'ponto atual' : 'ponto'}>
                  <title>{`${MESES[+k.slice(5) - 1]}/${k.slice(0, 4)}: ${brl(v)}`}</title>
                </circle>
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--fg-2)">
                  {MESES[+k.slice(5) - 1]}
                </text>
                {(v === max || atual) && (
                  <text x={x(i)} y={y(v) - 10} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--fg)">
                    {compacto(v).replace('R$ ', '')}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="hint">Ponto vazado: mês em andamento. Passe o mouse num ponto para ver o valor.</p>
    </>
  )
}

/** Comparação com o mês anterior, com seta e cor de bom ou ruim. */
function Comparacao({ atual, anterior, formato, menorEhMelhor = false }: { atual: number | null; anterior: number | null; formato(v: number): string; menorEhMelhor?: boolean }) {
  if (atual === null || anterior === null) return <span className="cmp muted">sem comparação com o mês anterior</span>
  const dif = atual - anterior
  if (Math.abs(dif) < 1e-9) return <span className="cmp muted">igual ao mês anterior</span>
  const bom = menorEhMelhor ? dif < 0 : dif > 0
  return (
    <span className={`cmp ${bom ? 'bom' : 'ruim'}`}>
      {dif > 0 ? '▲' : '▼'} {formato(Math.abs(dif))} vs mês anterior
    </span>
  )
}

/** Painel de um ambiente: só as notas da Sala VIP ou só as do Comercial. */
export function Gestao({ origem }: { origem: Ambiente }) {
  const { dados, agora, janela, fornecedor } = useApp()
  if (!dados) return null
  const notas = dados.notas.filter((n) => n.origem === origem)
  // Contratos básicos são da Sala VIP; no Comercial o controle de saldo é por pedido (aba Requisições).
  const contratos = origem === 'vip' ? dados.contratos : []

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
    .map((c) => {
      const usado = consumoDoContrato(c, notas)
      return { c, usado, situacao: situacaoDoSaldo(usado, c.valor) }
    })
    .sort((a, b) => b.usado / b.c.valor - a.usado / a.c.valor)
  // No Comercial: quanto de cada pedido em aberto já virou NF.
  const pedidos = dados.requisicoes
    .filter((r) => origem === 'comercial' && requisicaoAberta(r) && r.pedido)
    .map((r) => {
      const usado = faturamento(r, dados.notas).faturado
      return { r, usado, situacao: situacaoDoSaldo(usado, r.valorTotal) }
    })
    .sort((a, b) => b.usado / b.r.valorTotal - a.usado / a.r.valorTotal)
  const emAlerta = origem === 'vip' ? saldo.filter((x) => x.situacao !== 'ok') : pedidos.filter((x) => x.situacao !== 'ok')

  // "Agora": o que pede atenção hoje.
  const vencidas = abertas.filter((n) => estaVencida(n, janela))
  const paradas = abertas.filter((n) => diasNaEtapa(n, agora) > DIAS_PARADA)
  const proximas = saemNoProximoPagamento(notas, janela)
  const travando = maisParadas(notas, agora)

  // Comparação do mês atual com o anterior.
  const mes = agora.getMonth()
  const ant = mesAnterior(ano, mes)
  const esteMes = resumoDoMes(notas, ano, mes)
  const mesPassado = resumoDoMes(notas, ant.ano, ant.mes)
  const umaCasa = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

  return (
    <>
      <h2 className="secao-titulo">Agora</h2>
      <div className="tiles">
        <div className={`tile ${vencidas.length ? 'alert' : ''}`}>
          <span className="k">Vencidas sem pagamento</span>
          <span className="v">{vencidas.length}</span>
          <span className="d">{vencidas.length ? brl(soma(vencidas)) : 'nenhuma'}</span>
        </div>
        <div className={`tile ${paradas.length ? 'attn' : ''}`}>
          <span className="k">Paradas há mais de {DIAS_PARADA} dias</span>
          <span className="v">{paradas.length}</span>
          <span className="d">na mesma etapa</span>
        </div>
        <div className={`tile ${emAlerta.length ? 'attn' : ''}`}>
          <span className="k">{origem === 'vip' ? 'Contratos em alerta' : 'Pedidos em alerta'}</span>
          <span className="v">{emAlerta.length}</span>
          <span className="d">
            {emAlerta.filter((x) => x.situacao === 'estourado').length} estourado(s)
          </span>
        </div>
        <div className="tile">
          <span className="k">Sai na quinta {dataCurta(janela.proximoPagamento)}</span>
          <span className="v">{compacto(soma(proximas))}</span>
          <span className="d">{proximas.length} NFs com pagamento previsto</span>
        </div>
      </div>

      <h2 className="secao-titulo">No ano</h2>
      <div className="tiles">
        <div className="tile">
          <span className="k">Valor recebido em {ano}</span>
          <span className="v">{compacto(soma(doAno))}</span>
          <span className="d">
            {doAno.length} NFs · em {MESES[mes]}: {compacto(esteMes.valor)}
          </span>
          <Comparacao atual={esteMes.valor} anterior={mesPassado.valor} formato={compacto} />
        </div>
        <div className={`tile ${pct < 85 ? 'attn' : ''}`}>
          <span className="k">Pagas no prazo</span>
          <span className="v">{pct}%</span>
          <span className="d">
            {noPrazo.length} de {pagas.length} pagas até o vencimento
          </span>
          <Comparacao atual={esteMes.noPrazo} anterior={mesPassado.noPrazo} formato={(v) => `${v} pontos`} />
        </div>
        <div className="tile">
          <span className="k">Ciclo médio</span>
          <span className="v">{umaCasa(ciclo)} dias</span>
          <span className="d">do recebimento ao pagamento</span>
          <Comparacao atual={esteMes.ciclo} anterior={mesPassado.ciclo} formato={(v) => `${umaCasa(v)} dias`} menorEhMelhor />
        </div>
        <div className="tile">
          <span className="k">Em aberto</span>
          <span className="v">{compacto(soma(abertas))}</span>
          <span className="d">{abertas.length} NFs no fluxo</span>
        </div>
      </div>
      <div className="charts">
        <div className="panel">
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
              <h2>O que está travando</h2>
              <p className="sub">Notas em aberto paradas há mais tempo na mesma etapa.</p>
            </div>
          </header>
          {travando.length === 0 ? (
            <p className="muted">Nenhuma nota em aberto.</p>
          ) : (
            <div className="travando">
              {travando.map((n) => (
                <div key={n.id}>
                  <StatusNota nota={n} />
                  <span className="t">
                    {fornecedor(n.fornecedorId)?.nome ?? '—'} <span className="muted mono">NF {n.numero}</span>
                  </span>
                  <TempoParada nota={n} agora={agora} />
                </div>
              ))}
            </div>
          )}
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
              <h2>{origem === 'vip' ? 'Saldo dos contratos básicos' : 'Saldo dos pedidos em aberto'}</h2>
              <p className="sub">
                Amarelo: {Math.round(LIMITE_ALERTA_CONTRATO * 100)}% ou mais usado. Vermelho: estourado.
              </p>
            </div>
            {emAlerta.length > 0 && (
              <span className="pill s-alerta" role="status">
                {emAlerta.length} em alerta
              </span>
            )}
          </header>
          <BarrasHorizontais
            maximo={1}
            barras={(origem === 'vip'
              ? saldo.map(({ c, usado, situacao }) => ({ nome: fornecedor(c.fornecedorId)?.nome ?? '—', detalhe: `CB ${c.numero}`, total: c.valor, usado, situacao }))
              : pedidos.map(({ r, usado, situacao }) => ({ nome: r.projeto, detalhe: `${fornecedor(r.fornecedorId)?.nome ?? ''} · ${r.pedido}`, total: r.valorTotal, usado, situacao }))
            ).map(({ nome, detalhe, total, usado, situacao }) => {
              const p = usado / total
              return {
                nome,
                detalhe,
                valor: p,
                situacao,
                rotulo: `${Math.floor(p * 100)}% · ${p > 1 ? 'estourou ' + compacto(usado - total) : 'resta ' + compacto(total - usado)}`,
              }
            })}
          />
        </div>
      </div>
    </>
  )
}
