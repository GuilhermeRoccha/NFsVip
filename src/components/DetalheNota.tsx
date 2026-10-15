import { useEffect, useState } from 'react'
import { ETAPAS, indiceEtapa, etapaAtual, nomeEtapa, proximaEtapa } from '../domain/etapas'
import { avisoDeCalendario, DIA_MS } from '../domain/regras'
import type { Nota } from '../domain/tipos'
import { data, dataCurta, dataHora, dias, lerValor } from '../lib/formato'
import { armazenamento } from '../data'
import { mensagemDeErro, useApp } from '../estado'
import { StatusNota } from './Status'

const CAMPOS = [
  ['contrato', 'Contrato básico / RC'],
  ['centroCusto', 'Centro de custo'],
  ['oc', 'OC'],
  ['folha', 'MIGO / Folha'],
  ['chamado', 'Chamado'],
] as const

type Edicao = Record<(typeof CAMPOS)[number][0], string> & { valor: string; vencimento: string }

const paraEdicao = (n: Nota): Edicao => ({
  contrato: n.contrato,
  centroCusto: n.centroCusto,
  oc: n.oc,
  folha: n.folha,
  chamado: n.chamado,
  valor: n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  vencimento: n.vencimento.slice(0, 10),
})

/** Painel lateral com os dados da nota, edição, avanço de etapa e histórico. */
export function DetalheNota({ nota, fechar }: { nota: Nota; fechar(): void }) {
  const { fornecedor, agora, janela, atualizarNota, avancarEtapa, avisar } = useApp()
  const [ed, setEd] = useState<Edicao>(() => paraEdicao(nota))
  const [erro, setErro] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [fechar])

  const f = fornecedor(nota.fornecedorId)
  const atual = indiceEtapa(etapaAtual(nota).etapa)
  const prox = proximaEtapa(nota)
  const aviso = avisoDeCalendario(nota, agora)

  function camposAlterados(): Partial<Nota> {
    const valor = lerValor(ed.valor)
    const venc = new Date(ed.vencimento + 'T00:00').toISOString()
    const c: Partial<Nota> = {}
    for (const [k] of CAMPOS) if (ed[k].trim() !== nota[k]) c[k] = ed[k].trim()
    if (valor > 0 && valor !== nota.valor) c.valor = valor
    if (ed.vencimento && venc !== nota.vencimento) c.vencimento = venc
    return c
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

  const salvar = () => executar(() => atualizarNota(nota.id, camposAlterados()), 'Dados salvos')
  const avancar = () =>
    executar(async () => {
      await atualizarNota(nota.id, camposAlterados())
      await avancarEtapa(nota.id)
    }, `Nota avançou para ${prox?.nome}`)

  async function abrirArquivo() {
    const url = await armazenamento.urlDoArquivo(nota.id)
    if (!url) avisar('Arquivo não encontrado neste navegador')
    else if (!window.open(url, '_blank')) avisar('O navegador bloqueou a abertura do arquivo')
  }

  return (
    <>
      <div className="scrim" onClick={fechar} />
      <aside className="drawer" aria-label="Detalhe da nota">
        <div className="hd">
          <div>
            <h3>{f?.nome}</h3>
            <p className="sub">
              NF <span className="mono">{nota.numero}</span> · {f?.tipo}
            </p>
          </div>
          <button className="btn ghost" type="button" onClick={fechar}>
            Fechar
          </button>
        </div>
        <div className="steps" aria-label={`Etapa ${atual + 1} de ${ETAPAS.length}`}>
          {ETAPAS.map((e, i) => (
            <span key={e.id} className={i <= atual ? 'on' : ''} title={e.nome} />
          ))}
        </div>
        <div>
          <StatusNota nota={nota} />
        </div>
        {nota.pendencia && (
          <div className="notice err">
            <b>Pendência:</b> {nota.pendencia}
          </div>
        )}
        <dl className="kv">
          <dt>Emissão</dt>
          <dd className="mono">{data(nota.emissao)}</dd>
          <dt>Recebida em</dt>
          <dd className="mono">{dataHora(nota.etapas[0].em)}</dd>
          <dt>Arquivo</dt>
          <dd>
            {nota.arquivoNome ? (
              <button className="link" type="button" onClick={abrirArquivo}>
                {nota.arquivoNome}
              </button>
            ) : (
              <span className="muted">sem anexo</span>
            )}
          </dd>
        </dl>
        <div className="row2">
          <label>
            Valor (R$)
            <input value={ed.valor} inputMode="decimal" onChange={(e) => setEd({ ...ed, valor: e.target.value })} />
          </label>
          <label>
            Vencimento
            <input type="date" value={ed.vencimento} onChange={(e) => setEd({ ...ed, vencimento: e.target.value })} />
          </label>
          {CAMPOS.map(([k, rotulo]) => (
            <label key={k}>
              {rotulo}
              <input value={ed[k]} onChange={(e) => setEd({ ...ed, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        {aviso && (
          <div className="notice">
            {aviso} Próximo: {dataCurta(prox?.id === 'paga' ? janela.proximoPagamento : janela.proximoChamado)}.
          </div>
        )}
        {erro && <div className="notice err">{erro}</div>}
        <div className="acoes">
          {prox ? (
            <button className="btn primary" type="button" onClick={avancar}>
              Avançar para “{prox.nome}”
            </button>
          ) : (
            <span className="pill s-paga">Fluxo concluído</span>
          )}
          <button className="btn" type="button" onClick={salvar}>
            Salvar dados
          </button>
          {prox &&
            (nota.pendencia ? (
              <button className="btn ghost" type="button" onClick={() => executar(() => atualizarNota(nota.id, { pendencia: '' }), 'Pendência resolvida')}>
                Resolver pendência
              </button>
            ) : (
              <button className="btn ghost" type="button" onClick={() => setMotivo('')}>
                Marcar pendência
              </button>
            ))}
        </div>
        {motivo !== null && (
          <div>
            <label>
              Motivo da pendência
              <input value={motivo} placeholder="ex.: vencimento divergente do boleto" onChange={(e) => setMotivo(e.target.value)} />
            </label>
            <div className="mt8">
              <button
                className="btn"
                type="button"
                disabled={!motivo.trim()}
                onClick={() =>
                  executar(() => atualizarNota(nota.id, { pendencia: motivo.trim() }), 'Pendência registrada').then(() =>
                    setMotivo(null),
                  )
                }
              >
                Registrar pendência
              </button>
            </div>
          </div>
        )}
        <div>
          <h2 className="h-small">Histórico</h2>
          <div className="timeline">
            {nota.etapas.map((e, i) => {
              const anterior = i ? (new Date(e.em).getTime() - new Date(nota.etapas[i - 1].em).getTime()) / DIA_MS : null
              return (
                <div key={i}>
                  <b>{nomeEtapa(e.etapa)}</b> · {e.por}
                  <small>
                    {dataHora(e.em)}
                    {anterior !== null && ` · ${dias(anterior)} após a etapa anterior`}
                  </small>
                </div>
              )
            })}
          </div>
          {nota.alteracoes.length > 0 && (
            <>
              <h2 className="h-small">Alterações</h2>
              <ul className="alteracoes">
                {nota.alteracoes.map((a, i) => (
                  <li key={i}>
                    {a.descricao}
                    <small>
                      {dataHora(a.em)} · {a.por}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
