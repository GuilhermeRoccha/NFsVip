// Estado compartilhado do app: dados carregados, perfil escolhido e avisos (toast).
// As telas usam o hook useApp() e chamam as ações; cada ação grava no
// armazenamento e recarrega os dados.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { armazenamento, ErroDeRegra, type Dados } from './data'
import { calcularJanela, type Janela } from './domain/regras'
import type { Contrato, Fornecedor, Nota, NovaNota, Perfil } from './domain/tipos'

const NOME_DO_PERFIL: Record<Perfil, string> = { vip: 'Sala VIP', comercial: 'Comercial', gestao: 'Gestão' }

interface App {
  dados: Dados | null
  perfil: Perfil
  trocarPerfil(p: Perfil): void
  agora: Date
  janela: Janela
  aviso: string | null
  avisar(msg: string): void
  fornecedor(id: string): Fornecedor | undefined
  enviarNota(n: NovaNota, arquivo: File | null): Promise<void>
  atualizarNota(id: string, campos: Partial<Nota>): Promise<void>
  avancarEtapa(id: string): Promise<void>
  salvarFornecedor(f: Fornecedor): Promise<void>
  salvarContrato(c: Contrato): Promise<void>
  restaurarExemplo(): Promise<void>
}

const Contexto = createContext<App | null>(null)

const CHAVE_PERFIL = 'portal-nf-perfil'

function perfilSalvo(): Perfil {
  try {
    const p = localStorage.getItem(CHAVE_PERFIL)
    if (p === 'vip' || p === 'comercial' || p === 'gestao') return p
  } catch {
    // ignora
  }
  return 'comercial'
}

/** Converte erros de regra em mensagem para a tela; outros erros sobem. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroDeRegra) return e.message
  console.error(e)
  return 'Algo deu errado. Tente de novo.'
}

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [perfil, setPerfil] = useState<Perfil>(perfilSalvo)
  const [aviso, setAviso] = useState<string | null>(null)
  const [agora] = useState(() => new Date())
  const janela = useMemo(() => calcularJanela(agora), [agora])

  const recarregar = useCallback(async () => setDados(await armazenamento.carregar()), [])
  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2600)
    return () => clearTimeout(t)
  }, [aviso])

  const quem = NOME_DO_PERFIL[perfil]

  const valor = useMemo<App>(
    () => ({
      dados,
      perfil,
      trocarPerfil(p) {
        setPerfil(p)
        try {
          localStorage.setItem(CHAVE_PERFIL, p)
        } catch {
          // ignora
        }
      },
      agora,
      janela,
      aviso,
      avisar: setAviso,
      fornecedor: (id) => dados?.fornecedores.find((f) => f.id === id),
      async enviarNota(n, arquivo) {
        await armazenamento.enviarNota(n, arquivo, quem)
        await recarregar()
      },
      async atualizarNota(id, campos) {
        await armazenamento.atualizarNota(id, campos, quem)
        await recarregar()
      },
      async avancarEtapa(id) {
        await armazenamento.avancarEtapa(id, quem)
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
      async restaurarExemplo() {
        await armazenamento.restaurarExemplo?.()
        await recarregar()
      },
    }),
    [dados, perfil, agora, janela, aviso, quem, recarregar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useApp(): App {
  const c = useContext(Contexto)
  if (!c) throw new Error('useApp precisa estar dentro de <ProvedorApp>')
  return c
}
