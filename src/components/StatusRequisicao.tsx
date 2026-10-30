import { nomeStatus } from '../domain/requisicoes'
import type { StatusRequisicao as Status } from '../domain/tipos'

const COR: Record<Status, string> = {
  rc_aberta: 's-recebida',
  rc_aprovada: 's-recebida',
  pedido_gerado: 's-oc',
  pedido_aprovado: 's-oc',
  em_andamento: 's-acordo',
  nf_solicitada: 's-acordo',
  concluida: 's-paga',
  cancelada: '',
}

export function StatusRequisicao({ status }: { status: Status }) {
  return <span className={`pill ${COR[status]}`}>{nomeStatus(status)}</span>
}
