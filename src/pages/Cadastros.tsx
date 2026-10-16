import { useState, type FormEvent } from 'react'
import type { Contrato, Fornecedor } from '../domain/tipos'
import { brl, dataHora, lerValor } from '../lib/formato'
import { mensagemDeErro, useApp } from '../estado'

const FORNECEDOR_VAZIO: Fornecedor = {
  id: '',
  nome: '',
  razaoSocial: '',
  cnpj: '',
  codigoSap: '',
  tipo: '',
  centroCusto: '',
  ativo: true,
}

function FormFornecedor({ inicial, fechar }: { inicial: Fornecedor; fechar(): void }) {
  const { salvarFornecedor, avisar } = useApp()
  const [f, setF] = useState(inicial)
  const [erro, setErro] = useState('')
  const campo = (k: Exclude<keyof Fornecedor, 'ativo' | 'id'>, rotulo: string) => (
    <label>
      {rotulo}
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  )
  async function salvar(e: FormEvent) {
    e.preventDefault()
    try {
      await salvarFornecedor({ ...f, nome: f.nome.trim() })
      avisar(inicial.id ? 'Fornecedor atualizado' : 'Fornecedor cadastrado')
      fechar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }
  return (
    <form className="panel form-cadastro" onSubmit={salvar}>
      <h2>{inicial.id ? `Editar ${inicial.nome}` : 'Novo fornecedor'}</h2>
      <div className="row2">
        {campo('nome', 'Nome usado no dia a dia')}
        {campo('razaoSocial', 'Razão social')}
        {campo('cnpj', 'CNPJ')}
        {campo('codigoSap', 'Código SAP')}
        {campo('tipo', 'Tipo')}
        {campo('centroCusto', 'Centro de custo padrão')}
      </div>
      <label className="check">
        <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} />
        Ativo (aparece na lista da Sala VIP)
      </label>
      {erro && <div className="notice err">{erro}</div>}
      <div className="acoes">
        <button className="btn primary" type="submit">
          Salvar
        </button>
        <button className="btn ghost" type="button" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function FormContrato({ inicial, fechar }: { inicial: Contrato; fechar(): void }) {
  const { dados, salvarContrato, avisar } = useApp()
  const [c, setC] = useState({ ...inicial, valorTexto: inicial.valor ? inicial.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' })
  const [erro, setErro] = useState('')
  async function salvar(e: FormEvent) {
    e.preventDefault()
    try {
      const { valorTexto, ...resto } = c
      await salvarContrato({ ...resto, numero: resto.numero.trim(), valor: lerValor(valorTexto) })
      avisar(inicial.id ? 'Contrato atualizado' : 'Contrato cadastrado')
      fechar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }
  return (
    <form className="panel form-cadastro" onSubmit={salvar}>
      <h2>{inicial.id ? `Editar contrato ${inicial.numero}` : 'Novo contrato básico'}</h2>
      <div className="row2">
        <label>
          Número do contrato
          <input value={c.numero} onChange={(e) => setC({ ...c, numero: e.target.value })} />
        </label>
        <label>
          Fornecedor
          <select value={c.fornecedorId} onChange={(e) => setC({ ...c, fornecedorId: e.target.value })}>
            <option value="">Escolha</option>
            {dados?.fornecedores
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
          </select>
        </label>
        <label>
          Valor total (R$)
          <input inputMode="decimal" value={c.valorTexto} onChange={(e) => setC({ ...c, valorTexto: e.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={c.ativo} onChange={(e) => setC({ ...c, ativo: e.target.checked })} />
        Ativo
      </label>
      {erro && <div className="notice err">{erro}</div>}
      <div className="acoes">
        <button className="btn primary" type="submit">
          Salvar
        </button>
        <button className="btn ghost" type="button" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function Cadastros() {
  const { dados, fornecedor } = useApp()
  const [aba, setAba] = useState<'fornecedores' | 'contratos' | 'historico'>('fornecedores')
  const [editFornecedor, setEditFornecedor] = useState<Fornecedor | null>(null)
  const [editContrato, setEditContrato] = useState<Contrato | null>(null)
  const [busca, setBusca] = useState('')
  if (!dados) return null
  const q = busca.trim().toLowerCase()

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          {(
            [
              ['fornecedores', `Fornecedores`, dados.fornecedores.length],
              ['contratos', 'Contratos básicos', dados.contratos.length],
              ['historico', 'Histórico de alterações', dados.auditoria.length],
            ] as const
          ).map(([id, nome, qtd]) => (
            <button key={id} className="chip" type="button" aria-pressed={aba === id} onClick={() => setAba(id)}>
              {nome}
              <span className="n">{qtd}</span>
            </button>
          ))}
        </div>
      </div>

      {aba === 'fornecedores' && (
        <>
          {editFornecedor && <FormFornecedor key={editFornecedor.id || 'novo'} inicial={editFornecedor} fechar={() => setEditFornecedor(null)} />}
          <div className="panel compact">
            <div className="toolbar">
              <input type="search" placeholder="Buscar nome, CNPJ, código SAP" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <span className="spacer" />
              <button className="btn primary" type="button" onClick={() => setEditFornecedor({ ...FORNECEDOR_VAZIO })}>
                Novo fornecedor
              </button>
            </div>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Razão social</th>
                    <th>CNPJ</th>
                    <th>Código SAP</th>
                    <th>Tipo</th>
                    <th>C. custo</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.fornecedores
                    .filter((f) => !q || [f.nome, f.razaoSocial, f.cnpj, f.codigoSap].join(' ').toLowerCase().includes(q))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((f) => (
                      <tr key={f.id} onClick={() => setEditFornecedor(f)}>
                        <td>{f.nome}</td>
                        <td>{f.razaoSocial}</td>
                        <td className="mono">{f.cnpj}</td>
                        <td className="mono">{f.codigoSap}</td>
                        <td>{f.tipo}</td>
                        <td className="mono">{f.centroCusto}</td>
                        <td>{f.ativo ? <span className="pill s-paga">Ativo</span> : <span className="pill">Inativo</span>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="hint">Clique num fornecedor para editar.</p>
          </div>
        </>
      )}

      {aba === 'contratos' && (
        <>
          {editContrato && <FormContrato key={editContrato.id || 'novo'} inicial={editContrato} fechar={() => setEditContrato(null)} />}
          <div className="panel compact">
            <div className="toolbar">
              <span className="spacer" />
              <button
                className="btn primary"
                type="button"
                onClick={() => setEditContrato({ id: '', numero: '', fornecedorId: '', valor: 0, ativo: true })}
              >
                Novo contrato
              </button>
            </div>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Contrato</th>
                    <th>Fornecedor</th>
                    <th className="num">Valor</th>
                    <th className="num">Consumido</th>
                    <th className="num">Saldo</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.contratos.map((c) => {
                    const usado = dados.notas.filter((n) => n.contrato === c.numero).reduce((s, n) => s + n.valor, 0)
                    const saldo = c.valor - usado
                    return (
                      <tr key={c.id} onClick={() => setEditContrato(c)}>
                        <td className="mono">{c.numero}</td>
                        <td>{fornecedor(c.fornecedorId)?.nome ?? '—'}</td>
                        <td className="num mono">{brl(c.valor)}</td>
                        <td className="num mono">{brl(usado)}</td>
                        <td className={`num mono ${saldo < 0 ? 'crit' : ''}`}>{brl(saldo)}</td>
                        <td>{c.ativo ? <span className="pill s-paga">Ativo</span> : <span className="pill">Encerrado</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="hint">O consumo soma as NFs que têm este número de contrato. Clique num contrato para editar.</p>
          </div>
        </>
      )}

      {aba === 'historico' && (
        <div className="panel">
          {dados.auditoria.length === 0 ? (
            <p className="empty">Nenhuma alteração de cadastro ou exclusão de nota ainda.</p>
          ) : (
            <ul className="alteracoes">
              {[...dados.auditoria].reverse().map((a, i) => (
                <li key={i}>
                  {a.descricao}
                  <small>
                    {dataHora(a.em)} · {a.por}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
