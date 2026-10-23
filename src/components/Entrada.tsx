// Porta de entrada do portal.
// Modo demonstração: entra direto, escolhendo o perfil no topo.
// Com Supabase: pede o e-mail, manda um link de acesso e só deixa entrar quem tem perfil liberado.

import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../data'
import type { Perfil } from '../domain/tipos'
import { ProvedorApp, type Usuario } from '../estado'

type Estado =
  | { fase: 'carregando' }
  | { fase: 'fora' }
  | { fase: 'sem-perfil'; email: string }
  | { fase: 'dentro'; usuario: Usuario }

export function Entrada({ children }: { children: ReactNode }) {
  if (!supabase) return <ProvedorApp>{children}</ProvedorApp>
  return <ComLogin>{children}</ComLogin>
}

function ComLogin({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })

  useEffect(() => {
    const db = supabase!
    async function aplicar(sessao: Session | null) {
      if (!sessao) return setEstado({ fase: 'fora' })
      const { data } = await db.from('perfis').select('nome, perfil').eq('usuario_id', sessao.user.id).maybeSingle()
      if (!data) return setEstado({ fase: 'sem-perfil', email: sessao.user.email ?? '' })
      setEstado({ fase: 'dentro', usuario: { nome: data.nome as string, perfil: data.perfil as Perfil } })
    }
    // O Supabase avisa quando a pessoa entra (inclusive ao voltar pelo link do e-mail) ou sai.
    const { data } = db.auth.onAuthStateChange((_evento, sessao) => {
      // Fora do callback, como o Supabase recomenda, para não travar a sessão.
      setTimeout(() => void aplicar(sessao), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (estado.fase === 'carregando') return <p className="empty">Carregando…</p>
  if (estado.fase === 'fora') return <TelaLogin />
  if (estado.fase === 'sem-perfil')
    return (
      <Cartao titulo="Acesso ainda não liberado">
        <p className="sub">
          Você entrou como <b>{estado.email}</b>, mas ainda não tem um perfil no portal. Peça ao Comercial para liberar o
          seu acesso.
        </p>
        <button className="btn" type="button" onClick={() => void supabase!.auth.signOut()}>
          Sair
        </button>
      </Cartao>
    )
  return (
    <ProvedorApp key={estado.usuario.nome} usuario={estado.usuario}>
      {children}
    </ProvedorApp>
  )
}

function TelaLogin() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      // Só entra quem já foi convidado; ninguém cria conta sozinho.
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setEnviando(false)
    if (error) setErro('Não foi possível enviar o link. Confira o e-mail ou peça acesso ao Comercial.')
    else setEnviado(true)
  }

  return (
    <Cartao titulo="Portal NF · Sala VIP">
      {enviado ? (
        <p className="sub">
          Enviamos um link de acesso para <b>{email}</b>. Abra o e-mail neste computador e clique no link para entrar.
        </p>
      ) : (
        <form onSubmit={entrar} className="login-form">
          <p className="sub">Entre com o seu e-mail. Você recebe um link de acesso, sem senha.</p>
          <label>
            E-mail
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {erro && <div className="notice err">{erro}</div>}
          <button className="btn primary" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Receber link de acesso'}
          </button>
        </form>
      )}
    </Cartao>
  )
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="login">
      <section className="panel">
        <h1>{titulo}</h1>
        {children}
      </section>
    </main>
  )
}
