import { useEffect, useRef, useState } from 'react'
import { avisoDeDatas, diasDoMes, inicioDoDia } from '../domain/regras'
import { dataCurta } from '../lib/formato'
import { useApp } from '../estado'

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/**
 * Ícone de calendário do topo. Substitui a faixa azul fixa: ao clicar, mostra
 * as quintas de chamado e de pagamento do mês. Na véspera e no dia da quinta
 * o ícone ganha uma bolinha para lembrar.
 */
export function BotaoDatas() {
  const { agora } = useApp()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const aviso = avisoDeDatas(agora)

  // Fecha com Esc ou clicando fora.
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false)
    document.addEventListener('keydown', esc)
    document.addEventListener('mousedown', fora)
    return () => {
      document.removeEventListener('keydown', esc)
      document.removeEventListener('mousedown', fora)
    }
  }, [aberto])

  const titulo = aviso ? `Datas do mês. ${aviso}` : 'Datas do mês'
  return (
    <div className="datas-ancora" ref={caixa}>
      <button
        type="button"
        className="btn-icone"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-label={titulo}
        title={titulo}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M16 3v4M8 3v4M3.5 10h17" />
        </svg>
        {aviso && <span className="ponto" />}
      </button>
      {aberto && <QuadroDatas />}
    </div>
  )
}

function QuadroDatas() {
  const { agora, janela } = useApp()
  const [mes, setMes] = useState(() => new Date(agora.getFullYear(), agora.getMonth(), 1))
  const dias = diasDoMes(mes.getFullYear(), mes.getMonth())
  const hoje = +inicioDoDia(agora)
  const aviso = avisoDeDatas(agora)
  const mudarMes = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1))

  return (
    <section className="datas" role="dialog" aria-label="Datas do mês">
      <div className="datas-hd">
        <button type="button" className="btn-icone" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <h3>
          {MESES_NOME[mes.getMonth()]} {mes.getFullYear()}
        </h3>
        <button type="button" className="btn-icone" onClick={() => mudarMes(1)} aria-label="Próximo mês">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      {aviso && <p className="datas-aviso">{aviso}.</p>}
      <div className="cal">
        {DIAS.map((d) => (
          <span key={d} className="dow">
            {d}
          </span>
        ))}
        {Array.from({ length: dias[0].dia.getDay() }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {dias.map(({ dia, chamado, pagamento }) => (
          <span
            key={dia.getDate()}
            className={[pagamento ? 'pag' : chamado ? 'cham' : '', +dia === hoje ? 'hoje' : ''].join(' ').trim()}
            title={pagamento ? 'Abertura de chamados e pagamento' : chamado ? 'Abertura de chamados' : undefined}
          >
            {dia.getDate()}
          </span>
        ))}
      </div>
      <div className="legenda">
        <span>
          <i className="cham" />
          Abertura de chamados
        </span>
        <span>
          <i className="pag" />
          Chamados e pagamento
        </span>
      </div>
      <dl className="prox">
        <dt>Próximo chamado</dt>
        <dd>qui {dataCurta(janela.proximoChamado)}</dd>
        <dt>Próximo pagamento</dt>
        <dd>qui {dataCurta(janela.proximoPagamento)}</dd>
        <dt>Pagamento seguinte</dt>
        <dd>qui {dataCurta(janela.pagamentoSeguinte)}</dd>
      </dl>
      <p className="obs">Pagamentos só nas quintas das 3 primeiras semanas do mês (dia 1 a 21).</p>
    </section>
  )
}
