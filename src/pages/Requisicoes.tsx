// Ambiente Notas Comercial: controle das requisições de compra (RC → pedido → serviço → NFs).
// Substitui a aba "Requisições" da planilha de controle.

import { useState } from 'react'
import { DetalheRequisicao } from '../components/DetalheRequisicao'
import { StatusRequisicao } from '../components/StatusRequisicao'
import { estaAberta } from '../domain/etapas'
import { faturamento, nomeStatus, requisicaoAberta, requisicaoVazia } from '../domain/requisicoes'
import type { Requisicao, StatusRequisicao as Status } from '../domain/tipos'
import { brl, compacto, data } from '../lib/formato'
import { useApp } from '../estado'

type Filtro = 'abertas' | 'rc' | 'pedido' | 'andamento' | 'concluidas' | 'canceladas' | 'todas'

const FILTROS: [Filtro, string, (s: Status) => boolean][] = [
  ['abertas', 'Em aberto', (s) => s !== 'concluida' && s !== 'cancelada'],
  ['rc', 'Aguardando pedido', (s) => s === 'rc_aberta' || s === 'rc_aprovada'],
  ['pedido', 'Pedido', (s) => s === 'pedido_gerado' || s === 'pedido_aprovado'],
  ['andamento', 'Em andamento', (s) => s === 'em_andamento' || s === 'nf_solicitada'],
  ['concluidas', 'Concluídas', (s) => s === 'concluida'],
  ['canceladas', 'Canceladas', (s) => s === 'cancelada'],
  ['todas', 'Todas', () => true],
]

export function Requisicoes() {
  const { dados, fornecedor, avisar } = useApp()
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [busca, setBusca] = useState('')
  // id da requisição aberta no painel lateral; '' = nova.
  const [aberta, setAberta] = useState<string | null>(null)
  if (!dados) return null

  const reqs = dados.requisicoes
  const nomeF = (r: Requisicao) => fornecedor(r.fornecedorId)?.nome ?? '—'
  const q = busca.trim().toLowerCase()
  const testa = FILTROS.find((f) => f[0] === filtro)![2]
  const linhas = reqs
    .filter(
      (r) =>
        testa(r.status) &&
        (!q || [nomeF(r), r.projeto, r.rc, r.pedido, r.centroCusto, r.gestor].join(' ').toLowerCase().includes(q)),
    )
    .sort((a, b) => b.dataRc.localeCompare(a.dataRc))

  const abertas = reqs.filter(requisicaoAberta)
  const semPedido = reqs.filter((r) => FILTROS[1][2](r.status))
  const aFaturar = abertas.filter((r) => r.pedido).reduce((s, r) => s + Math.max(0, faturamento(r, dados.notas).saldo), 0)
  const nfsAbertas = dados.notas.filter((n) => n.origem === 'comercial' && estaAberta(n))

  function copiarParaExcel() {
    const cab = ['Data RC', 'Tipo', 'Empresa', 'Código fornecedor', 'Projeto', 'Status', 'Centro de custo', 'RC', 'Pedido', 'Valor total', 'Faturado', 'Saldo', 'Condição de pagamento', 'Gestor']
    const n2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const corpo = linhas.map((r) => {
      const fat = faturamento(r, dados!.notas)
      return [
        data(r.dataRc),
        r.tipo === 'servico' ? 'Serviço' : 'Material',
        nomeF(r),
        fornecedor(r.fornecedorId)?.codigoSap ?? '',
        r.projeto,
        nomeStatus(r.status),
        r.centroCusto,
        r.rc,
        r.pedido,
        n2(r.valorTotal),
        n2(fat.faturado),
        n2(fat.saldo),
        r.condicaoPagamento,
        r.gestor,
      ].join('\t')
    })
    navigator.clipboard
      .writeText([cab.join('\t'), ...corpo].join('\n'))
      .then(() => avisar(`${corpo.length} linhas copiadas. Cole no Excel.`))
      .catch(() => avisar('Não foi possível copiar'))
  }

  const reqAberta = aberta ? reqs.find((r) => r.id === aberta) : undefined

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <span className="k">Requisições em aberto</span>
          <span className="v">{abertas.length}</span>
          <span className="d">{compacto(abertas.reduce((s, r) => s + r.valorTotal, 0))} em pedidos</span>
        </div>
        <div className={`tile ${semPedido.length ? 'attn' : ''}`}>
          <span className="k">Aguardando pedido</span>
          <span className="v">{semPedido.length}</span>
          <span className="d">RC aberta ou aprovada, sem pedido</span>
        </div>
        <div className="tile">
          <span className="k">A faturar</span>
          <span className="v">{compacto(aFaturar)}</span>
          <span className="d">saldo dos pedidos em aberto</span>
        </div>
        <div className="tile">
          <span className="k">NFs em aberto</span>
          <span className="v">{nfsAbertas.length}</span>
          <span className="d">{brl(nfsAbertas.reduce((s, n) => s + n.valor, 0))} a pagar</span>
        </div>
      </div>

      <div className="panel compact">
        <div className="toolbar">
          <div className="chips">
            {FILTROS.map(([id, nome, f]) => (
              <button key={id} className="chip" type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
                {nome}
                <span className="n">{reqs.filter((r) => f(r.status)).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <input type="search" placeholder="Buscar empresa, projeto, RC, pedido, gestor" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <span className="spacer" />
          <button className="btn ghost" type="button" onClick={copiarParaExcel}>
            Copiar tabela para o Excel
          </button>
          <button className="btn primary" type="button" onClick={() => setAberta('')}>
            Nova requisição
          </button>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Data RC</th>
                <th>Empresa</th>
                <th>Projeto</th>
                <th>Status</th>
                <th>C. custo</th>
                <th>RC</th>
                <th>Pedido</th>
                <th className="num">Valor</th>
                <th className="num">Faturado</th>
                <th className="num">Saldo</th>
                <th>Gestor</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    Nenhuma requisição neste filtro.
                  </td>
                </tr>
              )}
              {linhas.map((r) => {
                const fat = faturamento(r, dados.notas)
                return (
                  <tr key={r.id} onClick={() => setAberta(r.id)}>
                    <td className="mono">{data(r.dataRc)}</td>
                    <td>
                      {nomeF(r)} <span className="muted">{r.tipo === 'material' ? 'material' : 'serviço'}</span>
                    </td>
                    <td>{r.projeto}</td>
                    <td>
                      <StatusRequisicao status={r.status} />
                    </td>
                    <td className="mono">{r.centroCusto}</td>
                    <td className="mono">{r.rc || <span className="muted">—</span>}</td>
                    <td className="mono">{r.pedido || <span className="muted">—</span>}</td>
                    <td className="num mono">{brl(r.valorTotal)}</td>
                    <td className="num mono">{fat.faturado ? brl(fat.faturado) : <span className="muted">—</span>}</td>
                    <td className={`num mono ${fat.saldo < 0 ? 'crit' : ''}`}>{r.status === 'cancelada' ? <span className="muted">—</span> : brl(fat.saldo)}</td>
                    <td>{r.gestor}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Clique numa requisição para editar, mudar o status ou lançar NF do pedido. Faturado soma as NFs lançadas; saldo é
          o que ainda falta virar NF.
        </p>
      </div>
      {aberta !== null && (
        <DetalheRequisicao
          key={aberta || 'nova'}
          requisicao={reqAberta ?? requisicaoVazia()}
          fechar={() => setAberta(null)}
          aoCriar={(id) => setAberta(id)}
        />
      )}
    </>
  )
}
