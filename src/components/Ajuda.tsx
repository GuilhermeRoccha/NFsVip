import { useEffect, useState } from 'react'
import { AJUDA_ETAPAS, GLOSSARIO, PAPEIS_NO_PORTAL } from '../domain/ajuda'
import { ETAPAS } from '../domain/etapas'
import { DIAS_DE_ANTECEDENCIA } from '../domain/regras'
import { dataCurta } from '../lib/formato'
import { useApp } from '../estado'

/** Botão "?" do topo que abre a ajuda com o fluxo completo do processo. */
export function BotaoAjuda() {
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn-icone"
        onClick={() => setAberta(true)}
        aria-label="Como funciona o processo"
        title="Como funciona o processo"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
          <path d="M12 17h.01" />
        </svg>
      </button>
      {aberta && <Ajuda fechar={() => setAberta(false)} />}
    </>
  )
}

function Ajuda({ fechar }: { fechar(): void }) {
  const { janela } = useApp()

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [fechar])

  return (
    <>
      <div className="scrim" onClick={fechar} />
      <section className="ajuda" role="dialog" aria-modal="true" aria-labelledby="ajuda-titulo">
        <div className="ajuda-hd">
          <div>
            <h2 id="ajuda-titulo">Como funciona o processo</h2>
            <p className="sub">Da chegada da nota fiscal até o pagamento ao fornecedor.</p>
          </div>
          <button className="btn ghost" type="button" onClick={fechar}>
            Fechar
          </button>
        </div>

        <div className="ajuda-corpo">
          <ol className="fluxo">
            {ETAPAS.map((e, i) => {
              const a = AJUDA_ETAPAS[e.id]
              return (
                <li key={e.id} className="passo">
                  <span className="num">{i + 1}</span>
                  <div className="caixa">
                    <div className="topo">
                      <b>{e.nome}</b>
                      <span className="quem">{e.responsavel}</span>
                      {a.ondeFaz && <span className="selo">no {a.ondeFaz}</span>}
                      {a.calendario && <span className="selo cal">{a.calendario}</span>}
                    </div>
                    <p>{a.oQueAcontece}</p>
                    {e.campoObrigatorio && (
                      <p className="req">Para entrar nesta etapa: preencher “{e.rotuloCampo}”.</p>
                    )}
                  </div>
                  {e.id === 'conferida' && (
                    <div className="desvio">
                      <b>Algo errado?</b> Marca pendência, a nota fica parada e volta a andar quando for resolvida.
                      Vale para qualquer etapa.
                    </div>
                  )}
                </li>
              )
            })}
          </ol>

          <div className="ajuda-lado">
            <div className="bloco">
              <h3>Regras que valem sempre</h3>
              <ul>
                <li>As etapas seguem sempre esta ordem; não dá para pular.</li>
                <li>Nota com pendência não avança.</li>
                <li>Cada avanço grava data, hora e quem fez. É daí que vem o tempo de cada etapa.</li>
                <li>Toda edição de nota, fornecedor ou contrato fica no histórico de alterações.</li>
                <li>Excluir uma nota pede o motivo e também fica registrado no histórico de alterações.</li>
                <li>O SAP continua fora do portal: aqui ficam só os números (OC, MIGO/folha, chamado).</li>
              </ul>
            </div>

            <div className="bloco">
              <h3>Calendário</h3>
              <ul>
                <li>
                  Chamados são abertos às quintas. Próximo: <b>{dataCurta(janela.proximoChamado)}</b>.
                </li>
                <li>
                  Pagamentos saem nas quintas do dia 1 ao 21 do mês. Próximo: <b>{dataCurta(janela.proximoPagamento)}</b>,
                  depois <b>{dataCurta(janela.pagamentoSeguinte)}</b>.
                </li>
                <li>
                  A janela de cada nota é a última quinta de pagamento antes do vencimento. O ideal é a nota estar pronta{' '}
                  {DIAS_DE_ANTECEDENCIA} dias antes dela.
                </li>
                <li>
                  <b>Urgente</b>: ainda sem chamado e a menos de {DIAS_DE_ANTECEDENCIA} dias da janela, ou já sem janela
                  antes do vencimento. A fila do Comercial vem nessa ordem de prioridade.
                </li>
              </ul>
              <p className="obs">Regra ainda a confirmar com o Comercial.</p>
            </div>

            <div className="bloco">
              <h3>Quem faz o quê no portal</h3>
              <dl>
                {PAPEIS_NO_PORTAL.map((p) => (
                  <div key={p.perfil}>
                    <dt>{p.perfil}</dt>
                    <dd>{p.faz}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bloco">
              <h3>Glossário</h3>
              <dl>
                {GLOSSARIO.map(([t, s]) => (
                  <div key={t}>
                    <dt>{t}</dt>
                    <dd>{s}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
