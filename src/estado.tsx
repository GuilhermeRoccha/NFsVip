// Estado compartilhado do app: dados carregados, nível de acesso, ambiente e aba
// abertos, e avisos (toast). As telas usam o hook useApp() e chamam as ações;
// cada ação grava no armazenamento e recarrega os dados.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { armazenamento, ErroDeRegra, type Dados } from './data'
import { abasDoPerfil, ambientesDoPerfil, normalizarEmail, type Aba } from './domain/acesso'
import { calcularJanela, type Janela } from './domain/regras'
import type {
  Acesso,
  Ambiente,
  Contrato,
  Fornecedor,
  Nota,
  NovaNota,
  Perfil,
  Requisicao,
  StatusRequisicao,
  Util,
} from './domain/tipos'

/** Quem está logado. O nível vem do cadastro de Usuários. */
export type Usuario = Acesso

interface App {
  dados: Dados | null
  /** Nível de acesso de quem está logado. */
  perfil: Perfil
  ambiente: Ambiente
  trocarAmbiente(a: Ambiente): void
  aba: Aba
  trocarAba(a: Aba): void
  /** null = ninguém logado: mostra a tela de login. */
  usuario: Usuario | null
  /** Entra com o e-mail, se ele estiver em Usuários. Devolve false se não estiver. */
  entrar(email: string): boolean
  sair(): void
  agora: Date
  janela: Janela
  aviso: string | null
  avisar(msg: string): void
  fornecedor(id: string): Fornecedor | undefined
  /** Envia a nota e devolve o id criado. */
  enviarNota(n: NovaNota, arquivo: File | null): Promise<string>
  atualizarNota(id: string, campos: Partial<Nota>): Promise<void>
  avancarEtapa(id: string): Promise<void>
  excluirNota(id: string, motivo: string): Promise<void>
  salvarFornecedor(f: Fornecedor): Promise<void>
  salvarContrato(c: Contrato): Promise<void>
  /** Devolve a requisição salva (com o id, quando é nova). */
  salvarRequisicao(r: Requisicao): Promise<Requisicao>
  mudarStatusRequisicao(id: string, status: StatusRequisicao, motivo?: string): Promise<void>
  excluirRequisicao(id: string, motivo: string): Promise<void>
  salvarAcesso(a: Acesso): Promise<void>
  removerAcesso(email: string): Promise<void>
  salvarUtil(u: Util): Promise<void>
  excluirUtil(id: string): Promise<void>
  restaurarExemplo(): Promise<void>
}

const Contexto = createContext<App | null>(null)

const CHAVE_TELA = 'portal-nf-tela'

const CHAVE_SESSAO = 'portal-nf-sessao'

interface Tela {
  ambiente: Ambiente
  aba: Aba
}

function emailDaSessao(): string {
  try {
    return localStorage.getItem(CHAVE_SESSAO) ?? ''
  } catch {
    return ''
  }
}

function gravarSessao(email: string) {
  try {
    if (email) localStorage.setItem(CHAVE_SESSAO, email)
    else localStorage.removeItem(CHAVE_SESSAO)
  } catch {
    // ignora
  }
}

function lerTela(): Partial<Tela> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_TELA) ?? '{}') as Partial<Tela>
  } catch {
    return {}
  }
}

function gravarTela(t: Tela) {
  try {
    localStorage.setItem(CHAVE_TELA, JSON.stringify(t))
  } catch {
    // ignora
  }
}

/** Ajusta ambiente e aba ao que o nível de acesso permite. */
function telaValida(perfil: Perfil, ambiente?: Ambiente, aba?: Aba): Tela {
  const ambientes = ambientesDoPerfil(perfil)
  const amb = ambiente && ambientes.includes(ambiente) ? ambiente : ambientes[0]
  const abas = abasDoPerfil(perfil, amb).map((a) => a.id)
  return { ambiente: amb, aba: aba && abas.includes(aba) ? aba : abas[0] }
}

/** Converte erros de regra em mensagem para a tela; outros erros sobem. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroDeRegra) return e.message
  console.error(e)
  return 'Algo deu errado. Tente de novo.'
}

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [email, setEmail] = useState(emailDaSessao)
  // O nível é lido do cadastro a cada vez: se o admin mudar ou tirar o acesso, vale na hora.
  const usuario = useMemo(() => dados?.acessos.find((a) => a.email === email) ?? null, [dados, email])
  const perfil: Perfil = usuario?.perfil ?? 'vip'
  const [telaEscolhida, setTela] = useState<Partial<Tela>>(lerTela)
  const { ambiente, aba } = telaValida(perfil, telaEscolhida.ambiente, telaEscolhida.aba)
  const mudarTela = useCallback((t: Partial<Tela>) => {
    setTela((antes) => {
      const nova = { ...antes, ...t }
      gravarTela(nova as Tela)
      return nova
    })
  }, [])
  const [aviso, setAviso] = useState<string | null>(null)
  const [agora] = useState(() => new Date())
  const janela = useMemo(() => calcularJanela(agora), [agora])

  const recarregar = useCallback(async () => {
    try {
      setDados(await armazenamento.carregar())
    } catch (e) {
      console.error(e)
      setAviso('Não foi possível carregar os dados. Verifique a conexão e recarregue a página.')
    }
  }, [])
  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2600)
    return () => clearTimeout(t)
  }, [aviso])

  const quem = usuario?.nome ?? '—'

  const valor = useMemo<App>(
    () => ({
      dados,
      perfil,
      ambiente,
      trocarAmbiente: (a) => mudarTela({ ambiente: a, aba: undefined }),
      aba,
      trocarAba: (a) => mudarTela({ ambiente, aba: a }),
      usuario,
      entrar(e) {
        const achou = dados?.acessos.find((a) => a.email === normalizarEmail(e))
        if (!achou) return false
        gravarSessao(achou.email)
        setEmail(achou.email)
        return true
      },
      sair() {
        gravarSessao('')
        setEmail('')
        // A próxima pessoa começa na tela inicial do nível dela.
        mudarTela({ ambiente: undefined, aba: undefined })
      },
      agora,
      janela,
      aviso,
      avisar: setAviso,
      fornecedor: (id) => dados?.fornecedores.find((f) => f.id === id),
      async enviarNota(n, arquivo) {
        const nota = await armazenamento.enviarNota(n, arquivo, quem)
        await recarregar()
        return nota.id
      },
      async atualizarNota(id, campos) {
        await armazenamento.atualizarNota(id, campos, quem)
        await recarregar()
      },
      async avancarEtapa(id) {
        await armazenamento.avancarEtapa(id, quem)
        await recarregar()
      },
      async excluirNota(id, motivo) {
        await armazenamento.excluirNota(id, motivo, quem)
        await recarregar()
      },
      async salvarFornecedor(f) {
        await armazenamento.salvarFornecedor(f, quem)
        await recarregar()
      },
      async salvarContrato(c) {
        await armazenamento.salvarContrato(c, quem)
        await recarregar()
      },
      async salvarRequisicao(r) {
        const salva = await armazenamento.salvarRequisicao(r, quem)
        await recarregar()
        return salva
      },
      async mudarStatusRequisicao(id, status, motivo) {
        await armazenamento.mudarStatusRequisicao(id, status, quem, motivo)
        await recarregar()
      },
      async excluirRequisicao(id, motivo) {
        await armazenamento.excluirRequisicao(id, motivo, quem)
        await recarregar()
      },
      async salvarAcesso(a) {
        await armazenamento.salvarAcesso(a, quem)
        await recarregar()
      },
      async removerAcesso(email) {
        await armazenamento.removerAcesso(email, quem)
        await recarregar()
      },
      async salvarUtil(u) {
        await armazenamento.salvarUtil(u, quem)
        await recarregar()
      },
      async excluirUtil(id) {
        await armazenamento.excluirUtil(id, quem)
        await recarregar()
      },
      async restaurarExemplo() {
        await armazenamento.restaurarExemplo?.()
        await recarregar()
      },
    }),
    [dados, perfil, ambiente, aba, mudarTela, usuario, agora, janela, aviso, quem, recarregar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useApp(): App {
  const c = useContext(Contexto)
  if (!c) throw new Error('useApp precisa estar dentro de <ProvedorApp>')
  return c
}
