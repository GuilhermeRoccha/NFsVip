import { useState, type FormEvent } from 'react'
import { StatusNota } from '../components/Status'
import { recebidaEm } from '../domain/etapas'
import { brl, dataCurta, dataHora, deInputData, lerValor } from '../lib/formato'
import { mensagemDeErro, useApp } from '../estado'

const VAZIO = { arquivo: null as File | null, fornecedor: '', numero: '', valor: '', emissao: '', vencimento: '' }

export function SalaVip() {
  const { dados, enviarNota, avisar, fornecedor } = useApp()
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [chaveArquivo, setChaveArquivo] = useState(0) // para limpar o <input type=file>
  if (!dados) return null

  const ativos = dados.fornecedores.filter((f) => f.ativo).sort((a, b) => a.nome.localeCompare(b.nome))
  const recentes = [...dados.notas]
    .sort((a, b) => recebidaEm(b).localeCompare(recebidaEm(a)))
    .slice(0, 12)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const f = ativos.find((x) => x.nome.toLowerCase() === form.fornecedor.trim().toLowerCase())
    const valor = lerValor(form.valor)
    const faltando = [
      !form.fornecedor.trim() && 'o fornecedor',
      !form.numero.trim() && 'o número da NF',
      !(valor > 0) && 'o valor total',
      !form.vencimento && 'o vencimento',
    ].filter(Boolean)
    if (faltando.length) return setErro(`Falta preencher ${faltando.join(', ')}.`)
    if (!f) return setErro('Fornecedor não encontrado no cadastro. Escolha um da lista ou peça ao Comercial para cadastrar.')
    setEnviando(true)
    try {
      await enviarNota(
        {
          fornecedorId: f.id,
          numero: form.numero.trim(),
          valor,
          emissao: form.emissao ? deInputData(form.emissao) : new Date().toISOString(),
          vencimento: deInputData(form.vencimento),
        },
        form.arquivo,
      )
      setForm(VAZIO)
      setChaveArquivo((k) => k + 1)
      setErro('')
      avisar('NF enviada para o Comercial')
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  const campo = (k: keyof typeof VAZIO) => ({
    value: form[k] as string,
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }),
  })

  return (
    <div className="grid-2">
      <div className="panel">
        <header>
          <div>
            <h2>Enviar nota fiscal</h2>
            <p className="sub">A nota vai direto para a fila do Comercial.</p>
          </div>
        </header>
        <form className="nf" onSubmit={enviar} noValidate>
          <label>
            Arquivo da NF (PDF, XML ou foto)
            <input
              key={chaveArquivo}
              type="file"
              accept=".pdf,.xml,image/*"
              onChange={(e) => setForm({ ...form, arquivo: e.target.files?.[0] ?? null })}
            />
          </label>
          <label>
            Fornecedor
            <input list="lista-fornecedores" placeholder="Comece a digitar" autoComplete="off" {...campo('fornecedor')} />
          </label>
          <datalist id="lista-fornecedores">
            {ativos.map((f) => (
              <option key={f.id} value={f.nome} />
            ))}
          </datalist>
          <div className="row2">
            <label>
              Nº da NF
              <input inputMode="numeric" placeholder="ex.: 44372" {...campo('numero')} />
            </label>
            <label>
              Valor total (R$)
              <input inputMode="decimal" placeholder="0,00" {...campo('valor')} />
            </label>
          </div>
          <div className="row2">
            <label>
              Emissão
              <input type="date" {...campo('emissao')} />
            </label>
            <label>
              Vencimento
              <input type="date" {...campo('vencimento')} />
            </label>
          </div>
          {erro && <div className="notice err">{erro}</div>}
          <button className="btn primary" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar para o Comercial'}
          </button>
        </form>
      </div>
      <div className="panel">
        <header>
          <div>
            <h2>Notas enviadas pela Sala VIP</h2>
            <p className="sub">Acompanhe onde cada nota está, sem precisar perguntar no WhatsApp.</p>
          </div>
        </header>
        <div className="list">
          {recentes.map((n) => (
            <div className="it" key={n.id}>
              <span className="t">
                {fornecedor(n.fornecedorId)?.nome} · NF <span className="mono">{n.numero}</span>
              </span>
              <StatusNota nota={n} />
              <span className="muted small">
                Enviada {dataHora(recebidaEm(n))} · vence {dataCurta(n.vencimento)}
              </span>
              <span className="mono small right">{brl(n.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
