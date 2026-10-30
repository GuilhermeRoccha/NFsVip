import { useMemo, useState } from 'react'
import { DetalheNota } from '../components/DetalheNota'
import { LancarNota } from '../components/LancarNota'
import { StatusNota, TempoParada } from '../components/Status'
import { estaAberta, etapaAtual, nomeEtapa, recebidaEm } from '../domain/etapas'
import { DIAS_DE_ANTECEDENCIA, diasAteJanela, ehUrgente, estaVencida, inicioDoDia, janelaDaNota } from '../domain/regras'
import type { Ambiente, Nota } from '../domain/tipos'
import { brl, compacto, data, dataCurta, hora, MESES } from '../lib/formato'
import { useApp } from '../estado'

type Filtro = 'abertas' | 'urgentes' | 'hoje' | 'pendencia' | 'vencidas' | 'todas'

/** Fila de notas de um ambiente: as enviadas pela Sala VIP ou as lançadas pelo Comercial. */
export function Comercial({ origem }: { origem: Ambiente }) {
  const { dados, janela, agora, fornecedor, avisar } = useApp()
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [busca, setBusca] = useState('')
  const [mes, setMes] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [lancando, setLancando] = useState(false)
  const doComercial = origem === 'comercial'

  const filtros = useMemo(
    (): [Filtro, string, (n: Nota) => boolean][] => [
      ['abertas', 'Em aberto', estaAberta],
      ['urgentes', 'Urgentes', (n) => ehUrgente(n, janela)],
      ['hoje', 'Recebidas hoje', (n) => inicioDoDia(recebidaEm(n)) >= janela.hoje],
      ['pendencia', 'Com pendência', (n) => !!n.pendencia],
      ['vencidas', 'Vencidas', (n) => estaVencida(n, janela)],
      ['todas', 'Todas', () => true],
    ],
    [janela],
  )

  if (!dados) return null
  const notas = dados.notas.filter((n) => n.origem === origem)
  const nomeF = (n: Nota) => fornecedor(n.fornecedorId)?.nome ?? '—'
  const requisicao = (n: Nota) => dados.requisicoes.find((r) => r.id === n.requisicaoId)
  // Coluna de referência: contrato básico na Sala VIP; projeto do pedido no Comercial.
  const referencia = (n: Nota) => (doComercial ? (requisicao(n)?.projeto ?? '') : n.contrato)

  const meses = [...new Set(notas.map((n) => recebidaEm(n).slice(0, 7)))].sort().reverse()
  const q = busca.trim().toLowerCase()
  const testa = filtros.find((f) => f[0] === filtro)![2]
  const linhas = notas
    .filter(
      (n) =>
        testa(n) &&
        (!mes || recebidaEm(n).startsWith(mes)) &&
        (!q || [nomeF(n), n.numero, n.oc, n.folha, n.chamado, referencia(n)].join(' ').toLowerCase().includes(q)),
    )
    // Ordem de prioridade: abertas pela janela de pagamento mais próxima, depois pelo vencimento.
    .sort((a, b) =>
      estaAberta(a) && estaAberta(b)
        ? +janelaDaNota(a, janela) - +janelaDaNota(b, janela) || a.vencimento.localeCompare(b.vencimento)
        : recebidaEm(b).localeCompare(recebidaEm(a)),
    )

  const soma = (l: Nota[]) => l.reduce((s, n) => s + n.valor, 0)
  const hoje = notas.filter(filtros[2][2])
  const emAberto = notas.filter(estaAberta)
  const urgentes = notas.filter(filtros[1][2])
  const vencidas = notas.filter(filtros[4][2])

  function copiarParaExcel() {
    const cab = ['Recebida', 'Fornecedor', 'NF', 'Emissão', 'Vencimento', 'Janela de pagamento', 'Previsão de pagamento', 'Urgente', 'Valor', 'Status', doComercial ? 'Projeto' : 'CB/RC', 'Centro de custo', 'OC', 'MIGO/Folha', 'Chamado']
    const corpo = linhas.map((n) =>
      [
        data(recebidaEm(n)),
        nomeF(n),
        n.numero,
        data(n.emissao),
        data(n.vencimento),
        estaAberta(n) ? data(janelaDaNota(n, janela)) : '',
        n.previsaoPagamento ? data(n.previsaoPagamento) : '',
        ehUrgente(n, janela) ? 'Sim' : '',
        n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        n.pendencia ? 'Pendência' : nomeEtapa(etapaAtual(n).etapa),
        referencia(n),
        n.centroCusto,
        n.oc,
        n.folha,
        n.chamado,
      ].join('\t'),
    )
    navigator.clipboard
      .writeText([cab.join('\t'), ...corpo].join('\n'))
      .then(() => avisar(`${corpo.length} linhas copiadas. Cole no Excel.`))
      .catch(() => avisar('Não foi possível copiar'))
  }

  const notaAberta = aberta ? notas.find((n) => n.id === aberta) : undefined

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <span className="k">Recebidas hoje</span>
          <span className="v">{hoje.length}</span>
          <span className="d">
            {brl(soma(hoje))} · {new Set(hoje.map((n) => n.fornecedorId)).size} fornecedores
          </span>
        </div>
        <div className="tile">
          <span className="k">Em aberto</span>
          <span className="v">{emAberto.length}</span>
          <span className="d">{compacto(soma(emAberto))} a pagar</span>
        </div>
        <div className={`tile ${urgentes.length ? 'attn' : ''}`}>
          <span className="k">Urgentes</span>
          <span className="v">{urgentes.length}</span>
          <span className="d">sem chamado e a menos de {DIAS_DE_ANTECEDENCIA} dias da janela de pagamento</span>
        </div>
        <div className={`tile ${vencidas.length ? 'alert' : ''}`}>
          <span className="k">Vencidas sem pagamento</span>
          <span className="v">{vencidas.length}</span>
          <span className="d">{brl(soma(vencidas))}</span>
        </div>
      </div>

      <div className="panel compact">
        <div className="toolbar">
          <div className="chips">
            {filtros.map(([id, nome, f]) => (
              <button key={id} className="chip" type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
                {nome}
                <span className="n">{notas.filter(f).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <input type="search" placeholder="Buscar fornecedor, NF, OC, chamado" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select aria-label="Mês de recebimento" value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos os meses</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {MESES[+m.slice(5) - 1]}/{m.slice(0, 4)}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <button className="btn ghost" type="button" onClick={copiarParaExcel}>
            Copiar tabela para o Excel
          </button>
          {doComercial && (
            <button className="btn primary" type="button" onClick={() => setLancando(true)}>
              Lançar NF
            </button>
          )}
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Recebida</th>
                <th>Fornecedor</th>
                <th>NF</th>
                <th className="num">Valor</th>
                <th>Vencimento</th>
                <th>Janela</th>
                <th title="Informada pelo Comercial; é a data que a Sala VIP vê">Previsão pgto</th>
                <th>Status</th>
                <th>Parada há</th>
                <th>{doComercial ? 'Projeto' : 'CB / RC'}</th>
                <th>C. custo</th>
                <th>OC</th>
                <th>MIGO/Folha</th>
                <th>Chamado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={14} className="empty">
                    Nenhuma nota neste filtro.
                  </td>
                </tr>
              )}
              {linhas.map((n) => (
                <tr key={n.id} onClick={() => setAberta(n.id)}>
                  <td className="mono">
                    {dataCurta(recebidaEm(n))} <span className="muted">{hora(recebidaEm(n))}</span>
                  </td>
                  <td>{nomeF(n)}</td>
                  <td className="mono">{n.numero}</td>
                  <td className="num mono">{brl(n.valor)}</td>
                  <td className="mono">
                    {data(n.vencimento)}
                    {estaVencida(n, janela) && <span className="flag">VENCIDA</span>}
                  </td>
                  <td className="mono">
                    {estaAberta(n) ? (
                      <>
                        {dataCurta(janelaDaNota(n, janela))}{' '}
                        <span className="muted">{diasAteJanela(n, janela)} d</span>
                        {ehUrgente(n, janela) && <span className="urg">URGENTE</span>}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono">
                    {n.previsaoPagamento ? dataCurta(n.previsaoPagamento) : <span className="muted">a informar</span>}
                  </td>
                  <td>
                    <StatusNota nota={n} />
                  </td>
                  <td>
                    <TempoParada nota={n} agora={agora} />
                  </td>
                  {doComercial ? (
                    <td>{referencia(n) || <span className="muted">—</span>}</td>
                  ) : (
                    <td className="mono">{n.contrato || <span className="muted">RC</span>}</td>
                  )}
                  <td className="mono">{n.centroCusto}</td>
                  <td className="mono">{n.oc || <span className="muted">—</span>}</td>
                  <td className="mono">{n.folha || <span className="muted">—</span>}</td>
                  <td className="mono">{n.chamado || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          {doComercial
            ? 'Lance a NF a partir do pedido: empresa, centro de custo e OC vêm sozinhos. Clique numa linha para preencher folha e chamado e avançar a etapa.'
            : 'Clique numa linha para preencher OC, folha e chamado e avançar a etapa.'}{' '}
          Cada avanço grava data, hora e responsável.
        </p>
      </div>
      {notaAberta && <DetalheNota nota={notaAberta} fechar={() => setAberta(null)} />}
      {lancando && <LancarNota fechar={() => setLancando(false)} abrirNota={setAberta} />}
    </>
  )
}
