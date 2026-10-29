// Painel lateral de uma requisição: dados, status, NFs do pedido e histórico.

import { useEffect, useState, type FormEvent } from 'react'
import { estaAberta } from '../domain/etapas'
import {
  aceitaNota,
  CONDICOES_COMUNS,
  faturamento,
  notasDaRequisicao,
  proximoStatus,
  requisicaoAberta,
  STATUS_REQUISICAO,
} from '../domain/requisicoes'
import type { Requisicao, StatusRequisicao as Status } from '../domain/tipos'
import { brl, data, dataCurta, dataHora, deInputData, lerValor, paraInputData } from '../lib/formato'
import { mensagemDeErro, useApp } from '../estado'
import { DetalheNota } from './DetalheNota'
import { LancarNota } from './LancarNota'
import { StatusNota } from './Status'
import { StatusRequisicao } from './StatusRequisicao'

interface Props {
  requisicao: Requisicao
  fechar(): void
  /** Depois de criar uma requisição nova, abre ela já salva. */
  aoCriar(id: string): void
}

type Form = Omit<Requisicao, 'valorTotal' | 'dataRc'> & { valor: string; data: string }

const paraForm = (r: Requisicao): Form => ({
  ...r,
  valor: r.valorTotal ? r.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
  data: paraInputData(r.dataRc),
})

export function DetalheRequisicao({ requisicao: r, fechar, aoCriar }: Props) {
  const { dados, fornecedor, salvarRequisicao, mudarStatusRequisicao, excluirRequisicao, avisar } = useApp()
  const [form, setForm] = useState<Form>(() => paraForm(r))
  const [erro, setErro] = useState('')
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [lancando, setLancando] = useState(false)
  const [notaAberta, setNotaAberta] = useState<string | null>(null)
  const nova = !r.id

  useEffect(() => {
    // Esc fecha só quando não há outro painel aberto por cima.
    if (lancando || notaAberta) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [fechar, lancando, notaAberta])

  if (!dados) return null
  const f = fornecedor(form.fornecedorId)
  const nfs = nova ? [] : notasDaRequisicao(r, dados.notas)
  const fat = faturamento(r, dados.notas)
  const prox = proximoStatus(r)
  const gestores = [...new Set(dados.requisicoes.map((x) => x.gestor).filter(Boolean))].sort()
  const fornecedores = dados.fornecedores.filter((x) => x.ativo || x.id === r.fornecedorId).sort((a, b) => a.nome.localeCompare(b.nome))

  const doForm = (): Requisicao => {
    const { valor, data: d, ...resto } = form
    return { ...resto, valorTotal: lerValor(valor), dataRc: d ? deInputData(d) : '' }
  }

  function escolherFornecedor(id: string) {
    // Traz o centro de custo padrão da empresa, se ainda não foi preenchido à mão.
    const antes = fornecedor(form.fornecedorId)?.centroCusto ?? ''
    const cc = !form.centroCusto || form.centroCusto === antes ? (fornecedor(id)?.centroCusto ?? '') : form.centroCusto
    setForm({ ...form, fornecedorId: id, centroCusto: cc })
  }

  async function executar(acao: () => Promise<void>, msg: string) {
    try {
      await acao()
      setErro('')
      avisar(msg)
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function salvar(e?: FormEvent) {
    e?.preventDefault()
    await executar(async () => {
      const salva = await salvarRequisicao(doForm())
      if (nova) aoCriar(salva.id)
    }, nova ? 'Requisição registrada' : 'Dados salvos')
  }

  const mudar = (status: Status, msg: string, motivo?: string) =>
    executar(async () => {
      await salvarRequisicao(doForm())
      await mudarStatusRequisicao(r.id, status, motivo)
    }, msg)

  const atual = STATUS_REQUISICAO.findIndex((s) => s.id === r.status)

  return (
    <>
      <div className="scrim" onClick={fechar} />
      <aside className="drawer" aria-label="Requisição">
        <div className="hd">
          <div>
            <h3>{nova ? 'Nova requisição' : r.projeto}</h3>
            {!nova && (
              <p className="sub">
                {fornecedor(r.fornecedorId)?.nome} · RC de {data(r.dataRc)}
              </p>
            )}
          </div>
          <button className="btn ghost" type="button" onClick={fechar}>
            Fechar
          </button>
        </div>

        {!nova && (
          <>
            <div className="steps" aria-label={`Status ${atual + 1} de ${STATUS_REQUISICAO.length}`}>
              {STATUS_REQUISICAO.map((s, i) => (
                <span key={s.id} className={r.status !== 'cancelada' && i <= atual ? 'on' : ''} title={s.nome} />
              ))}
            </div>
            <div>
              <StatusRequisicao status={r.status} />
            </div>
            <dl className="kv">
              <dt>Valor do pedido</dt>
              <dd className="mono">{brl(r.valorTotal)}</dd>
              <dt>Faturado</dt>
              <dd className="mono">
                {brl(fat.faturado)} <span className="muted">· pago {brl(fat.pago)}</span>
              </dd>
              <dt>Saldo</dt>
              <dd className={`mono ${fat.saldo < 0 ? 'crit' : ''}`}>{brl(fat.saldo)}</dd>
            </dl>
          </>
        )}

        <form onSubmit={salvar} className="lancar">
          <div className="row2">
            <label>
              Data da RC
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </label>
            <label>
              Tipo
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Requisicao['tipo'] })}>
                <option value="servico">Serviço</option>
                <option value="material">Material</option>
              </select>
            </label>
          </div>
          <label>
            Empresa {f?.codigoSap && <span className="muted mono">· código {f.codigoSap}</span>}
            <select value={form.fornecedorId} onChange={(e) => escolherFornecedor(e.target.value)}>
              <option value="">Escolha</option>
              {fornecedores.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Projeto / serviço
            <input value={form.projeto} placeholder="ex.: adesivagem dos tapumes do saguão" onChange={(e) => setForm({ ...form, projeto: e.target.value })} />
          </label>
          <div className="row2">
            <label>
              Centro de custo
              <input value={form.centroCusto} onChange={(e) => setForm({ ...form, centroCusto: e.target.value })} />
            </label>
            <label>
              Valor total (R$)
              <input inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </label>
            <label>
              Nº da RC
              <input value={form.rc} inputMode="numeric" onChange={(e) => setForm({ ...form, rc: e.target.value })} />
            </label>
            <label>
              Nº do pedido (OC)
              <input value={form.pedido} inputMode="numeric" onChange={(e) => setForm({ ...form, pedido: e.target.value })} />
            </label>
            <label>
              Condição de pagamento
              <input list="condicoes" value={form.condicaoPagamento} onChange={(e) => setForm({ ...form, condicaoPagamento: e.target.value })} />
            </label>
            <label>
              Gestor (aprova a folha)
              <input list="gestores" value={form.gestor} onChange={(e) => setForm({ ...form, gestor: e.target.value })} />
            </label>
          </div>
          <datalist id="condicoes">
            {CONDICOES_COMUNS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <datalist id="gestores">
            {gestores.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <label>
            Observação
            <input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
          </label>
          {erro && <div className="notice err">{erro}</div>}
          <div className="acoes">
            {!nova && prox && (
              <button className="btn primary" type="button" onClick={() => mudar(prox.id, `Requisição em “${prox.nome}”`)}>
                Avançar para “{prox.nome}”
              </button>
            )}
            <button className={`btn ${nova ? 'primary' : ''}`} type="submit">
              {nova ? 'Registrar requisição' : 'Salvar dados'}
            </button>
            {!nova && requisicaoAberta(r) && cancelando === null && (
              <button className="btn ghost" type="button" onClick={() => setCancelando('')}>
                Cancelar requisição
              </button>
            )}
          </div>
          {!nova && (
            <label>
              Corrigir status
              <select value={r.status} onChange={(e) => mudar(e.target.value as Status, 'Status corrigido')}>
                {STATUS_REQUISICAO.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
                {r.status === 'cancelada' && <option value="cancelada">Cancelada</option>}
              </select>
            </label>
          )}
        </form>

        {cancelando !== null && (
          <div className="notice err">
            <b>Cancelar esta requisição?</b> Ela sai da lista de abertas e não aceita mais NFs.
            <label className="mt8">
              Motivo do cancelamento
              <input value={cancelando} autoFocus onChange={(e) => setCancelando(e.target.value)} />
            </label>
            <div className="acoes mt8">
              <button
                className="btn perigo cheio"
                type="button"
                disabled={!cancelando.trim()}
                onClick={() => mudar('cancelada', 'Requisição cancelada', cancelando).then(() => setCancelando(null))}
              >
                Cancelar requisição
              </button>
              <button className="btn ghost" type="button" onClick={() => setCancelando(null)}>
                Voltar
              </button>
            </div>
          </div>
        )}

        {!nova && (
          <div>
            <div className="hd">
              <h2 className="h-small">NFs do pedido</h2>
              {aceitaNota(r) && (
                <button className="btn" type="button" onClick={() => setLancando(true)}>
                  Lançar NF
                </button>
              )}
            </div>
            {nfs.length === 0 ? (
              <p className="muted">
                {r.pedido ? 'Nenhuma NF lançada ainda.' : 'Preencha o nº do pedido para lançar NFs.'}
              </p>
            ) : (
              <ul className="lista-nfs">
                {nfs.map((n) => (
                  <li key={n.id}>
                    <button type="button" className="link" onClick={() => setNotaAberta(n.id)}>
                      NF {n.numero}
                    </button>
                    <span className="muted mono">{dataCurta(n.emissao)}</span>
                    <span className="mono">{brl(n.valor)}</span>
                    <StatusNota nota={n} />
                  </li>
                ))}
              </ul>
            )}
            {nfs.some(estaAberta) && <p className="hint">{nfs.filter(estaAberta).length} NF(s) ainda sem pagamento.</p>}
          </div>
        )}

        {!nova && r.historico.length > 0 && (
          <div>
            <h2 className="h-small">Histórico</h2>
            <ul className="alteracoes">
              {[...r.historico].reverse().map((a, i) => (
                <li key={i}>
                  {a.descricao}
                  <small>
                    {dataHora(a.em)} · {a.por}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!nova && nfs.length === 0 && (
          <div className="exclusao">
            {excluindo === null ? (
              <button className="btn perigo" type="button" onClick={() => setExcluindo('')}>
                Excluir requisição
              </button>
            ) : (
              <div className="notice err">
                <b>Excluir esta requisição?</b> Ela some do portal; fica registrado no histórico de alterações.
                <label className="mt8">
                  Motivo da exclusão
                  <input value={excluindo} autoFocus placeholder="ex.: registrada em duplicidade" onChange={(e) => setExcluindo(e.target.value)} />
                </label>
                <div className="acoes mt8">
                  <button
                    className="btn perigo cheio"
                    type="button"
                    disabled={!excluindo.trim()}
                    onClick={() => executar(() => excluirRequisicao(r.id, excluindo), 'Requisição excluída').then(fechar)}
                  >
                    Excluir definitivamente
                  </button>
                  <button className="btn ghost" type="button" onClick={() => setExcluindo(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
      {lancando && <LancarNota requisicaoId={r.id} fechar={() => setLancando(false)} abrirNota={setNotaAberta} />}
      {notaAberta && dados.notas.some((n) => n.id === notaAberta) && (
        <DetalheNota nota={dados.notas.find((n) => n.id === notaAberta)!} fechar={() => setNotaAberta(null)} />
      )}
    </>
  )
}
