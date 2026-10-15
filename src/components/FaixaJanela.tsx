import { ehDiaDeChamado } from '../domain/regras'
import { dataCurta } from '../lib/formato'
import { useApp } from '../estado'

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Faixa do topo com as próximas datas de chamado e pagamento. */
export function FaixaJanela() {
  const { agora, janela } = useApp()
  const pagHoje = +janela.proximoPagamento === +janela.hoje
  return (
    <div className="window">
      <div className="wrap">
        <span>
          <span className="lbl">Abertura de chamados</span>
          {ehDiaDeChamado(agora) ? (
            <>
              <b>hoje</b> (quinta)
            </>
          ) : (
            <>
              qui <b>{dataCurta(janela.proximoChamado)}</b>
            </>
          )}
        </span>
        <span>
          <span className="lbl">Próximo pagamento</span>
          {DIAS[janela.proximoPagamento.getDay()]} <b>{dataCurta(janela.proximoPagamento)}</b>
          {pagHoje && ' (hoje)'}
        </span>
        <span>
          <span className="lbl">Pagamento seguinte</span>
          qui <b>{dataCurta(janela.pagamentoSeguinte)}</b>
        </span>
        <span className="obs">Pagamentos só nas quintas das 3 primeiras semanas do mês</span>
      </div>
    </div>
  )
}
