import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { StatusNota } from '../components/Status'
import { recebidaEm } from '../domain/etapas'
import { brl, dataCurta, dataHora, deInputData, lerValor } from '../lib/formato'
import { mensagemDeErro, useApp } from '../estado'

const VAZIO = { arquivo: null as File | null, fornecedor: '', numero: '', valor: '', emissao: '', vencimento: '' }

/** Quanto tempo a confirmação de envio fica na tela. */
const DURACAO_CONFIRMACAO_MS = 2600

interface Enviada {
  id: string
  numero: string
  fornecedor: string
}

export function SalaVip() {
  const { dados, enviarNota, fornecedor } = useApp()
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [enviada, setEnviada] = useState<Enviada | null>(null)
  const [destaque, setDestaque] = useState<string | null>(null) // nota recém-enviada na lista
  const [chaveArquivo, setChaveArquivo] = useState(0) // para limpar o <input type=file>

  useEffect(() => {
    if (!enviada) return
    const t = setTimeout(() => setEnviada(null), DURACAO_CONFIRMACAO_MS)
    return () => clearTimeout(t)
  }, [enviada])

  if (!dados) return null

  const ativos = dados.fornecedores.filter((f) => f.ativo).sort((a, b) => a.nome.localeCompare(b.nome))
  const recentes = [...dados.notas].sort((a, b) => recebidaEm(b).localeCompare(recebidaEm(a))).slice(0, 12)

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
      const id = await enviarNota(
        {
          fornecedorId: f.id,
          numero: form.numero.trim(),
          valor,
          emissao: form.emissao ? deInputData(form.emissao) : new Date().toISOString(),
          vencimento: deInputData(form.vencimento),
        },
        form.arquivo,
      )
      setEnviada({ id, numero: form.numero.trim(), fornecedor: f.nome })
      setDestaque(id)
      setForm(VAZIO)
      setChaveArquivo((k) => k + 1)
      setErro('')
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  function soltarArquivo(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const arquivo = e.dataTransfer.files?.[0]
    if (arquivo) setForm({ ...form, arquivo })
  }

  const campo = (k: Exclude<keyof typeof VAZIO, 'arquivo'>) => ({
    id: `nf-${k}`,
    value: form[k],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }),
  })

  return (
    <div className="vip">
      <section className="panel envio" aria-labelledby="titulo-envio">
        <header>
          <div>
            <h2 id="titulo-envio">Enviar nota fiscal</h2>
            <p className="sub">Preencha os dados e anexe o arquivo. A nota vai direto para a fila do Comercial.</p>
          </div>
        </header>

        {enviada ? (
          <div className="enviada" role="status">
            <svg className="enviada-check" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27 l7 7 l15 -16" />
            </svg>
            <p className="enviada-titulo">Nota enviada!</p>
            <p className="sub">
              NF <span className="mono">{enviada.numero}</span> · {enviada.fornecedor} já está na fila do Comercial.
            </p>
            <button className="btn ghost" type="button" onClick={() => setEnviada(null)}>
              Enviar outra nota
            </button>
          </div>
        ) : (
          <form className="nf" onSubmit={enviar} noValidate>
            <label
              className={`arquivo ${arrastando ? 'sobre' : ''} ${form.arquivo ? 'com-arquivo' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltarArquivo}
            >
              <input
                key={chaveArquivo}
                id="nf-arquivo"
                type="file"
                accept=".pdf,.xml,image/*"
                onChange={(e) => setForm({ ...form, arquivo: e.target.files?.[0] ?? null })}
              />
              <span className="arquivo-titulo">{form.arquivo ? form.arquivo.name : 'Arraste o arquivo da NF aqui'}</span>
              <span className="arquivo-dica">
                {form.arquivo ? 'Clique para trocar o arquivo' : 'ou clique para escolher · PDF, XML ou foto'}
              </span>
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
            <button className="btn primary grande" type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar nota fiscal'}
            </button>
          </form>
        )}
      </section>

      <section className="panel" aria-labelledby="titulo-enviadas">
        <header>
          <div>
            <h2 id="titulo-enviadas">Notas enviadas</h2>
            <p className="sub">Acompanhe onde cada nota está, sem precisar perguntar no WhatsApp.</p>
          </div>
        </header>
        <div className="list">
          {recentes.map((n) => (
            <div className={`it ${n.id === destaque ? 'nova' : ''}`} key={n.id}>
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
      </section>
    </div>
  )
}
