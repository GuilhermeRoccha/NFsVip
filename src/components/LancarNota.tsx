// Lançamento de NF no ambiente Notas Comercial. A pessoa escolhe o pedido e o portal
// traz empresa, código, projeto, centro de custo, RC e OC; falta só o que está na NF.

import { useEffect, useState, type FormEvent } from 'react'
import { aceitaNota, faturamento, requisicaoAberta } from '../domain/requisicoes'
import { brl, deInputData, lerValor } from '../lib/formato'
import { mensagemDeErro, useApp } from '../estado'

interface Props {
  fechar(): void
  /** Abre a nota recém-lançada. */
  abrirNota?(id: string): void
  /** Pedido já escolhido (quando o lançamento sai da tela da requisição). */
  requisicaoId?: string
}

export function LancarNota({ fechar, abrirNota, requisicaoId = '' }: Props) {
  const { dados, fornecedor, enviarNota, avisar } = useApp()
  const [form, setForm] = useState({ requisicaoId, numero: '', valor: '', emissao: '', vencimento: '' })
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [fechar])

  if (!dados) return null
  // Pedidos em aberto primeiro, depois os concluídos; dentro de cada grupo, pela empresa.
  const pedidos = dados.requisicoes
    .filter(aceitaNota)
    .sort(
      (a, b) =>
        Number(requisicaoAberta(b)) - Number(requisicaoAberta(a)) ||
        (fornecedor(a.fornecedorId)?.nome ?? '').localeCompare(fornecedor(b.fornecedorId)?.nome ?? ''),
    )
  const req = pedidos.find((r) => r.id === form.requisicaoId)
  const f = req && fornecedor(req.fornecedorId)
  const fat = req && faturamento(req, dados.notas)
  const valor = lerValor(form.valor)
  const passaDoPedido = fat && valor > 0 && valor > fat.saldo + 0.005

  async function lancar(e: FormEvent) {
    e.preventDefault()
    const faltando = [
      !req && 'o pedido',
      !form.numero.trim() && 'o número da NF',
      !(valor > 0) && 'o valor',
      !form.emissao && 'a emissão',
      !form.vencimento && 'o vencimento',
    ].filter(Boolean)
    if (faltando.length || !req) return setErro(`Falta preencher ${faltando.join(', ')}.`)
    setEnviando(true)
    try {
      const id = await enviarNota(
        {
          requisicaoId: req.id,
          fornecedorId: req.fornecedorId,
          numero: form.numero.trim(),
          valor,
          emissao: deInputData(form.emissao),
          vencimento: deInputData(form.vencimento),
        },
        arquivo,
      )
      avisar(`NF ${form.numero.trim()} lançada no pedido ${req.pedido}`)
      fechar()
      abrirNota?.(id)
    } catch (err) {
      setErro(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="scrim" onClick={fechar} />
      <aside className="drawer" aria-label="Lançar NF">
        <div className="hd">
          <div>
            <h3>Lançar NF</h3>
            <p className="sub">Escolha o pedido; o resto vem do cadastro da requisição.</p>
          </div>
          <button className="btn ghost" type="button" onClick={fechar}>
            Fechar
          </button>
        </div>
        <form onSubmit={lancar} className="lancar">
          <label>
            Pedido
            <select value={form.requisicaoId} autoFocus onChange={(e) => setForm({ ...form, requisicaoId: e.target.value })}>
              <option value="">Escolha</option>
              {pedidos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.pedido} · {fornecedor(r.fornecedorId)?.nome} · {r.projeto}
                </option>
              ))}
            </select>
          </label>
          {req && fat && (
            <dl className="kv">
              <dt>Empresa</dt>
              <dd>
                {f?.nome} <span className="muted mono">{f?.codigoSap}</span>
              </dd>
              <dt>Projeto</dt>
              <dd>{req.projeto}</dd>
              <dt>Centro de custo</dt>
              <dd className="mono">{req.centroCusto || '—'}</dd>
              <dt>RC · OC</dt>
              <dd className="mono">
                {req.rc || '—'} · {req.pedido}
              </dd>
              <dt>Gestor</dt>
              <dd>{req.gestor || '—'}</dd>
              <dt>Condição</dt>
              <dd>{req.condicaoPagamento || '—'}</dd>
              <dt>Saldo do pedido</dt>
              <dd className={`mono ${fat.saldo < 0 ? 'crit' : ''}`}>
                {brl(fat.saldo)} <span className="muted">de {brl(req.valorTotal)}</span>
              </dd>
            </dl>
          )}
          <div className="row2">
            <label>
              Nº da NF
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </label>
            <label>
              Valor (R$)
              <input inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </label>
            <label>
              Emissão
              <input type="date" value={form.emissao} onChange={(e) => setForm({ ...form, emissao: e.target.value })} />
            </label>
            <label>
              Vencimento
              <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
            </label>
          </div>
          <label>
            Arquivo da NF (opcional)
            <input type="file" accept=".pdf,.xml,image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
          {passaDoPedido && (
            <div className="notice">Este valor passa do saldo do pedido em {brl(valor - fat.saldo)}. Confira antes de lançar.</div>
          )}
          {erro && <div className="notice err">{erro}</div>}
          <div className="acoes">
            <button className="btn primary" type="submit" disabled={enviando}>
              {enviando ? 'Lançando…' : 'Lançar NF'}
            </button>
            <button className="btn ghost" type="button" onClick={fechar}>
              Cancelar
            </button>
          </div>
          <p className="hint">A NF já entra como recebida, conferida e com OC. Daqui segue para folha, de acordo do gestor, chamado e pagamento.</p>
        </form>
      </aside>
    </>
  )
}
