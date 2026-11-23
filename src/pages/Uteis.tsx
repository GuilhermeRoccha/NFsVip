// Aba Úteis: consulta rápida de cada ambiente (centros de custo, códigos,
// fornecedores, orientações), no lugar da aba "Úteis" da planilha.
// Cada código tem botão de copiar; as orientações abrem e fecham como perguntas. Quem pode, adiciona e edita as linhas.

import { useState, type FormEvent } from 'react'
import { podeEditarUteis } from '../domain/acesso'
import { paraBusca, SECOES, type DefSecao } from '../domain/uteis'
import type { Ambiente, Fornecedor, Util } from '../domain/tipos'
import { brl } from '../lib/formato'
import { mensagemDeErro, useApp } from '../estado'

/** Código com botão de copiar à vista. Depois de copiar, fica verde por um instante com "copiado". */
function Copiavel({ texto, mono = true }: { texto: string; mono?: boolean }) {
  const { avisar } = useApp()
  const [copiado, setCopiado] = useState(false)
  if (!texto) return <span className="muted">—</span>
  return (
    <button
      type="button"
      className={`copiavel ${mono ? 'mono' : ''} ${copiado ? 'ok' : ''}`}
      title="Copiar"
      aria-label={`Copiar ${texto}`}
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard
          .writeText(texto)
          .then(() => {
            setCopiado(true)
            setTimeout(() => setCopiado(false), 1500)
          })
          .catch(() => avisar('Não foi possível copiar'))
      }}
    >
      <span>{copiado ? 'copiado' : texto}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {copiado ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </>
        )}
      </svg>
    </button>
  )
}

function FormUtil({ secao, inicial, fechar }: { secao: DefSecao; inicial: Util; fechar(): void }) {
  const { salvarUtil, excluirUtil, avisar } = useApp()
  const [u, setU] = useState(inicial)
  const [erro, setErro] = useState('')
  const [titulo, valor, obs] = secao.colunas
  async function salvar(e: FormEvent) {
    e.preventDefault()
    try {
      await salvarUtil(u)
      avisar(inicial.id ? 'Linha atualizada' : 'Linha adicionada')
      fechar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    }
  }
  return (
    <form className="form-util" onSubmit={salvar}>
      <label>
        {titulo}
        <input value={u.titulo} autoFocus onChange={(e) => setU({ ...u, titulo: e.target.value })} />
      </label>
      <label>
        {valor}
        {secao.texto ? (
          <textarea rows={4} value={u.valor} onChange={(e) => setU({ ...u, valor: e.target.value })} />
        ) : (
          <input value={u.valor} onChange={(e) => setU({ ...u, valor: e.target.value })} />
        )}
      </label>
      {!secao.texto && (
        <label>
          {obs}
          <input value={u.obs} onChange={(e) => setU({ ...u, obs: e.target.value })} />
        </label>
      )}
      {erro && <div className="notice err">{erro}</div>}
      <div className="acoes">
        <button className="btn primary" type="submit">
          Salvar
        </button>
        <button className="btn ghost" type="button" onClick={fechar}>
          Cancelar
        </button>
        {inicial.id && (
          <button
            className="btn perigo"
            type="button"
            onClick={() =>
              excluirUtil(inicial.id)
                .then(() => {
                  avisar('Linha excluída')
                  fechar()
                })
                .catch((e) => setErro(mensagemDeErro(e)))
            }
          >
            Excluir
          </button>
        )}
      </div>
    </form>
  )
}

function Secao({ secao, linhas, ambiente, editavel }: { secao: DefSecao; linhas: Util[]; ambiente: Ambiente; editavel: boolean }) {
  const [editando, setEditando] = useState<Util | null>(null)
  const [titulo, valor, obs] = secao.colunas
  return (
    <section className={`panel compact ${secao.texto ? 'wide' : ''}`}>
      <header>
        <h2>{secao.nome}</h2>
        {editavel && !editando && (
          <button
            className="btn ghost"
            type="button"
            onClick={() => setEditando({ id: '', ambiente, secao: secao.id, titulo: '', valor: '', obs: '' })}
          >
            Adicionar
          </button>
        )}
      </header>
      {editando && <FormUtil key={editando.id || 'nova'} secao={secao} inicial={editando} fechar={() => setEditando(null)} />}
      {linhas.length === 0 ? (
        <p className="muted">Nada aqui ainda.</p>
      ) : secao.texto ? (
        <div className="perguntas">
          {linhas.map((l) => (
            <details key={l.id} open={linhas.length === 1 || undefined}>
              <summary>{l.titulo}</summary>
              <p>{l.valor}</p>
              {editavel && (
                <button className="link small" type="button" onClick={() => setEditando(l)}>
                  Editar
                </button>
              )}
            </details>
          ))}
        </div>
      ) : (
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>{titulo}</th>
                <th>{valor}</th>
                <th>{obs}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} onClick={() => editavel && setEditando(l)} className={editavel ? '' : 'fixa'}>
                  <td>{l.titulo}</td>
                  <td>
                    <Copiavel texto={l.valor} />
                  </td>
                  <td className="muted">{l.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Uteis({ ambiente }: { ambiente: Ambiente }) {
  const { dados, perfil } = useApp()
  const [busca, setBusca] = useState('')
  if (!dados) return null
  const editavel = podeEditarUteis(perfil, ambiente)
  const q = paraBusca(busca.trim())
  const bate = (...t: string[]) => !q || paraBusca(t.join(' ')).includes(q)

  // Fornecedores de cada ambiente: os que têm notas, contratos ou requisições nele, e os ainda sem uso.
  const usoVip = new Set([...dados.notas.filter((n) => n.origem === 'vip').map((n) => n.fornecedorId), ...dados.contratos.map((c) => c.fornecedorId)])
  const usoComercial = new Set(dados.requisicoes.map((r) => r.fornecedorId))
  const doAmbiente = (f: Fornecedor) =>
    (ambiente === 'vip' ? usoVip : usoComercial).has(f.id) || (!usoVip.has(f.id) && !usoComercial.has(f.id))
  const fornecedores = dados.fornecedores
    .filter((f) => f.ativo && doAmbiente(f) && bate(f.nome, f.razaoSocial, f.codigoSap, f.cnpj, f.tipo, f.centroCusto))
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const contratos =
    ambiente === 'vip' ? dados.contratos.filter((c) => c.ativo && bate(c.numero, dados.fornecedores.find((f) => f.id === c.fornecedorId)?.nome ?? '')) : []

  const linhasDa = (id: string) =>
    dados.uteis.filter((u) => u.ambiente === ambiente && u.secao === id && bate(u.titulo, u.valor, u.obs))
  const totalAchado = SECOES[ambiente].reduce((t, s) => t + linhasDa(s.id).length, 0) + fornecedores.length + contratos.length

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="busca-tudo"
          placeholder="Buscar em tudo: centro de custo, código, fornecedor, orientação…"
          aria-label="Buscar em Úteis"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {q && <span className="muted small">{totalAchado === 0 ? 'Nada encontrado.' : `${totalAchado} resultado(s)`}</span>}
      </div>
      <div className="uteis">
        {SECOES[ambiente].map((s) => {
          const linhas = linhasDa(s.id)
          if (q && !linhas.length) return null
          return <Secao key={s.id} secao={s} linhas={linhas} ambiente={ambiente} editavel={editavel} />
        })}

        {(!q || fornecedores.length > 0) && (
          <section className="panel compact wide">
            <header>
              <h2>Fornecedores</h2>
              <span className="muted small">vem de Cadastros</span>
            </header>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>Código SAP</th>
                    <th>CNPJ</th>
                    <th>Tipo</th>
                    <th>C. custo padrão</th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedores.map((f) => (
                    <tr key={f.id} className="fixa">
                      <td>{f.nome}</td>
                      <td>
                        <Copiavel texto={f.codigoSap} />
                      </td>
                      <td>
                        <Copiavel texto={f.cnpj} />
                      </td>
                      <td>{f.tipo}</td>
                      <td>
                        <Copiavel texto={f.centroCusto} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {ambiente === 'vip' && (!q || contratos.length > 0) && (
          <section className="panel compact">
            <header>
              <h2>Contratos básicos</h2>
              <span className="muted small">vem de Cadastros</span>
            </header>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Contrato</th>
                    <th>Fornecedor</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map((c) => (
                    <tr key={c.id} className="fixa">
                      <td>
                        <Copiavel texto={c.numero} />
                      </td>
                      <td>{dados.fornecedores.find((f) => f.id === c.fornecedorId)?.nome}</td>
                      <td className="num mono">{brl(c.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      {editavel && <p className="hint">Clique numa linha para editar. As mudanças ficam no histórico de alterações.</p>}
    </>
  )
}
